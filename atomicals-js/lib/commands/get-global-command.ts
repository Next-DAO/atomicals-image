import { ElectrumApiInterface } from "../api/electrum-api.interface";
import { AtomicalsGetFetchType, CommandInterface } from "./command.interface";
import { decorateAtomical } from "../utils/atomical-format-helpers";

export class GetGlobalCommand implements CommandInterface {
  constructor(private electrumApi: ElectrumApiInterface) {
  }

  async run(): Promise<any> {
    let response = await this.electrumApi.atomicalsGetGlobal();
    const updatedRes = Object.assign({},
      response,
      {
        result: decorateAtomical(response.result)
      }
    );
    return {
      success: true,
      data: updatedRes
    }
  }
}