const hre = require('hardhat')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('../test/help/BigNumberHelp')

//op
const POOL_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'

// 2023-10-9 op
const bundlerManagerAddr = '0x694dD96Ce948Fa6eE48BfA4B0e97B2aB96568B27'
const bundlerAddr = '0x4B394eCf83dB82250dd5D988dF413A5a9092dd2e'
const USDCAddr = '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
const USDTAddr = '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
const DAIAddr = '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'

// 2023-11-10 op
const factoryAddr = '0x22FbF2d55717B1Ddb6D5feaE90cDD2A3a7C99e41'
const walletAddr = '0xFf335456884d30A015b684F4147e8330eA3b1D35'


var provider
var factory

async function main() {
	const accounts = await hre.ethers.getSigners()
	const signer = accounts[0]
	console.log('deployer:', signer.address)

	provider = signer.provider
	const chainId = (await provider.getNetwork()).chainId
	console.log('chainId:', chainId)

	const BundlerManager = await ethers.getContractFactory('BundlerManager')
    let bundlerManager = BundlerManager.attach(bundlerManagerAddr)
	console.log('const bundlerManagerAddr =', bundlerManager.address)

	const Bundler = await ethers.getContractFactory('Bundler')
	let bundler = Bundler.attach(await bundlerManager.bundler())
	console.log('const bundlerAddr =', bundler.address)

	const WalletFactory = await ethers.getContractFactory('WalletFactory')
	factory = WalletFactory.attach(factoryAddr)
	console.log('const factoryAddr =', factory.address)

    let userPrivatekey = '0x884c28...'
    let userEOAWalletAddr = '0xE1aeCD07E144C919389071755Dd6416d4D45A59a'
    let userSmartWalletAddr = '0x1FaEbEF5d8d1265E6104717F1cF64c80EDDd3C8e'
    const userSigner = new ethers.Wallet(userPrivatekey, provider)

	//读取nonce，用于计算创建后的钱包地址
	let nonce = await factory.nonceOf(userEOAWalletAddr)
	nonce++
	let predictedAddr = await factory.computeWalletAddr(userEOAWalletAddr, nonce)

	console.log('userSmartWalletAddr:', userSmartWalletAddr)
	console.log('predictedAddr:', predictedAddr, 'nonce:', nonce)




    const SmartWallet = await ethers.getContractFactory('SmartWallet')

    let atomSignParamsArr = []

    //wallet0: createWallet
    let callArr = []
    let to = '0x'
    let value = 0
    let data = '0x'

    to = factory.address
    value = 0
    data = WalletFactory.interface.encodeFunctionData('createWallet(address,address)',
        [userEOAWalletAddr, bundler.address])
    callArr.push({ to, value, data })

    let atomSignParams = await atomSign(accounts[0], walletAddr, callArr)
    atomSignParamsArr.push(atomSignParams)

    //wallet1: transfer
    callArr = []
    to = '0x'
    value = 0
    data = '0x'

    to = USDCAddr
    value = 0
    const ERC = await ethers.getContractFactory('MockERC20')
    data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[0].address, m(0.1, 6)])
    callArr.push({ to, value, data })


    atomSignParams = await atomSign(userSigner, userSmartWalletAddr, callArr)
    atomSignParamsArr.push(atomSignParams)


    let bundleDataArr = []
    for (let p of atomSignParamsArr) {
        let atomSignData = SmartWallet.interface.encodeFunctionData('atomSignCall',
            [p.atomCallbytes, p.deadline, p.signature])

        let bundleData = Bundler.interface.encodeFunctionData('executeOperation', [p.fromWallet, atomSignData])
        bundleDataArr.push(bundleData)
    }

    let estimateGas = await bundlerManager.estimateGas.bundle(bundleDataArr)
    await bundlerManager.bundle(bundleDataArr, { gasLimit: '8000000' })
    console.log('bundle done gasCost:', estimateGas)
}


async function atomSign(signer, fromWallet, callArr) {
    let atomCallbytes = '0x'
    for (let i=0; i<callArr.length; i++) {
        let to = callArr[i].to
        let value = callArr[i].value
        let data = callArr[i].data
        
        let len = utils.arrayify(data).length
        atomCallbytes = utils.hexConcat([atomCallbytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
    }

    let deadline = parseInt(Date.now() / 1000) + 600;
    let chainId = (await provider.getNetwork()).chainId
    let SmartWallet = await ethers.getContractFactory('SmartWallet')
    let hasWallet =  await factory.wallets(fromWallet)
    let valid = hasWallet ? await SmartWallet.attach(fromWallet).valid() : 1

    let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallbytes, deadline, '0x'])
    calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

    let hash = utils.keccak256(calldata)
    let signature = await signer.signMessage(utils.arrayify(hash))

    return { atomCallbytes, deadline, chainId, fromWallet, valid, signature }
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
