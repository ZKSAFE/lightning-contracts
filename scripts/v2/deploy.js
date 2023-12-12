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

	let getGasPrice = await provider.getGasPrice()
	console.log('getGasPrice:', getGasPrice)
	getGasPrice = getGasPrice.add(getGasPrice.div(2))

	const chainInfo = chainInfos[chainId]
	console.log(chainInfo)

	const needUSD = 1

	//pay $1 to activate AdminWallet
	const ERC20 = await ethers.getContractFactory('MockERC20')
	let usd = ERC20.attach(Object.values(chainInfo.USDAddrs)[0])
	let usdBalance = await usd.balanceOf(signer.address)
	let decimals = await usd.decimals()
	console.log(await usd.symbol() + ' balance:', d(usdBalance, decimals))
	if (usdBalance.lt(m(needUSD, decimals))) {
		console.log("need $" + needUSD + ' of ' + Object.keys(chainInfo.USDAddrs)[0])
		return
	}

	const BundlerManager = await ethers.getContractFactory('BundlerManager')
	let bundlerManager = await BundlerManager.deploy()
	await bundlerManager.deployed()
	console.log('BundlerManagerAddr:', bundlerManager.address)

	const WalletFactory = await ethers.getContractFactory('WalletFactory')
	let factory = await WalletFactory.deploy(Object.values(chainInfo.USDAddrs), needUSD)
	await factory.deployed()
	console.log('WalletFactoryAddr:', factory.address)

	const QuoterV3 = await ethers.getContractFactory('QuoterV3')
	let quoterV3 = await QuoterV3.deploy(chainInfo.PoolFactoryAddr, chainInfo.WETHAddr)
	await quoterV3.deployed()
	console.log('QuoterV3Addr:', quoterV3.address)

	const Multicall = await ethers.getContractFactory('Multicall')
	let multicall = await Multicall.deploy()
	await multicall.deployed()
	console.log('MulticallAddr:', multicall.address)

	const Bundler = await ethers.getContractFactory('Bundler')
	let bundler = Bundler.attach(await bundlerManager.bundler())
	console.log('BundlerAddr:', bundler.address)

	console.log('AdminUUID:', chainInfo.AdminUUID)
	let uuidBytes32 = uuidToBytes32(chainInfo.AdminUUID)
	let predictedAddr = await factory.computeWalletAddr(uuidBytes32)
	await (await usd.transfer(predictedAddr, m(needUSD, decimals))).wait()
	console.log('deposit $1 to predictedAddr:', predictedAddr)

	let tx = await (await factory.createWallet(
		uuidBytes32, signer.address, bundler.address)).wait()
	let walletAddr
	for (let event of tx.events) {
		if (event.address == factory.address) {
			if (event.eventSignature == 'WalletCreated(address,address,address)') {
				walletAddr = event.args[0]
				break
			}
		}
	}
	console.log('AdminWalletAddr:', walletAddr)
	
	let callArr = []
	let to = '0x'
	let value = 0
	let data = '0x'
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
