const { Token, Ether } = require('@uniswap/sdk-core')
const { ObjectId } = require('bson')

module.exports = {
    // 1: {
    //     rpc: {
    //         name: "Ethereum Mainnet",
    //         url: "https://rpc.ankr.com/eth",
    //         chainId: 1
    //     },
    //     PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    //     QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    //     SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    //     WETHAddr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    //     WETH_TOKEN: new Token(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
    //     USDAddrs: {
    //         USDCAddr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    //         USDTAddr: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    //         DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    //     },
    // },

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
        //2023-12-5
        QuoterV3Addr: '0x8f44d38611096E48E24391221C31615914792556',
        MulticallAddr: '0x0474d169D5d89f060D3e92861d787F4bE80A71dd',
        BundlerManagerAddr: '0x694dD96Ce948Fa6eE48BfA4B0e97B2aB96568B27',
        BundlerAddr: '0x4B394eCf83dB82250dd5D988dF413A5a9092dd2e',
        WalletFactoryAddr: '0x0554CE0BA18f6b2744973476838dB12FaE77bF94',
        AdminWalletAddr: '0x04C9283c3690C0125b062Db89C127F3390482a6B',
        AdminEOAAddr: '0x6476ee16BdAdD3623A5dc2566bcb534cAaA6cD61',
        AdminUUID: new ObjectId('656ebda11b118e6f59648f6b')
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
        //2023-12-6
        BundlerManagerAddr: '0x8f44d38611096E48E24391221C31615914792556',
        WalletFactoryAddr: '0x0474d169D5d89f060D3e92861d787F4bE80A71dd',
        QuoterV3Addr: '0x694dD96Ce948Fa6eE48BfA4B0e97B2aB96568B27',
        MulticallAddr: '0x0554CE0BA18f6b2744973476838dB12FaE77bF94',
        BundlerAddr: '0x7190544403c5EBd7Ba3882262f68CB8eE0E3c396',
        AdminWalletAddr: '0x0E21854ca88BC3347dC87cFbFb6E4562d723D859',
        AdminUUID: new ObjectId('656ebda11b118e6f59648f6b')
    },

    // 10: {
    //     rpc: {
    //         name: "Optimism",
    //         url: "https://mainnet.optimism.io",
    //         chainId: 10
    //     },
    //     PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    //     QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    //     SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    //     WETHAddr: '0x4200000000000000000000000000000000000006',
    //     WETH_TOKEN: new Token(10, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    //     USDAddrs: {
    //         USDCAddr: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    //         USDTAddr: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    //         DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    //     },
    // },

    // 42161: {
    //     rpc: {
    //         name: "ArbitrumOne",
    //         url: "https://arb1.arbitrum.io/rpc",
    //         chainId: 42161
    //     },
    //     PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    //     QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    //     SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    //     WETHAddr: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    //     WETH_TOKEN: new Token(42161, '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', 18, 'WETH', 'Wrapped Ether'),
    //     USDAddrs: {
    //         USDCAddr: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    //         USDTAddr: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    //         DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    //     },
    // },

    // 8453: {
    //     rpc: {
    //         name: "Base",
    //         url: "https://mainnet.base.org",
    //         chainId: 8453
    //     },
    //     PoolFactoryAddr: '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    //     QuoterAddr: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
    //     SwapRouterAddr: '0x2626664c2603336E57B271c5C0b26F421741e481',
    //     WETHAddr: '0x4200000000000000000000000000000000000006',
    //     WETH_TOKEN: new Token(8453, '0x4200000000000000000000000000000000000006', 18, 'WETH', 'Wrapped Ether'),
    //     USDAddrs: {
    //         USDCAddr: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    //         USDbCAddr: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA'
    //     },
    // },
}