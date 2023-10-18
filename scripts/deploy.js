const hre = require('hardhat')
const { BigNumber } = require('ethers')
const { m, d, b, n, s } = require('../test/help/BigNumberHelp')

// 2023-6-7 op
// bundler deployed: 0x7c801fc1840CDE461450Cda1815cd2FF9A8524aE
// subBundler deployed: 0xd6322a2842b0818505Fd810179AC401c461E1397

// 2023-7-31 goerli
// multicall deployed: 0x9e9835e736199C72fc481D13339F3817B9cC8dAD

// 2023-9-3 goerli
// deployer: 0x6476ee16BdAdD3623A5dc2566bcb534cAaA6cD61
const bundlerManagerAddr = '0xee428Df259DBAfb297ae35675Ac59eD988B5eA0D'
const bundlerAddr = '0x8C1C64E6e5a5e31A9B6bd6728c2ad37838a0D301'
// const factoryAddr = 0xBb77D8caB687A32fA09388807Db4C439DC281f10
// const walletAddr = 0x34aFD2d2C4d81B2f60e2399D6580DeAa8Cc5781B
const USDCAddr = '0x07865c6e87b9f70255377e024ace6630c1eaa37f'
const DAIAddr = '0x11fe4b6ae13d2a6055c8d9cf65c55bac32b5d844'

// 2023-10-9 op
// deployer: 0x6476ee16BdAdD3623A5dc2566bcb534cAaA6cD61
// multicall deployed: 0x0474d169D5d89f060D3e92861d787F4bE80A71dd
// const bundlerManagerAddr = 0x694dD96Ce948Fa6eE48BfA4B0e97B2aB96568B27
// const bundlerAddr = 0x4B394eCf83dB82250dd5D988dF413A5a9092dd2e
// const factoryAddr = 0x0554CE0BA18f6b2744973476838dB12FaE77bF94
// const walletAddr = 0xeACf5c999BEf71d4e14f3948E83151260Ff3B5C6

// 2023-10-18 goerli
const factoryAddr = '0xc3E408dDF2e03e11890C212D6D976b3fD6B87F9f'
const walletAddr = '0x398Eb1843310C1F5BE0D75BC4856C43a09d6354f'

async function main() {
	const accounts = await hre.ethers.getSigners()
	const signer = accounts[0]
	console.log('deployer:', signer.address)

	const provider = signer.provider
	const chainId = (await provider.getNetwork()).chainId
	console.log('chainId:', chainId)

	const ERC20 = await ethers.getContractFactory('MockERC20')
    let usdc = ERC20.attach(USDCAddr)

	// const Multicall = await ethers.getContractFactory('Multicall')
	// let multicall = await Multicall.deploy()
	// await multicall.deployed()
	// console.log('multicall deployed:', multicall.address)

	// const BundlerManager = await ethers.getContractFactory('BundlerManager')
	// let bundlerManager = await BundlerManager.deploy()
	// await bundlerManager.deployed()
	// console.log('const bundlerManagerAddr =', bundlerManager.address)

	// const Bundler = await ethers.getContractFactory('Bundler')
	// let bundler = Bundler.attach(await bundlerManager.bundler())
	// console.log('const bundlerAddr =', bundler.address)

	const WalletFactory = await ethers.getContractFactory('WalletFactory')
	// let factory = await WalletFactory.deploy([USDCAddr, DAIAddr])
	// await factory.deployed()
	// console.log('const factoryAddr =', factory.address)
	let factory = WalletFactory.attach(factoryAddr)

	//读取nonce，用于计算创建后的钱包地址
	let nonce = await factory.nonceOf(accounts[0].address)
	nonce++
	let predictedAddr = await factory.computeWalletAddr(accounts[0].address, nonce)

	//predictedAddr地址需要有$1才能创建出来
	await (await usdc.transfer(predictedAddr, m(1, 6))).wait()
	console.log('deposit USDC to predictedAddr:', predictedAddr)

	//创建钱包，$1作为激活费划扣给bundlerAddr
	let tx = await (await factory.createWallet(accounts[0].address, bundlerAddr)).wait()
	let walletAddr = tx.events[1].args[0]
	
	//创建完成后 hasWallet=true
	let hasWallet = await factory.wallets(walletAddr)
	console.log('hasWallet:', hasWallet)

	//按理说不会有hasWallet=false的情况，除非卡出块了
	if (hasWallet) {
		const SmartWallet = await ethers.getContractFactory('SmartWallet')
		wallet = SmartWallet.attach(walletAddr)
		console.log('const walletAddr =', wallet.address)
	}

	//2023-10-18 console.log
	// deployer: 0x6476ee16BdAdD3623A5dc2566bcb534cAaA6cD61
	// chainId: 5
	// deposit USDC to predictedAddr: 0xE8dA6ffDA06E1Eb836Bd02FB8c67173c5547Fa0A
	// hasWallet: true
	// const walletAddr = 0xE8dA6ffDA06E1Eb836Bd02FB8c67173c5547Fa0A
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
