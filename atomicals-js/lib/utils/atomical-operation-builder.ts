import { ElectrumApiInterface } from "../api/electrum-api.interface";
import { KeyPairInfo, getKeypairInfo } from "./address-keypair-path";
import { BitworkInfo, hasValidBitwork, isAtomicalId, isValidBitworkString, isValidContainerName, isValidRealmName, isValidSubRealmName, isValidTickerName } from "./atomical-format-helpers";
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory, ECPairAPI, TinySecp256k1Interface } from 'ecpair';
const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
const bitcoin = require('bitcoinjs-lib');
import * as chalk from 'chalk';
bitcoin.initEccLib(ecc);
import {
    initEccLib,
    networks,
    Psbt,
} from "bitcoinjs-lib";
initEccLib(tinysecp as any);
import { AtomicalsPayload, calculateFundsRequired, getAndCheckAtomicalInfo, prepareCommitRevealConfig, prepareFilesDataAsObject } from "../commands/command-helpers";
import { getFundingUtxo } from "./select-funding-utxo";
import { sleeper } from "./utils";
import { witnessStackToScriptWitness } from "../commands/witness_stack_to_script_witness";
import { IInputUtxoPartial } from "../types/UTXO.interface";
import { IWalletRecord } from "./validate-wallet-storage";
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
const DEFAULT_SATS_BYTE = 10;
const DEFAULT_SATS_ATOMICAL_UTXO = 1000;
const SEND_RETRY_SLEEP_SECONDS = 10;
const SEND_RETRY_ATTEMPTS = 10;
const DUST_AMOUNT = 546;
const BASE_BYTES = 10;
const INPUT_BYTES_BASE = 148;
const OUTPUT_BYTES_BASE = 34;
const OP_RETURN_BYTES: number = 20;
const EXCESSIVE_FEE_LIMIT: number = 500000; // Limit to 1/200 of a BTC for now

export enum REALM_CLAIM_TYPE {
    DIRECT = 'direct',
    RULE = 'rule'
}

export interface ParentInputAtomical {
    parentId: string;
    parentUtxoPartial: IInputUtxoPartial;
    parentKeyInfo: KeyPairInfo;
}

export interface FeeCalculations {
    commitAndRevealFeePlusOutputs: number;
    commitAndRevealFee: number;
    revealFeePlusOutputs: number;
    commitFeeOnly: number;
    revealFeeOnly: number
}

function logMiningProgressToConsole(dowork: boolean, disableMiningChalk, txid, nonces) {
    if (!dowork) {
        return;
    }
    if (disableMiningChalk) {
        if (nonces % 10000 === 0) {
            console.log('Generated nonces: ', nonces, ', time: ', Math.floor(Date.now() / 1000));
        }
        return;
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(chalk.red(txid, ' nonces: ', nonces));
}
function printBitworkLog(bitworkInfo: BitworkInfo, commit?: boolean) {
    if (!bitworkInfo) {
        return;
    }
    console.log(`\nAtomicals Bitwork Mining - Requested bitwork proof-of-work mining for the ${commit ? 'commit' : 'reveal'} transaction.`);
    if (commit) {
        console.log(`bitworkc (input): ${bitworkInfo.input_bitwork}`);
        console.log(`bitworkc (decoded): ${bitworkInfo.hex_bitwork}`);
    } else {
        console.log(`bitworkr (input): ${bitworkInfo.input_bitwork}`);
        console.log(`bitworkr (decoded): ${bitworkInfo.hex_bitwork}`);
    }
    console.log(`---------\nWARNING: This might take a very long time depending on the speed of the CPU.`);
    console.log(`Time to mine estimates: `);
    console.log(`- prefix length <= 4: about a minute or two. ~65,536 hashes on average.`);
    console.log(`- prefix length 5: several minutes. ~1,048,576 hashes on average.`);
    console.log(`- prefix length 6: up to an hour or more. ~16,777,216 hashes on average.`);
    console.log(`- prefix length >= 7: a few hours or much longer. >268,435,456 hashes on average.`);
    console.log(`\nStarting mining now...\n`);
}
export enum REQUEST_NAME_TYPE {
    NONE = 'NONE',
    CONTAINER = 'CONTAINER',
    TICKER = 'TICKER',
    REALM = 'REALM',
    SUBREALM = 'SUBREALM'
}

export interface AtomicalOperationBuilderOptions {
    electrumApi: ElectrumApiInterface;
    satsbyte?: number; // satoshis                    
    address: string;
    opType: 'nft' | 'ft' | 'dft' | 'dmt' | 'dat' | 'mod' | 'evt' | 'sl' | 'x' | 'y'
    requestContainerMembership?: string;
    bitworkc?: string;
    bitworkr?: string;
    disableMiningChalk?: boolean;
    meta?: string[] | any;
    init?: string[] | any;
    ctx?: string[] | any;
    nftOptions?: {
        satsoutput: number;
    };
    datOptions?: {
        satsoutput: number;
    };
    ftOptions?: {
        fixedSupply: number;
        ticker: string;
    }
    dftOptions?: {
        maxMints: number;
        mintAmount: number;
        mintHeight: number;
        ticker: string;
        mintBitworkr?: string;
    },
    dmtOptions?: {
        mintAmount: number;
        ticker: string;
    },
    skipOptions?: {
    },
    splatOptions?: {
        satsoutput: number;
    }
}

export class AtomicalOperationBuilder {
    private userDefinedData: AtomicalsPayload | null = null;
    private containerMembership: string | null = null;
    private bitworkInfoCommit: BitworkInfo | null = null;
    private bitworkInfoReveal: BitworkInfo | null = null;
    private requestName: string | null = null;
    private requestSubrealmPid: string | null = null;
    private requestNameType: REQUEST_NAME_TYPE = REQUEST_NAME_TYPE.NONE;
    private meta: any = {};
    private args: any = {};
    private init: any = {};
    private ctx: any = {};
    private parentInputAtomical: ParentInputAtomical | null = null;
    private inputUtxos: Array<{
        utxo: IInputUtxoPartial,
        keypairInfo: KeyPairInfo
    }> = [];
    private additionalOutputs: Array<{
        address: string,
        value: number
    }> = [];
    constructor(private options: AtomicalOperationBuilderOptions) {
        if (!this.options) {
            throw new Error('Options required');
        }
        if (!this.options.electrumApi) {
            throw new Error('electrumApi required');
        }
        if (!this.options.satsbyte) {
            this.options.satsbyte = DEFAULT_SATS_BYTE;
        }
        if (this.options.opType === 'nft') {
            if (!this.options.nftOptions) {
                throw new Error('nftOptions required for nft type')
            }
        }
        if (this.options.opType === 'ft') {
            if (!this.options.ftOptions) {
                throw new Error('ftOptions required for ft type')
            }
        }
        if (this.options.opType === 'dft') {
            if (!this.options.dftOptions) {
                throw new Error('dftOptions required for dft type')
            }
        }
        if (this.options.opType === 'dmt') {
            if (!this.options.dmtOptions) {
                throw new Error('dmtOptions required for dmt type')
            }
        }
    }

    setRequestContainer(name: string) {
        if (this.options.opType !== 'nft') {
            throw new Error('setRequestContainer can only be set for NFT types')
        }
        const trimmed = name.startsWith('#') ? name.substring(1) : name;
        isValidContainerName(name)
        this.requestName = trimmed;
        this.requestNameType = REQUEST_NAME_TYPE.CONTAINER;
        this.requestSubrealmPid = null;
    }

    setRequestRealm(name: string) {
        if (this.options.opType !== 'nft') {
            throw new Error('setRequestRealm can only be set for NFT types')
        }
        const trimmed = name.startsWith('+') ? name.substring(1) : name;
        isValidRealmName(name)
        this.requestName = trimmed;
        this.requestNameType = REQUEST_NAME_TYPE.REALM;
        this.requestSubrealmPid = null;
    }

    setRequestSubrealm(name: string, parentRealmId: string, realmClaimType: REALM_CLAIM_TYPE) {
        if (this.options.opType !== 'nft') {
            throw new Error('setRequestSubrealm can only be set for NFT types')
        }
        if (!isAtomicalId(parentRealmId)) {
            throw new Error('Invalid parent realm atomical id for subrealm');
        }
        if (name.indexOf('.') === -1) {
            throw new Error('Cannot request subrealm for a top level realm');
        }
        const trimmed = name.startsWith('+') ? name.substring(1) : name;
        const splitNames = trimmed.split('.')
        const subrealmFinalPart = splitNames[splitNames.length - 1];
        isValidSubRealmName(subrealmFinalPart)
        this.requestName = subrealmFinalPart;
        this.requestSubrealmPid = parentRealmId;
        this.requestNameType = REQUEST_NAME_TYPE.SUBREALM;

        if (realmClaimType === REALM_CLAIM_TYPE.DIRECT) {
            this.setArgs({
                'claim_type': 'direct'
            });
        } else if (realmClaimType === REALM_CLAIM_TYPE.RULE) {
            this.setArgs({
                'claim_type': 'rule'
            });
        } else {
            throw new Error('RealmClaimType must be DIRECT or RULE')
        }
        console.log('this.requestName', this.requestName);
    }

    setRequestTicker(name: string) {
        if (this.options.opType !== 'dft' && this.options.opType !== 'ft') {
            throw new Error('setRequestTicker can only be set for dft or ft types')
        }
        const trimmed = name.startsWith('$') ? name.substring(1) : name;
        isValidTickerName(trimmed);
        this.requestName = trimmed;
        this.requestNameType = REQUEST_NAME_TYPE.TICKER;
        this.requestSubrealmPid = null;
    }

    /**
     * For each array element do:
     * 
     * - determine if it's a file, or a file with an alias, or a scalar/json object type
     * 
     * @param fieldTypeHints The type hint string array
     */
    static async getDataObjectFromStringTypeHints(fieldTypeHints: string[]) {
        return prepareFilesDataAsObject(fieldTypeHints);
    }

    setData(data: any, log = false) {
        if (!data) {
            return;
        }
        if (typeof data !== 'object') {
            throw new Error('Data must be an object');
        }
        if (data['args']) {
            throw new Error(`Data cannot have field named 'args' set manually. Use setArgs method.`);
        }
        if (data['meta']) {
            throw new Error(`Data cannot have field named 'meta' set manually. Use options config.`);
        }
        if (data['ctx']) {
            throw new Error(`Data cannot have field named 'ctx' set manually. Use options config.`);
        }
        if (data['init']) {
            throw new Error(`Data cannot have field named 'init' set manually. Use options config.`);
        }
        this.userDefinedData = data;
        if (log) {
            console.log('setData', this.userDefinedData);
        }
    }

    getData(): any | null {
        return this.userDefinedData;
    }

    setArgs(args: any) {
        this.args = args;
    }

    getArgs(): any {
        return this.args;
    }

    private setInit(init: any) {
        this.init = init;
    }

    getInit(): any {
        return this.init;
    }

    private setMeta(meta: any) {
        this.meta = meta;
    }

    getMeta(): any {
        return this.meta;
    }

    private setCtx(ctx: any) {
        this.ctx = ctx;
    }

    getCtx(): any {
        return this.ctx;
    }

    setContainerMembership(containerName: string | null | undefined) {
        if (!containerName) {
            throw new Error('Empty container name');
        }
        const trimmedContainerName = containerName.startsWith('#') ? containerName.substring(1) : containerName;
        if (!isValidContainerName(trimmedContainerName)) {
            return;
        }
        this.containerMembership = trimmedContainerName;
    }

    setBitworkCommit(bitworkString: string | undefined) {
        if (!bitworkString) {
            return;
        }
        this.bitworkInfoCommit = isValidBitworkString(bitworkString);

    }
    setBitworkReveal(bitworkString: string | undefined) {
        if (!bitworkString) {
            return;
        }
        this.bitworkInfoReveal = isValidBitworkString(bitworkString);
    }

    /**
     * 
     * @param utxoPartial The UTXO to spend in the constructed tx
     * @param wif The signing WIF key for the utxo
     */
    addInputUtxo(utxoPartial: IInputUtxoPartial, wif: string) {
        const keypairInput = ECPair.fromWIF(wif);
        const keypairInputInfo = getKeypairInfo(keypairInput)
        this.inputUtxos.push({
            utxo: utxoPartial,
            keypairInfo: keypairInputInfo,
        });
    }

    /**
     * Set an input parent for linking with $parent reference of the operation to an input spend
     */
    setInputParent(input: ParentInputAtomical) {
        // Validate the parentId is an atomical id in compact form
        if (!isAtomicalId(input.parentId)) {
            throw new Error('Invalid parent atomical id: ' + input.parentId)
        }
        this.parentInputAtomical = input;
    }

    private getInputParent(): ParentInputAtomical | null {
        if (!this.parentInputAtomical) {
            return null;
        }
        return this.parentInputAtomical;
    }

    /**
     * Additional output to add, to be used with addInputUtxo normally
     * @param output Output to add
     */
    addOutput(output: { address: string, value: number }) {
        this.additionalOutputs.push(output);
    }

    isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    async start(fundingWIF: string): Promise<any> {
        const fundingKeypairRaw = ECPair.fromWIF(fundingWIF);
        const fundingKeypair = getKeypairInfo(fundingKeypairRaw);
        let performBitworkForRevealTx = !!this.bitworkInfoReveal;
        let performBitworkForCommitTx = !!this.bitworkInfoCommit;
        let scriptP2TR: any = null;
        let hashLockP2TR: any = null;

        if (this.options.meta) {
            this.setMeta(await AtomicalOperationBuilder.getDataObjectFromStringTypeHints(this.options.meta));
        }
        if (this.options.init) {
            this.setInit(await AtomicalOperationBuilder.getDataObjectFromStringTypeHints(this.options.init));
        }
        if (this.options.ctx) {
            this.setCtx(await AtomicalOperationBuilder.getDataObjectFromStringTypeHints(this.options.ctx));
        }

        let copiedData = Object.assign({}, this.userDefinedData);//

        if (!this.isEmpty(this.getArgs())) {
            copiedData['args'] = this.getArgs()
        }

        if (!this.isEmpty(this.getCtx())) {
            copiedData['ctx'] = this.getCtx()
        }

        if (!this.isEmpty(this.getMeta())) {
            copiedData['meta'] = this.getMeta()
        }

        if (!this.isEmpty(this.getInit())) {
            copiedData['init'] = this.getInit()
        }

        // If it's a container membership request, add it in
        if (this.containerMembership) {
            copiedData['in'] = `["#${this.containerMembership}"]`;
        }

        switch (this.requestNameType) {
            case REQUEST_NAME_TYPE.TICKER:
                copiedData['args'] = copiedData['args'] || {};
                copiedData['args']['request_ticker'] = this.requestName;
                break;
            case REQUEST_NAME_TYPE.REALM:
                copiedData['args'] = copiedData['args'] || {};
                copiedData['args']['request_realm'] = this.requestName;
                break;
            case REQUEST_NAME_TYPE.SUBREALM:
                copiedData['args'] = copiedData['args'] || {};
                copiedData['args']['request_subrealm'] = this.requestName;
                copiedData['args']['parent_realm'] = this.requestSubrealmPid;
                break;
            case REQUEST_NAME_TYPE.CONTAINER:
                copiedData['args'] = copiedData['args'] || {};
                copiedData['args']['request_container'] = this.requestName;
            default:
                break;
        }

        if (performBitworkForCommitTx) {
            copiedData['args'] = copiedData['args'] || {};
            copiedData['args']['bitworkc'] = this.bitworkInfoCommit?.hex_bitwork;
        }

        if (performBitworkForRevealTx) {
            copiedData['args'] = copiedData['args'] || {};
            copiedData['args']['bitworkr'] = this.bitworkInfoReveal?.hex_bitwork
        }

        if (this.options.opType === 'dmt') {
            copiedData['args'] = copiedData['args'] || {};
            copiedData['args']['mint_ticker'] = this.options.dmtOptions?.ticker;
        }

        let parentAtomicalInfo: ParentInputAtomical | null | any = this.getInputParent();
        if (parentAtomicalInfo) {
            copiedData['args'] = copiedData['args'] || {};
            copiedData['args']['parents'] = { [parentAtomicalInfo.parentId]: 0 }; // Also supports one parent for now
        }
        //parentAtomicalInfo = null;
        console.log('Payload Encoded: ', copiedData);

        let unixtime = Math.floor(Date.now() / 1000);
        let nonce = Math.floor(Math.random() * 10000000);
        let noncesGenerated = 0;
        let atomicalId: string | null = null;
        let commitTxid: string | null = null;
        let revealTxid: string | null = null;
        let commitMinedWithBitwork = false;
        const mockAtomPayload = new AtomicalsPayload(copiedData);
        const mockBaseCommitForFeeCalculation: { scriptP2TR, hashLockP2TR } = prepareCommitRevealConfig(this.options.opType, fundingKeypair, mockAtomPayload)
        const fees: FeeCalculations = this.calculateFeesRequiredForAccumulatedCommitAndReveal(mockBaseCommitForFeeCalculation.hashLockP2TR.redeem.output.length);
        ////////////////////////////////////////////////////////////////////////
        // Begin Reveal Transaction
        ////////////////////////////////////////////////////////////////////////
        if (performBitworkForCommitTx) {
            copiedData['args'] = copiedData['args'] || {};
            copiedData['args']['nonce'] = 9999999; // placeholder for only estimating tx deposit fee size
            copiedData['args']['time'] = unixtime; // placeholder for only estimating tx deposit fee size
            const fundingUtxo = await getFundingUtxo(this.options.electrumApi, fundingKeypair.address, fees.commitAndRevealFeePlusOutputs)
            printBitworkLog(this.bitworkInfoCommit as any, true);
            this.options.electrumApi.close();
            do {
                copiedData['args']['nonce'] = nonce;
                if (noncesGenerated % 5000 == 0) {
                    unixtime = Math.floor(Date.now() / 1000)
                    copiedData['args']['time'] = unixtime;
                    nonce = Math.floor(Math.random() * 10000000);
                } else {
                    nonce++;
                }
                const atomPayload = new AtomicalsPayload(copiedData);
                const updatedBaseCommit: { scriptP2TR, hashLockP2TR, hashscript } = prepareCommitRevealConfig(this.options.opType, fundingKeypair, atomPayload)

                let psbtStart = new Psbt({ network: networks.bitcoin });
                psbtStart.setVersion(1);
                psbtStart.addInput({
                    hash: fundingUtxo.txid,
                    index: fundingUtxo.index,
                    witnessUtxo: { value: fundingUtxo.value, script: Buffer.from(fundingKeypair.output, 'hex') },
                    tapInternalKey: fundingKeypair.childNodeXOnlyPubkey,
                });

                psbtStart.addOutput({
                    address: updatedBaseCommit.scriptP2TR.address,
                    value: fees.revealFeePlusOutputs
                });

                this.addCommitChangeOutputIfRequired(fundingUtxo.value, fees, psbtStart, updatedBaseCommit.hashscript.length, fundingKeypair.address);

                psbtStart.signInput(0, fundingKeypair.tweakedChildNode);
                psbtStart.finalizeAllInputs()
                let prelimTx = psbtStart.extractTransaction();
                const checkTxid = prelimTx.getId();

                logMiningProgressToConsole(performBitworkForCommitTx, this.options.disableMiningChalk, checkTxid, noncesGenerated);
                // add a `true ||` at the front to test invalid minting
                // console.log('this.bitworkInfoCommit?.prefix', this.bitworkInfoCommit)
                if (performBitworkForCommitTx && hasValidBitwork(checkTxid, this.bitworkInfoCommit?.prefix as any, this.bitworkInfoCommit?.ext as any)) {
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    process.stdout.write(chalk.green(checkTxid, ' nonces: ' + noncesGenerated));
                    console.log('\nBitwork matches commit txid! ', prelimTx.getId(), '@ time: ' + Math.floor(Date.now() / 1000))
                    // We found a solution, therefore broadcast it 
                    const interTx = psbtStart.extractTransaction();
                    const rawtx = interTx.toHex();
                    AtomicalOperationBuilder.finalSafetyCheckForExcessiveFee(psbtStart, interTx);
                    if (!(await this.broadcastWithRetries(rawtx))) {
                        console.log('Error sending', prelimTx.getId(), rawtx);
                        throw new Error('Unable to broadcast commit transaction after attempts: ' + prelimTx.getId());
                    } else {
                        console.log('Success sent tx: ', prelimTx.getId());
                    }
                    commitMinedWithBitwork = true;
                    performBitworkForCommitTx = false;
                }
                // In both scenarios we copy over the args
                if (!performBitworkForCommitTx) {
                    scriptP2TR = updatedBaseCommit.scriptP2TR
                    hashLockP2TR = updatedBaseCommit.hashLockP2TR;
                }
                noncesGenerated++;
            } while (performBitworkForCommitTx);
        }
        else {
            const baseCommit: { scriptP2TR, hashLockP2TR } = prepareCommitRevealConfig(this.options.opType, fundingKeypair, new AtomicalsPayload(copiedData))
            scriptP2TR = baseCommit.scriptP2TR;
            hashLockP2TR = baseCommit.hashLockP2TR;
        }

        ////////////////////////////////////////////////////////////////////////
        // Begin Reveal Transaction
        ////////////////////////////////////////////////////////////////////////

        // The scriptP2TR and hashLockP2TR will contain the utxo needed for the commit and now can be revealed
        const utxoOfCommitAddress = await getFundingUtxo(this.options.electrumApi, scriptP2TR.address, fees.revealFeePlusOutputs as any, commitMinedWithBitwork, 5)
        commitTxid = utxoOfCommitAddress.txid;
        atomicalId = commitTxid + 'i0'; // Atomicals are always minted at the 0'th output

        const tapLeafScript = {
            leafVersion: hashLockP2TR.redeem.redeemVersion,
            script: hashLockP2TR.redeem.output,
            controlBlock: hashLockP2TR.witness![hashLockP2TR.witness!.length - 1]
        };

        if (performBitworkForRevealTx) {
            printBitworkLog(this.bitworkInfoReveal as any);
        }
        noncesGenerated = 0;
        do {
            let nonce = Math.floor(Math.random() * 100000000);
            let unixTime = Math.floor(Date.now() / 1000)
            let psbt = new Psbt({ network: networks.bitcoin });
            psbt.setVersion(1);
            psbt.addInput({
                hash: utxoOfCommitAddress.txid,
                index: utxoOfCommitAddress.vout,
                witnessUtxo: { value: utxoOfCommitAddress.value, script: hashLockP2TR.output! },
                tapLeafScript: [
                    tapLeafScript
                ]
            });
            // Add any additional inputs that were assigned
            for (const additionalInput of this.inputUtxos) {
                psbt.addInput({
                    hash: additionalInput.utxo.hash,
                    index: additionalInput.utxo.index,
                    witnessUtxo: additionalInput.utxo.witnessUtxo,
                    tapInternalKey: additionalInput.keypairInfo.childNodeXOnlyPubkey
                });
            }

            // Note, we do not assign any outputs by default.
            // The caller must decide how many outputs to assign always
            // The reason is the caller knows the context to create them in
            // Add any additional outputs that were assigned
            for (const additionalOutput of this.additionalOutputs) {
                psbt.addOutput({
                    address: additionalOutput.address,
                    value: additionalOutput.value,
                });
            }

            if (parentAtomicalInfo) {
                psbt.addInput({
                    hash: parentAtomicalInfo.parentUtxoPartial.hash,
                    index: parentAtomicalInfo.parentUtxoPartial.index,
                    witnessUtxo: parentAtomicalInfo.parentUtxoPartial.witnessUtxo,
                    tapInternalKey: parentAtomicalInfo.parentKeyInfo.childNodeXOnlyPubkey
                });
                psbt.addOutput({
                    address: parentAtomicalInfo.parentKeyInfo.address,
                    value: parentAtomicalInfo.parentUtxoPartial.witnessUtxo.value,
                });
            }

            if (noncesGenerated % 10000 == 0) {
                unixTime = Math.floor(Date.now() / 1000)
            }
            const data = Buffer.from(unixTime + ':' + nonce, 'utf8');
            const embed = bitcoin.payments.embed({ data: [data] });

            if (performBitworkForRevealTx) {
                psbt.addOutput({
                    script: embed.output!,
                    value: 0,
                })
            }
            this.addRevealOutputIfChangeRequired(fees);

            psbt.signInput(0, fundingKeypair.childNode);
            // Sign all the additional inputs, if there were any
            let signInputIndex = 1;
            for (const additionalInput of this.inputUtxos) {
                psbt.signInput(signInputIndex, additionalInput.keypairInfo.tweakedChildNode);
                signInputIndex++;
            }
            if (parentAtomicalInfo) {
                console.log('parentAtomicalInfo', parentAtomicalInfo);
                psbt.signInput(signInputIndex, parentAtomicalInfo.parentKeyInfo.tweakedChildNode);
            }
            // We have to construct our witness script in a custom finalizer
            const customFinalizer = (_inputIndex: number, input: any) => {
                const scriptSolution = [
                    input.tapScriptSig[0].signature,
                ];
                const witness = scriptSolution
                    .concat(tapLeafScript.script)
                    .concat(tapLeafScript.controlBlock);
                return {
                    finalScriptWitness: witnessStackToScriptWitness(witness)
                }
            }
            psbt.finalizeInput(0, customFinalizer);
            // Finalize all the additional inputs, if there were any
            let finalizeInputIndex = 1
            for (; finalizeInputIndex <= this.inputUtxos.length; finalizeInputIndex++) {
                psbt.finalizeInput(finalizeInputIndex);
            }
            if (parentAtomicalInfo) {
                psbt.finalizeInput(finalizeInputIndex);
            }

            const revealTx = psbt.extractTransaction();
            const checkTxid = revealTx.getId();
            logMiningProgressToConsole(performBitworkForRevealTx, this.options.disableMiningChalk, checkTxid, noncesGenerated);
            let shouldBroadcast = !performBitworkForRevealTx;
            if (performBitworkForRevealTx && hasValidBitwork(checkTxid, this.bitworkInfoReveal?.prefix as any, this.bitworkInfoReveal?.ext as any)) {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(chalk.green(checkTxid, ' nonces: ' + noncesGenerated));
                console.log('\nBitwork matches reveal txid! ', revealTx.getId(), '@ time: ' + Math.floor(Date.now() / 1000))
                shouldBroadcast = true;
            }
            // Broadcast either because there was no bitwork requested, and we are done. OR...
            // broadcast because we found the bitwork and it is ready to be broadcasted
            if (shouldBroadcast) {
                AtomicalOperationBuilder.finalSafetyCheckForExcessiveFee(psbt, revealTx);
                console.log('\nBroadcasting tx...', revealTx.getId())
                const interTx = psbt.extractTransaction();
                const rawtx = interTx.toHex();
                if (!(await this.broadcastWithRetries(rawtx))) {
                    console.log('Error sending', revealTx.getId(), rawtx);
                    throw new Error('Unable to broadcast reveal transaction after attempts');
                } else {
                    console.log('Success sent tx: ', revealTx.getId());
                }
                revealTxid = interTx.getId();
                performBitworkForRevealTx = false; // Done
            }
            nonce++;
            noncesGenerated++;
        } while (performBitworkForRevealTx);

        const ret = {
            success: true,
            data: {
                commitTxid,
                revealTxid
            }
        }
        if (this.options.opType === 'nft' || this.options.opType === 'ft' || this.options.opType === 'dft') {
            ret['data']['atomicalId'] = atomicalId;
        }
        return ret;
    }

    async broadcastWithRetries(rawtx: string): Promise<any> {
        let attempts = 0;
        let result = null;
        do {
            try {
                result = await this.options.electrumApi.broadcast(rawtx);
                if (result) {
                    break;
                }
            } catch (err) {
                console.log('Network error broadcasting (Trying again soon...)', err);
                await this.options.electrumApi.resetConnection();
                // Put in a sleep to help the connection reset more gracefully in case there is some delay
                console.log(`Will retry to broadcast transaction again in ${SEND_RETRY_SLEEP_SECONDS} seconds...`);
                await sleeper(SEND_RETRY_SLEEP_SECONDS)
            }
            attempts++;
        } while (attempts < SEND_RETRY_ATTEMPTS);
        return result;
    }

    static translateFromBase32ToHex(bitwork: string): string {

        return bitwork;
    }

    totalOutputSum(): number {
        let sum = 0;
        for (const additionalOutput of this.additionalOutputs) {
            sum += additionalOutput.value;
        }
        return sum
    }


    getTotalAdditionalInputValues(): number {
        let sum = 0;
        for (const utxo of this.inputUtxos) {
            sum += utxo.utxo.witnessUtxo.value;
        }
        return sum;
    }

    getTotalAdditionalOutputValues(): number {
        let sum = 0;
        for (const output of this.additionalOutputs) {
            sum += output.value
        }
        return sum;
    }

    calculateAmountRequiredForReveal(hashLockP2TROutputLen: number = 0): number {
        const ARGS_BYTES = 20;
        const BITWORK_BYTES = 5 + 10 + 4 + 10 + 4 + 10 + 1 + 10;
        const EXTRA_BUFFER = 10;

        return (this.options.satsbyte as any) *
            (BASE_BYTES +
                ((1 + this.inputUtxos.length) * INPUT_BYTES_BASE) +
                (this.additionalOutputs.length * OUTPUT_BYTES_BASE) +
                OP_RETURN_BYTES +
                ARGS_BYTES +
                BITWORK_BYTES +
                EXTRA_BUFFER +
                hashLockP2TROutputLen
            )
    }

    calculateFeesRequiredForCommit(): number {
        return (this.options.satsbyte as any) *
            (BASE_BYTES +
                (1 * INPUT_BYTES_BASE) +
                (1 * OUTPUT_BYTES_BASE)
            )
    }

    getAdditionalFundingRequiredForReveal(): number | null {
        return 0;
    }

    /**
     * Get the commit and reveal fee. The commit fee assumes it is chained together
     * @returns 
     */
    calculateFeesRequiredForAccumulatedCommitAndReveal(hashLockP2TROutputLen: number = 0): FeeCalculations {
        const revealFee = this.calculateAmountRequiredForReveal(hashLockP2TROutputLen);
        const commitFee = this.calculateFeesRequiredForCommit();
        const commitAndRevealFee = commitFee + revealFee;
        const commitAndRevealFeePlusOutputs = commitFee + revealFee + this.totalOutputSum();
        const revealFeePlusOutputs = revealFee + this.totalOutputSum();
        const ret = {
            commitAndRevealFee,
            commitAndRevealFeePlusOutputs,
            revealFeePlusOutputs,
            commitFeeOnly: commitFee,
            revealFeeOnly: revealFee
        }
        return ret;
    }

    /**
     * Adds an extra output at the end if it was detected there would be excess satoshis for the reveal transaction
     * @param fee Fee calculations
     * @returns 
     */
    addRevealOutputIfChangeRequired(fee: FeeCalculations) {
        const currentSatoshisFeePlanned = this.getTotalAdditionalInputValues() - this.getTotalAdditionalOutputValues();
        // It will be invalid, but at least we know we don't need to add change
        if (currentSatoshisFeePlanned <= 0) {
            return;
        }
        const excessSatoshisFound = currentSatoshisFeePlanned - fee.revealFeePlusOutputs;
        // There were no excess satoshis, therefore no change is due
        if (excessSatoshisFound <= 0) {
            return;
        }
        // There were some excess satoshis, but let's verify that it meets the dust threshold to make change
        if (excessSatoshisFound >= DUST_AMOUNT) {

            this.addOutput({
                address: this.options.address,
                value: excessSatoshisFound
            })
        }
    }

    /**
    * Adds an extra output at the end if it was detected there would be excess satoshis for the reveal transaction
    * @param fee Fee calculations
    * @returns 
    */
    addCommitChangeOutputIfRequired(extraInputValue: number, fee: FeeCalculations, pbst: any, hashScriptLen: number, address: string) {
        // console.log('-----------addChangeOutputIfRequired----------');
        // console.log('extraInputValue', extraInputValue);
        // console.log('fee', JSON.stringify(fee, null, 2));
        // console.log('address', address);
        const totalInputsValue = extraInputValue + this.getTotalAdditionalInputValues();
        const totalOutputsValue = this.getTotalAdditionalOutputValues() + fee.revealFeePlusOutputs;
        const calculatedFee = totalInputsValue - totalOutputsValue;
        // console.log('totalInputsValue', totalInputsValue);
        // console.log('totalOutputsValue', totalOutputsValue);
        // console.log('calculatedFee', calculatedFee);
        // It will be invalid, but at least we know we don't need to add change
        if (calculatedFee <= 0) {
            //  console.log('calculatedFee <= 0', calculatedFee);
            return;
        }
        const expectedFee = fee.commitFeeOnly;
        // console.log('expectedFee', expectedFee);
        const differenceBetweenCalculatedAndExpected = calculatedFee - expectedFee;
        if (differenceBetweenCalculatedAndExpected <= 0) {
            //  console.log('differenceBetweenCalculatedAndExpected <= 0');
            return;
        }
        // console.log('differenceBetweenCalculatedAndExpected', differenceBetweenCalculatedAndExpected);
        // console.log('excessSatoshisFound', excessSatoshisFound);
        // There were some excess satoshis, but let's verify that it meets the dust threshold to make change
        if (differenceBetweenCalculatedAndExpected >= DUST_AMOUNT) {
            pbst.addOutput({
                address: address,
                value: differenceBetweenCalculatedAndExpected
            })
        }
        // console.log('differenceBetweenCalculatedAndExpected', differenceBetweenCalculatedAndExpected);
        // console.log('pbst', pbst);
    }

    /**
     * a final safety check to ensure we don't accidentally broadcast a tx with too high of a fe
     * @param psbt Partially signed bitcoin tx coresponding to the tx to calculate the total inputs values provided
     * @param tx The tx to broadcast, uses the outputs to calculate total outputs 
     */
    static finalSafetyCheckForExcessiveFee(psbt: any, tx) {
        let sumInputs = 0;
        psbt.data.inputs.map((inp) => {
            sumInputs += inp.witnessUtxo.value;
        });
        let sumOutputs = 0;
        tx.outs.map((out) => {
            sumOutputs += out.value;
        });
        if (sumInputs - sumOutputs > EXCESSIVE_FEE_LIMIT) {
            throw new Error(`Excessive fee detected. Hardcoded to ${EXCESSIVE_FEE_LIMIT} satoshis. Aborting due to protect funds. Contact developer`);
        }
    }

    /**
     * Helper function to resolve a parent atomical id and the wallet record into a format that's easily processable by setInputParent
     * @param electrumxApi 
     * @param parentId 
     * @param parentOwner 
     */
    static async resolveInputParent(electrumxApi: ElectrumApiInterface, parentId, parentOwner: IWalletRecord): Promise<ParentInputAtomical> {
        const { atomicalInfo, locationInfo, inputUtxoPartial } = await getAndCheckAtomicalInfo(electrumxApi, parentId, parentOwner.address as any);
        const parentKeypairInput = ECPair.fromWIF(parentOwner.WIF as any);
        const parentKeypairInputInfo = getKeypairInfo(parentKeypairInput)
        const inp: ParentInputAtomical = {
            parentId,
            parentUtxoPartial: inputUtxoPartial,
            parentKeyInfo: parentKeypairInputInfo
        }
        return inp;
    }
}
