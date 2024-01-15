const util = require('util')
const { ethers } = require('hardhat')
const utils = ethers.utils
const { m, d, b, n, s, ETH_ADDRESS, balanceStr, convertToHex } = require('../../test/help/BigNumberHelp')

async function main() {
	const accounts = await hre.ethers.getSigners()
	const provider = accounts[0].provider
	let signer = accounts[0]
	console.log('signer:', signer.address)

	const ERC721Insc = await ethers.getContractFactory('ERC721Insc')
	const erc721Insc = await ERC721Insc.deploy('ERC721-Insc', 'deploy', 'Insc', 21000*1000, 1000)
	await erc721Insc.deployed()
	console.log('erc721Insc deployed:', erc721Insc.address)

	// console.log('name:', await erc721Insc.name())
	// console.log('symbol:', await erc721Insc.symbol())
	// console.log('')
	// console.log('p:', utils.toUtf8String(await erc721Insc.deployInfo('p')))
	// console.log('op:', utils.toUtf8String(await erc721Insc.deployInfo('op')))
	// console.log('tick:', utils.toUtf8String(await erc721Insc.deployInfo('tick')))
	// console.log('max:', parseInt(await erc721Insc.deployInfo('max')))
	// console.log('lim:', parseInt(await erc721Insc.deployInfo('lim')))

	const insc = convertToHex('{"p":"ERC721-Insc","op":"mint","tick":"Insc","amt":"1000"}')
	await erc721Insc.inscribe(accounts[0].address, insc)
	console.log('minted')
    await erc721Insc.inscribe(accounts[0].address, insc)
	console.log('minted')

	// const ERC20Insc = await ethers.getContractFactory('ERC20Insc')
	// const erc20Insc = await ERC20Insc.deploy(erc721Insc.address)
	// await erc20Insc.deployed()
	// console.log('erc20Insc deployed:', erc20Insc.address)

	// await hre.run("verify:verify", {
	// 	address: '0x6Ce5ee9F58B2e4A6f623921178C2989e0c575f49',
	// 	constructorArguments: [
	// 		'ERC721-Insc', 'deploy', 'Insc', 21000*1000, 1000
	// 	],
	// })
	// await hre.run("verify:verify", {
	// 	address: '0x1b708d4aaeb4Bb2Acb190BDd7aEaf66eC42E35B6',
	// 	constructorArguments: [
	// 		'0x6Ce5ee9F58B2e4A6f623921178C2989e0c575f49'
	// 	],
	// })
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
