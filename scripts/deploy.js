const hre = require('hardhat')
const { BigNumber } = require('ethers')

// 2023-6-7 op
// bundler deployed: 0x7c801fc1840CDE461450Cda1815cd2FF9A8524aE
// subBundler deployed: 0xd6322a2842b0818505Fd810179AC401c461E1397

// 2023-7-31 goerli
// multicall deployed: 0x9e9835e736199C72fc481D13339F3817B9cC8dAD

// 2023-9-3 goerli
// deployer: 0x6476ee16BdAdD3623A5dc2566bcb534cAaA6cD61
// const bundlerManagerAddr = 0xee428Df259DBAfb297ae35675Ac59eD988B5eA0D
// const bundlerAddr = 0x8C1C64E6e5a5e31A9B6bd6728c2ad37838a0D301
// const factoryAddr = 0xBb77D8caB687A32fA09388807Db4C439DC281f10
// const walletAddr = 0x34aFD2d2C4d81B2f60e2399D6580DeAa8Cc5781B

async function main() {
	const accounts = await hre.ethers.getSigners()
	const signer = accounts[0]
	console.log('deployer:', signer.address)

	const provider = signer.provider
	const chainId = (await provider.getNetwork()).chainId
	console.log('chainId:', chainId)

	// const Multicall = await ethers.getContractFactory('Multicall')
	// let multicall = await Multicall.deploy()
	// await multicall.deployed()
	// console.log('multicall deployed:', multicall.address)

	const BundlerManager = await ethers.getContractFactory('BundlerManager')
	let bundlerManager = await BundlerManager.deploy()
	await bundlerManager.deployed()
	console.log('const bundlerManagerAddr =', bundlerManager.address)

	const Bundler = await ethers.getContractFactory('Bundler')
	let bundler = Bundler.attach(await bundlerManager.bundler())
	console.log('const bundlerAddr =', bundler.address)

	const WalletFactory = await ethers.getContractFactory('WalletFactory')
	let factory = await WalletFactory.deploy()
	await factory.deployed()
	console.log('const factoryAddr =', factory.address)

	const SmartWallet = await ethers.getContractFactory('SmartWallet')
	let tx = await (await factory.createWallet(accounts[0].address, bundler.address)).wait()
	let walletAddr = tx.events[0].args[0]
	wallet = SmartWallet.attach(walletAddr)
	console.log('const walletAddr =', wallet.address)
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
