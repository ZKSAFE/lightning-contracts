const util = require('util')
const { ObjectId } = require('bson')
const hre = require('hardhat')
const { m, d, b, n, s, MAX_UINT256 } = require('../../test/help/BigNumberHelp')
const { uuidToBytes32, encodeAtomCallBytes } = require('../../test/help/AtomSignHelp')
const chainInfos = require('./chainInfos')


async function main() {
	const accounts = await hre.ethers.getSigners()
	const signer = accounts[0]
	console.log('AdminEOAAddr:', signer.address)

	const provider = signer.provider
	const chainId = (await provider.getNetwork()).chainId
	console.log('chainId:', chainId)

	const chainInfo = chainInfos[chainId]
	console.log(chainInfo)

	const guardians = [
		'0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D', 
		'0x46b6F87DeBD8f7607d00Df47C31D2dC6D9999999',
		'0x19f43E8B016a2d38B483aE9be67aF924740ab893',
	]
	const needGuardiansNum = 2
	const Deployer = await ethers.getContractFactory('Deployer')
	let deployer = await Deployer.deploy(guardians, needGuardiansNum)
	console.log('DeployerAddr:', deployer.address)
	await deployer.deployed()

	const QuoterV3 = await ethers.getContractFactory('QuoterV3')
	let quoterV3 = await QuoterV3.deploy(chainInfo.PoolFactoryAddr, chainInfo.WETHAddr)
	await quoterV3.deployed()
	console.log('QuoterV3Addr:', quoterV3.address)

	// const Deployer = await ethers.getContractFactory('Deployer')
	// const deployer = Deployer.attach('0x496e4046d0d6ead8c860fe1f76b8c76a916bee3e')

	console.log('BundlerManagerAddr:', await deployer.bundlerManagerAddr())
	console.log('MulticallAddr:', await deployer.multicallAddr())

	const bundlerAddr = await deployer.bundlerAddr()
	console.log('BundlerAddr:', bundlerAddr)
	const Bundler = await ethers.getContractFactory('Bundler')
	const bundler = Bundler.attach(bundlerAddr)

	const walletFactoryAddr = await deployer.walletFactoryAddr()
	console.log('WalletFactoryAddr:', walletFactoryAddr)
	const WalletFactory = await ethers.getContractFactory('WalletFactory')
	const factory = WalletFactory.attach(walletFactoryAddr)

	const ERC20 = await ethers.getContractFactory('ERC20')

	//deploy admin wallet
	console.log('AdminUUID:', chainInfo.AdminUUID)
	let uuidBytes32 = uuidToBytes32(chainInfo.AdminUUID)
	let predictedAddr = await factory.computeWalletAddr(uuidBytes32)

	let callArr = []
	let to = '0x'
	let value = 0
	let data = '0x'

	to = factory.address
	data = WalletFactory.interface.encodeFunctionData('createWallet(bytes32,address,address)',
		[uuidBytes32, accounts[0].address, bundler.address])
	callArr.push({ to, value, data })

	await bundler.atomCall(encodeAtomCallBytes(callArr))
	console.log('AdminWalletAddr:', predictedAddr)

	//approve
	callArr = []
	to = '0x'
	value = 0
	data = '0x'
	for (let USDAddr of Object.values(chainInfo.USDAddrs)) {
		to = USDAddr
		value = 0
		data = ERC20.interface.encodeFunctionData('approve(address,uint256)', [chainInfo.SwapRouterAddr, MAX_UINT256])
		callArr.push({ to, value, data })
	}
	await bundler.atomCall(encodeAtomCallBytes(callArr))
	console.log('approves done')
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
