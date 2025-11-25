// src/app/dapp/interfaces/network.interface.ts
export interface Network {
    name: string;
    chainId: number;
    rpcUrl?: string;
    symbol?: string;
    blockExplorer?: string;
}