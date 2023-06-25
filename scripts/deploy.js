const hre = require('hardhat')
const { BigNumber } = require('ethers')

// 2023-6-7
// bundler deployed: 0x7c801fc1840CDE461450Cda1815cd2FF9A8524aE
// subBundler deployed: 0xd6322a2842b0818505Fd810179AC401c461E1397

async function main() {
	const accounts = await hre.ethers.getSigners()
	const signer = accounts[0]
	console.log('deployer:', signer.address)

	const provider = signer.provider
	const chainId = (await provider.getNetwork()).chainId
	console.log('chainId:', chainId)

	const Bundler = await ethers.getContractFactory('Bundler', signer)
	let bundler = await Bundler.deploy()
	await bundler.deployed()
	console.log('bundler deployed:', bundler.address)

	const SubBundler = await ethers.getContractFactory('SubBundler', signer)
	let subBundler = SubBundler.attach(await bundler.subBundler())
	console.log('subBundler deployed:', subBundler.address)

	// await signer.sendTransaction({ to: subBundler.address, value: m(1, 18) })
	// console.log('send ETH to subBundler')
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
