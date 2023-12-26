const { Token, Ether } = require('@uniswap/sdk-core')
const { ObjectId } = require('bson')

module.exports = {
    31337: {
        rpc: {
            name: "Local Fork Ethereum Mainnet",
            url: "http://localhost:8545",
            chainId: 31337
        },
        PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        WETHAddr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        WETH_TOKEN:new Token(31337, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
        USDAddrs: {
            USDCAddr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            USDTAddr: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
        },
        AdminUUID: new ObjectId('656ebda11b118e6f59648f6b')
    },

    1: {
        rpc: {
            name: "Ethereum Mainnet",
            url: "https://rpc.ankr.com/eth",
            chainId: 1
        },
        PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        WETHAddr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        WETH_TOKEN: new Token(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
        USDAddrs: {
            USDCAddr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            USDTAddr: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
        },
        AdminUUID: new ObjectId('656ebda11b118e6f59648f6b'),
        //2023-12-26
        AdminEOAAddr: '0x325112B9852dCB59C30FA7B9DF0dcE0C3D82578E',
        QuoterV3Addr: '0x11fA6cbffe190A5b7e0A963be229f01292909C26',
        BundlerManagerAddr: '0x42E8C5f71e53d408DE63454224D53A16296EFCC8',
        MulticallAddr: '0x35564a6bE766Acba06C80B909977D882bb8646E6',
        BundlerAddr: '0xE023b6daDEC8e72B6Ee90F917204ab91B07e2CdF',
        WalletFactoryAddr: '0xC28C464758dC4051C77b180dB8212916a8879E68',
        AdminWalletAddr: '0x2Ebf5248493C8a0cA4Ed3c26738EBFF28755A8B9',
    },

    137: {
        rpc: {
            name: "Polygon",
            url: "https://matic-mainnet.chainstacklabs.com",
            chainId: 137
        },
        PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        WETHAddr: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
        WETH_TOKEN: new Token(137, '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', 18, 'WMATIC', 'Wrapped Matic'),
        USDAddrs: {
            USDTAddr: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            USDCAddr: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            DAIAddr: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
        },
        AdminUUID: new ObjectId('656ebda11b118e6f59648f6b'),
        //2023-12-26
        AdminEOAAddr: '0x325112B9852dCB59C30FA7B9DF0dcE0C3D82578E',
        QuoterV3Addr: '0x11fA6cbffe190A5b7e0A963be229f01292909C26',
        BundlerManagerAddr: '0x42E8C5f71e53d408DE63454224D53A16296EFCC8',
        MulticallAddr: '0x35564a6bE766Acba06C80B909977D882bb8646E6',
        BundlerAddr: '0xE023b6daDEC8e72B6Ee90F917204ab91B07e2CdF',
        WalletFactoryAddr: '0xC28C464758dC4051C77b180dB8212916a8879E68',
        AdminWalletAddr: '0x2Ebf5248493C8a0cA4Ed3c26738EBFF28755A8B9',
    },

    56: {
        rpc: {
            name: "BNBChain",
            url: "https://bsc.nodereal.io",
            chainId: 56
        },
        PoolFactoryAddr: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7',
        QuoterAddr: '0x78D78E420Da98ad378D7799bE8f4AF69033EB077',
        SwapRouterAddr: '0x11AF00243EEdEae29B07E0e9A26e1CcE98df8c29',
        WETHAddr: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        WETH_TOKEN: new Token(56, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18, 'WBNB', 'Wrapped BNB'),
        USDAddrs: {
            USDTAddr: '0x55d398326f99059fF775485246999027B3197955',
            USDCAddr: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            BUSDAddr: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        },
        AdminUUID: new ObjectId('656ebda11b118e6f59648f6b'),
        //2023-12-26
        AdminEOAAddr: '0x325112B9852dCB59C30FA7B9DF0dcE0C3D82578E',
        QuoterV3Addr: '0x11fA6cbffe190A5b7e0A963be229f01292909C26',
        BundlerManagerAddr: '0x42E8C5f71e53d408DE63454224D53A16296EFCC8',
        MulticallAddr: '0x35564a6bE766Acba06C80B909977D882bb8646E6',
        BundlerAddr: '0xE023b6daDEC8e72B6Ee90F917204ab91B07e2CdF',
        WalletFactoryAddr: '0xC28C464758dC4051C77b180dB8212916a8879E68',
        AdminWalletAddr: '0x2Ebf5248493C8a0cA4Ed3c26738EBFF28755A8B9',
    },

    10: {
        rpc: {
            name: "Optimism",
            url: "https://mainnet.optimism.io",
            chainId: 10
        },
        PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        WETHAddr: '0x4200000000000000000000000000000000000006',
        WETH_TOKEN: new Token(10, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
        USDAddrs: {
            USDCAddr: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
            USDTAddr: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
            DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
        },
        AdminUUID: new ObjectId('656ebda11b118e6f59648f6b'),
        //2023-12-26
        AdminEOAAddr: '0x325112B9852dCB59C30FA7B9DF0dcE0C3D82578E',
        QuoterV3Addr: '0x11fA6cbffe190A5b7e0A963be229f01292909C26',
        BundlerManagerAddr: '0x42E8C5f71e53d408DE63454224D53A16296EFCC8',
        MulticallAddr: '0x35564a6bE766Acba06C80B909977D882bb8646E6',
        BundlerAddr: '0xE023b6daDEC8e72B6Ee90F917204ab91B07e2CdF',
        WalletFactoryAddr: '0xC28C464758dC4051C77b180dB8212916a8879E68',
        AdminWalletAddr: '0x2Ebf5248493C8a0cA4Ed3c26738EBFF28755A8B9',
    },

    42161: {
        rpc: {
            name: "ArbitrumOne",
            url: "https://arb1.arbitrum.io/rpc",
            chainId: 42161
        },
        PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        WETHAddr: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        WETH_TOKEN: new Token(42161, '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 18, 'WETH', 'Wrapped Ether'),
        USDAddrs: {
            USDCAddr: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
            USDTAddr: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
            DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
        },
        AdminUUID: new ObjectId('656ebda11b118e6f59648f6b'),
        //2023-12-26
        AdminEOAAddr: '0x325112B9852dCB59C30FA7B9DF0dcE0C3D82578E',
        QuoterV3Addr: '0x11fA6cbffe190A5b7e0A963be229f01292909C26',
        BundlerManagerAddr: '0x42E8C5f71e53d408DE63454224D53A16296EFCC8',
        MulticallAddr: '0x35564a6bE766Acba06C80B909977D882bb8646E6',
        BundlerAddr: '0xE023b6daDEC8e72B6Ee90F917204ab91B07e2CdF',
        WalletFactoryAddr: '0xC28C464758dC4051C77b180dB8212916a8879E68',
        AdminWalletAddr: '0x2Ebf5248493C8a0cA4Ed3c26738EBFF28755A8B9',
    },

    8453: {
        rpc: {
            name: "Base",
            url: "https://mainnet.base.org",
            chainId: 8453
        },
        PoolFactoryAddr: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
        QuoterAddr: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
        SwapRouterAddr: '0x2626664c2603336E57B271c5C0b26F421741e481',
        WETHAddr: '0x4200000000000000000000000000000000000006',
        WETH_TOKEN: new Token(8453, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
        USDAddrs: {
            USDCAddr: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            USDbCAddr: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
        },
        AdminUUID: new ObjectId('656ebda11b118e6f59648f6b')
    },
}