const hre = require('hardhat')
const { BigNumber } = require('ethers')

async function main() {
	const accounts = await hre.ethers.getSigners()
	console.log('deployer:', accounts[0].address)

	const Bundler = await ethers.getContractFactory('Bundler')
	let bundler = await Bundler.deploy()
	await bundler.deployed()
	console.log('bundler deployed:', bundler.address)

	const SubBundler = await ethers.getContractFactory('SubBundler')
	let subBundler = SubBundler.attach(await bundler.subBundler())
	console.log('subBundler deployed:', subBundler.address)
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
