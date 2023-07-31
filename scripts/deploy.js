const hre = require('hardhat')
const { BigNumber } = require('ethers')

// 2023-6-7
// bundler deployed: 0x7c801fc1840CDE461450Cda1815cd2FF9A8524aE
// subBundler deployed: 0xd6322a2842b0818505Fd810179AC401c461E1397

// 2023-7-31 goerli
// multicall deployed: 0x9e9835e736199C72fc481D13339F3817B9cC8dAD

async function main() {
	const accounts = await hre.ethers.getSigners()
	const signer = accounts[0]
	console.log('deployer:', signer.address)

	const provider = signer.provider
	const chainId = (await provider.getNetwork()).chainId
	console.log('chainId:', chainId)

	// const Bundler = await ethers.getContractFactory('Bundler')
	// let bundler = await Bundler.deploy()
	// await bundler.deployed()
	// console.log('bundler deployed:', bundler.address)

	// const SubBundler = await ethers.getContractFactory('SubBundler')
	// let subBundler = SubBundler.attach(await bundler.subBundler())
	// console.log('subBundler deployed:', subBundler.address)

	// const WalletFactory = await ethers.getContractFactory('WalletFactory')
	// let factory = await WalletFactory.deploy()
	// await factory.deployed()
	// console.log('factory deployed:', factory.address)

	const Multicall = await ethers.getContractFactory('Multicall')
	let multicall = await Multicall.deploy()
	await multicall.deployed()
	console.log('multicall deployed:', multicall.address)
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
