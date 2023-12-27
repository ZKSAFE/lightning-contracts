const hre = require('hardhat')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('../../test/help/BigNumberHelp')

const factoryAddr = '0xb58ed778643bec922966334fea7a37834338fede'
const bundlerManagerAddr = '0x694dD96Ce948Fa6eE48BfA4B0e97B2aB96568B27'
const bundlerAddr = '0x4B394eCf83dB82250dd5D988dF413A5a9092dd2e'
const USDCeAddr = '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
const USDCAddr = '0x0b2c639c533813f4aa9d7837caf62653d097ff85'
const USDTAddr = '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
const DAIAddr = '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'

const userEOAAddr = '0x45828ac68dAD35cCd378A29e7C0b57E6174d5af8'
const keystore = '{"address":"45828ac68dad35ccd378a29e...'
const password = '...'
const userPrivatekey = '...'
const userWalletAddr = '0x7522A3A1363DD2ed37Fc54f1E257aafE32B37A79'
const receiver = '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D'

function decrypt() {
    ethers.Wallet.fromEncryptedJson(keystore, password, progressCallback).then(function(wallet) {
        console.log('wallet:', wallet)
        console.log('privateKey:', wallet.privateKey)
    })

    function progressCallback(progress) {
        console.log("Decrypting: " + parseInt(progress * 100) + "% complete")
    }
}

var chainId

async function main() {
    
    const accounts = await hre.ethers.getSigners()
	const signer = accounts[0]
	console.log('signer:', signer.address)
    
	let provider = signer.provider
	chainId = (await provider.getNetwork()).chainId
	console.log('chainId:', chainId)
    
    const userSigner = new ethers.Wallet(userPrivatekey, provider)

	const BundlerManager = await ethers.getContractFactory('BundlerManager', signer)
    let bundlerManager = BundlerManager.attach(bundlerManagerAddr)

	const Bundler = await ethers.getContractFactory('Bundler', signer)
	let bundler = Bundler.attach(bundlerAddr)

	const WalletFactory = await ethers.getContractFactory('WalletFactory', signer)
	let factory = WalletFactory.attach(factoryAddr)

    const SmartWallet = await ethers.getContractFactory('SmartWalletV2')
    let userWallet = SmartWallet.attach(userWalletAddr)

    const ERC20 = await ethers.getContractFactory('MockERC20')
    let weth = ERC20.attach(WETH_ADDRESS)
    let usdt = ERC20.attach(USDTAddr)
    let usdc = ERC20.attach(USDCAddr)
    let usdce = ERC20.attach(USDCeAddr)

	//call
    let callArr = []
    let to = '0x'
    let value = 0
    let data = '0x'
    let amount

    amount = await weth.balanceOf(userWalletAddr)
    console.log('user WETH:', amount)
    to = WETH_ADDRESS
    value = 0
    data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', [receiver, amount])
    callArr.push({ to, value, data })

    amount = await usdt.balanceOf(userWalletAddr)
    console.log('user USDT:', d(amount, 6))
    to = USDTAddr
    value = 0
    data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', [receiver, amount])
    callArr.push({ to, value, data })

    amount = await usdc.balanceOf(userWalletAddr)
    console.log('user USDC:', d(amount, 6))
    to = USDCAddr
    value = 0
    data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', [receiver, amount])
    callArr.push({ to, value, data })

    amount = await usdt.balanceOf(bundlerAddr)
    console.log('bundler USDT:', d(amount, 6))
    to = bundlerAddr
    value = 0
    data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', [receiver, amount])
    data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [USDTAddr, 0, data])
    callArr.push({ to, value, data })

    amount = await usdc.balanceOf(bundlerAddr)
    console.log('bundler USDC:', d(amount, 6))
    to = bundlerAddr
    value = 0
    data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', [receiver, amount])
    data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [USDCAddr, 0, data])
    callArr.push({ to, value, data })

    amount = await usdce.balanceOf(bundlerAddr)
    console.log('bundler USDCe:', d(amount, 6))
    to = bundlerAddr
    value = 0
    data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', [receiver, amount])
    data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [USDCeAddr, 0, data])
    callArr.push({ to, value, data })

    let p = await atomSign(userSigner, userWalletAddr, callArr)
    let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallBytes, p.deadline, p.signature])

    await bundler.executeOperation(userWalletAddr, calldata)
    // await bundler.callStatic.executeOperation(userWalletAddr, calldata)
    console.log('done')
}


async function atomSign(signer, fromWallet, callArr) {
    let atomCallBytes = convertCallArrToCallBytes(callArr)

    let deadline = parseInt(Date.now() / 1000) + 60000;
    let SmartWallet = await ethers.getContractFactory('SmartWallet')
    let wallet = SmartWallet.attach(fromWallet)
    let valid = await wallet.valid()

    let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallBytes, deadline, '0x'])
    calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])
    console.log('calldata without signature:', calldata)
    let hash = utils.keccak256(calldata)
    console.log('hash:', hash)

    let signature = await signer.signMessage(utils.arrayify(hash))

    return { atomCallBytes, deadline, chainId, fromWallet, valid, signature }
}


function convertCallArrToCallBytes(callArr) {
    let atomCallBytes = '0x'
    for (let i=0; i<callArr.length; i++) {
        let to = callArr[i].to
        let value = callArr[i].value
        let data = callArr[i].data
        
        let len = utils.arrayify(data).length
        atomCallBytes = utils.hexConcat([atomCallBytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
    }
    return atomCallBytes
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
