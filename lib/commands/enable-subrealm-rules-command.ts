import { ElectrumApiInterface } from "../api/electrum-api.interface";
import { AtomicalsGetFetchType, CommandInterface } from "./command.interface";
import * as ecc from 'tiny-secp256k1';
import { TinySecp256k1Interface } from 'ecpair';
const bitcoin = require('bitcoinjs-lib');
bitcoin.initEccLib(ecc);
import {
  initEccLib,
} from "bitcoinjs-lib";
import { getAndCheckAtomicalInfo, logBanner, prepareFilesDataAsObject } from "./command-helpers";
import { AtomicalOperationBuilder } from "../utils/atomical-operation-builder";
import { BaseRequestOptions } from "../interfaces/api.interface";
import { IWalletRecord } from "../utils/validate-wallet-storage";
import { AtomicalIdentifierType, validateSubrealmRulesObject } from "../utils/atomical-format-helpers";

const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
initEccLib(tinysecp as any);

export class EnableSubrealmRulesCommand implements CommandInterface {
  constructor(
    private electrumApi: ElectrumApiInterface,
    private atomicalId: string,
    private rules: string[],
    private funding: IWalletRecord,
    private owner: IWalletRecord,
    private options: BaseRequestOptions
  ) {

  }
  async run(): Promise<any> {
    logBanner(`Enable Subrealm Rules Interactive`);
    // Attach any default data
    let filesData = await prepareFilesDataAsObject(this.rules);
    const updatedFilesWithPath = Object.assign({}, filesData, {
      $path: '/subrealms'
    });
    validateSubrealmRulesObject(filesData);
    AtomicalsGetFetchType
    console.log('realm', this.owner.address)
    const { atomicalInfo, locationInfo, inputUtxoPartial } = await getAndCheckAtomicalInfo(this.electrumApi, this.atomicalId, this.owner.address, 'NFT', null);
    const atomicalBuilder = new AtomicalOperationBuilder({
      electrumApi: this.electrumApi,
      satsbyte: this.options.satsbyte,
      address: this.owner.address,
      disableMiningChalk: this.options.disableMiningChalk,
      opType: 'mod',
      nftOptions: {
        satsoutput: this.options.satsoutput as any
      },
      meta: this.options.meta,
      ctx: this.options.ctx,
      init: this.options.init,
    });
    await atomicalBuilder.setData(updatedFilesWithPath);
    // Add the atomical to update
    atomicalBuilder.addInputUtxo(inputUtxoPartial, this.owner.WIF)
    // The receiver output
    atomicalBuilder.addOutput({
      address: this.owner.address,
      value: this.options.satsoutput as any || 1000
    });
    const result = await atomicalBuilder.start(this.funding.WIF);
    return {
      success: true,
      data: result
    }
  }
}