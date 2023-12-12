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

	const ERC20 = await ethers.getContractFactory('MockERC20')
	let usd = ERC20.attach(Object.values(chainInfo.USDAddrs)[0])
    let decimals = await usd.decimals()

	const WalletFactory = await ethers.getContractFactory('WalletFactory')
    let factory = WalletFactory.attach(chainInfo.WalletFactoryAddr)
	console.log('WalletFactoryAddr:', factory.address)

    let uuid = new ObjectId('6577d56dece2485118be1332')
	let uuidBytes32 = uuidToBytes32(uuid)
	let predictedAddr = await factory.computeWalletAddr(uuidBytes32)
    console.log('predictedAddr:', predictedAddr)

    const needUSD = 1
    //transfer $1 to activate
	// await (await usd.transfer(predictedAddr, m(needUSD, decimals))).wait()
	// console.log('deposit $1 to predictedAddr:', predictedAddr)

    let usdBalance = await usd.balanceOf(predictedAddr)
	console.log(predictedAddr, await usd.symbol() + ' balance:', d(usdBalance, decimals))
	if (usdBalance.lt(m(needUSD, decimals))) {
		console.log("need $" + needUSD + ' of ' + predictedAddr)
		return
	}

	let tx = await (await factory.createWallet(
		uuidBytes32, signer.address, chainInfo.BundlerAddr)).wait()
	let walletAddr
	for (let event of tx.events) {
		if (event.address == factory.address) {
			if (event.eventSignature == 'WalletCreated(address,address,address)') {
				walletAddr = event.args[0]
				break
			}
		}
	}
	console.log('WalletAddr:', walletAddr)
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
