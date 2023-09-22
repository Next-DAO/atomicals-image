
export interface ConfigurationInterface {
    electrumxWebsocketUrl: string;
    satsPerByte: number;
    minFundingSatoshisPerUtxo: number;
}

export interface HydratedConfigurationInterface {
    electrumxWebsocketUrl: string;
    satsPerByte: number;
    minFundingSatoshisPerUtxo: number;
}