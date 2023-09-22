import { ElectrumApiInterface } from "../api/electrum-api.interface";
import { CommandInterface } from "./command.interface";
import * as ecc from 'tiny-secp256k1';
import { TinySecp256k1Interface } from 'ecpair';
const bitcoin = require('bitcoinjs-lib');
bitcoin.initEccLib(ecc);
import {
  initEccLib,
} from "bitcoinjs-lib";
import { logBanner } from "./command-helpers";
import { AtomicalOperationBuilder } from "../utils/atomical-operation-builder";
import { BaseRequestOptions } from "../interfaces/api.interface";
import { IWalletRecord } from "../utils/validate-wallet-storage";
import { GetAtomicalsAtLocationCommand } from "./get-atomicals-at-location-command";
import { GetUtxoPartialFromLocation } from "../utils/address-helpers";
import { IInputUtxoPartial } from "../types/UTXO.interface";
import { hasAtomicalType } from "../utils/atomical-format-helpers";

const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
initEccLib(tinysecp as any);

export class SplitInteractiveCommand implements CommandInterface {
  constructor(
    private electrumApi: ElectrumApiInterface,
    private locationId: string,
    private owner: IWalletRecord,
    private funding: IWalletRecord,
    private options: BaseRequestOptions
  ) {
  }
  async run(): Promise<any> {
    logBanner(`Split FTs Interactive`);
    const command: CommandInterface = new GetAtomicalsAtLocationCommand(this.electrumApi, this.locationId);
    const response: any = await command.run();
    if (!response || !response.success) {
      throw new Error(response);
    }
    const atomicals = response.data.atomicals;
    const atomicalFts = atomicals.filter((item) => {
      return item.type === 'FT';
    });
    if (atomicalFts.length <= 1) {
      throw new Error('Multiple FTs were not found at the same location. Nothing to skip split out.');
    }

    console.log('Found multiple FTs at the same location: ', atomicalFts);

    const hasNfts = hasAtomicalType('NFT', atomicals);
    if (hasNfts) {
      console.log('Also found at least one NFT at the same location. The first output will contain the NFTs, and the second output, etc will contain the FTs split out.')
    }
    const inputUtxoPartial: IInputUtxoPartial | any = GetUtxoPartialFromLocation(this.owner.address, response.data.location_info);
    const atomicalBuilder = new AtomicalOperationBuilder({
      electrumApi: this.electrumApi,
      satsbyte: this.options.satsbyte,
      address: this.owner.address,
      disableMiningChalk: this.options.disableMiningChalk,
      opType: 'y',
      skipOptions: {
      },
      meta: this.options.meta,
      ctx: this.options.ctx,
      init: this.options.init,
    });

    // Add the owner of the atomicals at the location
    atomicalBuilder.addInputUtxo(inputUtxoPartial, this.owner.WIF)
    // ... and make sure to assign outputs to capture each atomical split
    const ftsToSplit: any = {}
    let amountSkipped = 0;
    if (hasNfts) {
      atomicalBuilder.addOutput({
        address: inputUtxoPartial.address,
        value: inputUtxoPartial.witnessUtxo.value
      });
      amountSkipped += inputUtxoPartial.witnessUtxo.value;
    }
    for (const ft of atomicalFts) {
      // Make sure to make N outputs, for each atomical NFT
      ftsToSplit[ft.atomical_id] = amountSkipped;
      atomicalBuilder.addOutput({
        address: inputUtxoPartial.address,
        value: inputUtxoPartial.witnessUtxo.value
      });
      // Add the amount to skip for the next FT
      amountSkipped += inputUtxoPartial.witnessUtxo.value;
    }
    await atomicalBuilder.setData(ftsToSplit);
    const result = await atomicalBuilder.start(this.funding.WIF);
    return {
      success: true,
      data: result
    }
  }
}


