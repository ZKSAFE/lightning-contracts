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

    //     WalletFactoryAddr: '',
    //     USDAddrs: {
    //         USDCAddr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    //         USDTAddr: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    //         DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    //     },
    //     QuoterV3Addr: '',
    //     BundlerManagerAddr: '',
    //     BundlerAddr: '',
    // },
    // 5: {
    //     rpc: {
    //         name: "Ethereum Goerli",
    //         url: "https://eth-goerli.g.alchemy.com/v2/demo",
    //         chainId: 5
    //     },
    //     PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    //     QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    //     SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    //     WETHAddr: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6',
    //     WETH_TOKEN: new Token(5, '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', 18, 'WETH', 'Wrapped Ether'),

    //     NATIVE_ETH_ADDRESS: '0x0000000000000000000000000000000000000000',
    //     WalletFactoryAddr: '0xc3E408dDF2e03e11890C212D6D976b3fD6B87F9f',
    //     USDAddrs: {
    //         USDCAddr: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    //         DAI: '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844'
    //     },
    //     SubBundlerAddr: '0x8C1C64E6e5a5e31A9B6bd6728c2ad37838a0D301',
    //     QuoterV3Addr: '0x42651ae9f9aae9ac51fd155dd4e98240e11e1344',
    //     BundlerManagerAddr: '0x694dD96Ce948Fa6eE48BfA4B0e97B2aB96568B27',
    // },

    // 31337: {
    //     rpc: {
    //         name: "Local Fork Ethereum Mainnet",
    //         url: "http://localhost:8545",
    //         chainId: 31337
    //     },
    //     PoolFactoryAddr: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    //     QuoterAddr: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    //     SwapRouterAddr: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    //     WETHAddr: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    //     WETH_TOKEN: new Token(31337, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether'),
    //     WalletFactoryAddr: '',
    //     USDAddrs: {
    //         USDCAddr: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    //         USDTAddr: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    //         DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    //     },
    //     QuoterV3Addr: '',
    //     BundlerManagerAddr: '',
    //     BundlerAddr: '',
    //     PublicSocialRecoveryAddr: '',
    //     AdminWalletAddr: '',
    //     AdminEOAAddr: ''
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
            DAI: '0x8F3cf7ad23cd3cADbd9735afe958023239c6a063',

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

    // 56: {
    //     rpc: {
    //         name: "BNBChain",
    //         url: "https://bsc.nodereal.io",
    //         chainId: 56
    //     },
    //     PoolFactoryAddr: '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7',
    //     QuoterAddr: '0x78D78E420Da98ad378D7799bE8f4AF69033EB077',
    //     SwapRouterAddr: '0x11AF00243EEdEae29B07E0e9A26e1CcE98df8c29',
    //     WETHAddr: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    //     WETH_TOKEN: new Token(56, '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', 18, 'WBNB', 'Wrapped BNB'),

    //     NATIVE_ETH_ADDRESS: '0x0000000000000000000000000000000000000000',
    //     WalletFactoryAddr: '',
    //     USDAddrs: {
    //         USDCAddr: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    //         USDTAddr: '0x55d398326f99059fF775485246999027B3197955',
    //         BUSDAddr: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',

    //     },
    //     SubBundlerAddr: '0xd6322a2842b0818505Fd810179AC401c461E1397',
    //     QuoterV3Addr: '0x42651ae9f9aae9ac51fd155dd4e98240e11e1344',
    //     BundlerManagerAddr: '0x694dD96Ce948Fa6eE48BfA4B0e97B2aB96568B27',
    // },
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

    //     NATIVE_ETH_ADDRESS: '0x0000000000000000000000000000000000000000',
    //     WalletFactoryAddr: '0xb58eD778643bEC922966334fea7a37834338FedE',
    //     USDAddrs: {
    //         USDCAddr: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    //         USDTAddr: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    //         DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
    //     },
    //     SubBundlerAddr: '0x4B394eCf83dB82250dd5D988dF413A5a9092dd2e',
    //     QuoterV3Addr: '0x42651ae9f9aae9ac51fd155dd4e98240e11e1344',
    //     BundlerManagerAddr: '0x694dD96Ce948Fa6eE48BfA4B0e97B2aB96568B27',
    // },
}