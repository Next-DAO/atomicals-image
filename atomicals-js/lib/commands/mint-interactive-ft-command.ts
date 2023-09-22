import { ElectrumApiInterface } from "../api/electrum-api.interface";

import { AtomicalsGetFetchType, CommandInterface } from "./command.interface";
import * as ecc from 'tiny-secp256k1';
import { hydrateConfig } from "../utils/hydrate-config";
import { TinySecp256k1Interface } from 'ecpair';
const bitcoin = require('bitcoinjs-lib');
bitcoin.initEccLib(ecc);
import {
  initEccLib,
} from "bitcoinjs-lib";
import { GetByTickerCommand } from "./get-by-ticker-command";
import { BaseRequestOptions } from "../interfaces/api.interface";
import { checkBaseRequestOptions, isValidBitworkMinimum, isValidBitworkString, isValidTickerName } from "../utils/atomical-format-helpers";
import { AtomicalOperationBuilder } from "../utils/atomical-operation-builder";
import { prepareFilesDataAsObject } from "./command-helpers";
const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
initEccLib(tinysecp as any);
export class MintInteractiveFtCommand implements CommandInterface {
  constructor(
    private electrumApi: ElectrumApiInterface,
    private files: string[],
    private supply: number,
    private address: string,
    private requestTicker: string,
    private fundingWIF: string,
    private options: BaseRequestOptions
  ) {
    this.options = checkBaseRequestOptions(this.options)
    this.requestTicker = this.requestTicker.startsWith('$') ? this.requestTicker.substring(1) : this.requestTicker;
    isValidTickerName(requestTicker);
    isValidBitworkMinimum(this.options.bitworkc);
  }
  async run(): Promise<any> {
    const getExistingNameCommand = new GetByTickerCommand(this.electrumApi, this.requestTicker, AtomicalsGetFetchType.GET, undefined);
    try {
      const getExistingNameResult = await getExistingNameCommand.run();
      if (getExistingNameResult.success && getExistingNameResult.data) {
        if (getExistingNameResult.data.result && getExistingNameResult.data.result.atomical_id || getExistingNameResult.data.candidates.length) {
          throw 'Already exists with that name. Try a different name.';
        }
      }
    } catch (err: any) {
      console.log('err', err)
      if (err.code !== 1) {
        throw err; // Code 1 means call correctly returned that it was not found
      }
    }

    const atomicalBuilder = new AtomicalOperationBuilder({
      electrumApi: this.electrumApi,
      satsbyte: this.options.satsbyte,
      address: this.address,
      disableMiningChalk: this.options.disableMiningChalk,
      opType: 'ft',
      ftOptions: {
        fixedSupply: this.supply,
        ticker: this.requestTicker,
      },
      meta: this.options.meta,
      ctx: this.options.ctx,
      init: this.options.init,
    });

    // Attach any default data
    let filesData = await prepareFilesDataAsObject(this.files);
    await atomicalBuilder.setData(filesData);
    // Set to request a container
    atomicalBuilder.setRequestTicker(this.requestTicker);
    // Attach a container request
    if (this.options.container)
      atomicalBuilder.setContainerMembership(this.options.container);
    // Attach any requested bitwork
    if (this.options.bitworkc) {
      atomicalBuilder.setBitworkCommit(this.options.bitworkc);
    }
    if (this.options.bitworkr) {
      atomicalBuilder.setBitworkReveal(this.options.bitworkr);
    }

    if (this.options.parent) {
      atomicalBuilder.setInputParent(await AtomicalOperationBuilder.resolveInputParent(this.electrumApi, this.options.parent, this.options.parentOwner as any))
    }

    // The receiver output
    atomicalBuilder.addOutput({
      address: this.address,
      value: this.supply
    });

    const result = await atomicalBuilder.start(this.fundingWIF);
    return {
      success: true,
      data: result
    }
  }

}