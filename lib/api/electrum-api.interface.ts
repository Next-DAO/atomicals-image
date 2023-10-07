import { UTXO } from "../types/UTXO.interface";

export interface IUnspentResponse {
    confirmed: number;
    unconfirmed: number;
    balance: number;
    utxos: UTXO[];
}

export interface ElectrumApiInterface {
    close: () => Promise<void>;
    open: () => Promise<void>;
    resetConnection: () => Promise<void>;
    isOpen: () => boolean;
    sendTransaction: (rawtx: string) => Promise<string>;
    getUnspentAddress: (address: string) => Promise<IUnspentResponse>;
    getUnspentScripthash: (address: string) => Promise<IUnspentResponse>;
    waitUntilUTXO: (address: string, satoshis: number, sleepTimeSec: number, exactSatoshiAmount?: boolean) => Promise<any>;
    getTx: (txid: string, verbose?: boolean) => Promise<any>;
    serverVersion: () => Promise<any>;
    broadcast: (rawtx: string) => Promise<any>;
    history: (scripthash: string) => Promise<any>;
    dump: () => Promise<any>;
    // Atomicals API
    atomicalsGetGlobal: (hashes: number) => Promise<any>;
    atomicalsGet: (atomicalAliasOrId: string | number) => Promise<any>;
    atomicalsGetFtInfo: (atomicalAliasOrId: string | number) => Promise<any>;
    atomicalsGetLocation: (atomicalAliasOrId: string | number) => Promise<any>;
    atomicalsGetState: (atomicalAliasOrId: string | number, path: string, verbose: boolean) => Promise<any>;
    atomicalsGetStateHistory: (atomicalAliasOrId: string | number) => Promise<any>;
    atomicalsGetEventHistory: (atomicalAliasOrId: string | number) => Promise<any>;
    atomicalsGetTxHistory: (atomicalAliasOrId: string | number) => Promise<any>;
    atomicalsList: (limit: number, offset: number, asc: boolean) => Promise<any>;
    atomicalsByScripthash: (scripthash: string, verbose?: boolean) => Promise<any>;
    atomicalsByAddress: (address: string) => Promise<any>;
    atomicalsAtLocation: (location: string) => Promise<any>;
    atomicalsGetByRealm: (realm: string) => Promise<any>;
    atomicalsGetRealmInfo: (realmOrSubRealm: string, verbose?: boolean) => Promise<any>;
    atomicalsGetByTicker: (ticker: string) => Promise<any>;
    atomicalsGetByContainer: (container: string) => Promise<any>;
    atomicalsFindTickers: (tickerPrefix: string | null, asc?: boolean) => Promise<any>;
    atomicalsFindContainers: (containerPrefix: string | null, asc?: boolean) => Promise<any>;
    atomicalsFindRealms: (realmPrefix: string | null, asc?: boolean) => Promise<any>;
    atomicalsFindSubRealms: (parentRealmId: string, subrealmPrefix: string | null, mostRecentFirst?: boolean) => Promise<any>;
} 