// src/app/dapp/config/constants.ts
export const NETWORKS = {
    ETHEREUM_MAINNET: {
        name: 'Ethereum Mainnet',
        chainId: 1,
        symbol: 'ETH',
        blockExplorer: 'https://etherscan.io'
    },
    SEPOLIA: {
        name: 'Sepolia Testnet',
        chainId: 11155111,
        symbol: 'ETH',
        blockExplorer: 'https://sepolia.etherscan.io'
    },
    POLYGON: {
        name: 'Polygon',
        chainId: 137,
        symbol: 'MATIC',
        blockExplorer: 'https://polygonscan.com'
    },
    MUMBAI: {
        name: 'Mumbai Testnet',
        chainId: 80001,
        symbol: 'MATIC',
        blockExplorer: 'https://mumbai.polygonscan.com'
    },
    HARDHAT_LOCAL: {
        name: 'Etherum Holesky',
        chainId: 17000,
        symbol: 'ETH',
        blockExplorer: 'https://holesky.etherscan.io'
    }
};

export const CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Reemplazar con tu dirección real