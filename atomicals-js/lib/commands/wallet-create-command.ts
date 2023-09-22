import { CommandResultInterface } from "./command-result.interface";
import { CommandInterface } from "./command.interface";
import { createPrimaryAndFundingKeyPairs } from "../utils/create-key-pair";

export class WalletCreateCommand implements CommandInterface {
    async run(): Promise<CommandResultInterface> {
        const keypairs = await createPrimaryAndFundingKeyPairs();

        return {
            success: true,
            data: keypairs
        }
    }
}