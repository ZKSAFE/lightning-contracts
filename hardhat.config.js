require('@nomicfoundation/hardhat-toolbox');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	defaultNetwork: 'hardhat',
	networks: {
		hardhat: {

		},
		eth_mainnet: {
			url: 'https://rpc.ankr.com/eth',
			chainId: 1,
			accounts: [
				process.env.ZKSAFE_Deployer_PK,
				process.env.ETH_PK_0,
			]
		},
		eth_goerli: {
			url: 'https://rpc.ankr.com/eth_goerli',
			chainId: 5,
			accounts: [
				process.env.V2_TEST_2_PK,
				process.env.ETH_PK_0,
			]
		},
		polygon: {
			url: 'https://matic-mainnet.chainstacklabs.com',
			chainId: 137,
			accounts: [
				process.env.V2_TEST_PK,
				process.env.ETH_PK_0,
			]
		},
		bsc: {
			url: 'https://bsc.nodereal.io',
			chainId: 56,
			accounts: [
				process.env.ETH_PK_0,
				process.env.ZKSAFE_Deployer_PK,
			]
		},
		op_mainnet: {
			url: 'https://mainnet.optimism.io/',
			chainId: 10,
			accounts: [
				process.env.V2_TEST_2_PK,
				process.env.ETH_PK_0,
				process.env.ZKSAFE_Deployer_PK,
			]
		},
		arbitrumOne: {
			url: 'https://arb1.arbitrum.io/rpc',
			chainId: 42161,
			accounts: [
				process.env.ETH_PK_0,
				process.env.ETH_PK_1,
			]
		},
		scroll_alpha: {
			url: 'https://alpha-rpc.scroll.io/l2',
			chainId: 534353,
			accounts: [
				process.env.ETH_PK_0,
			]
		},
		goerli: {
			url: 'https://ethereum-goerli.publicnode.com',
			chainId: 5,
			accounts: [
				process.env.ETH_PK_0,
			]
		},
	},
	solidity: {
		compilers: [
			{
				version: '0.8.18',
				settings: {
					optimizer: {
						enabled: true,
						runs: 200
					}
				}
			},
			{
				version: '0.6.12',
				settings: {
					optimizer: {
						enabled: true,
						runs: 200
					}
				}
			},
			{
				version: '0.7.6',
				settings: {
					optimizer: {
						enabled: true,
						runs: 200
					}
				}
			}
		]
	},
	etherscan: {
		apiKey: {
			eth_mainnet: process.env.Etherscan_API_KEY,
			op_mainnet: process.env.Opscan_API_KEY,
			arbitrumOne: process.env.Arbiscan_API_KEY,
			polygon: process.env.Polygonscan_API_KEY,
			bsc: process.env.Bscscan_API_KEY,
		},
		customChains: [
			{
				network: 'eth_mainnet',
				chainId: 1,
				urls: {
					apiURL: 'https://api.etherscan.com/api',
					browserURL: 'https://etherscan.io'
				}
			},
			{
				network: 'op_mainnet',
				chainId: 10,
				urls: {
					apiURL: 'https://api-optimistic.etherscan.io/api',
					browserURL: 'https://optimistic.etherscan.io'
				}
			}
		]
	},
	mocha: {
		timeout: 100000000
	}
};
