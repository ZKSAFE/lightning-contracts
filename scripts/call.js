const hre = require('hardhat')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('../test/help/BigNumberHelp')

const MAX_UINT256 = b('115792089237316195423570985008687907853269984665640564039457584007913129639935')

//2023-9-3 goerli
// const bundlerManagerAddr = '0xee428Df259DBAfb297ae35675Ac59eD988B5eA0D'
// const bundlerAddr = '0x8C1C64E6e5a5e31A9B6bd6728c2ad37838a0D301'
// const factoryAddr = '0xBb77D8caB687A32fA09388807Db4C439DC281f10'
// const walletAddr = '0x34aFD2d2C4d81B2f60e2399D6580DeAa8Cc5781B'

const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
// const USDC_CONTRACT_ADDRESS = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'

// 2023-10-9 op
const bundlerManagerAddr = '0x694dD96Ce948Fa6eE48BfA4B0e97B2aB96568B27'
const bundlerAddr = '0x4B394eCf83dB82250dd5D988dF413A5a9092dd2e'
const factoryAddr = '0x0554CE0BA18f6b2744973476838dB12FaE77bF94'
const walletAddr = '0xeACf5c999BEf71d4e14f3948E83151260Ff3B5C6'
const USDT_CONTRACT_ADDRESS = '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'


var signer
var chainId

async function main() {
    const accounts = await hre.ethers.getSigners()
    signer = accounts[0]
    console.log('signer:', signer.address)

    const provider = signer.provider
    chainId = (await provider.getNetwork()).chainId
    console.log('chainId:', chainId)

    //attach
    const ERC20 = await ethers.getContractFactory('MockERC20')
    let usdt = ERC20.attach(USDT_CONTRACT_ADDRESS)

    const BundlerManager = await ethers.getContractFactory('BundlerManager')
    let bundlerManager = BundlerManager.attach(bundlerManagerAddr)

    const Bundler = await ethers.getContractFactory('Bundler')
    let bundler = Bundler.attach(bundlerAddr)

    const WalletFactory = await ethers.getContractFactory('WalletFactory')
    let factory = WalletFactory.attach(factoryAddr)

    const SmartWallet = await ethers.getContractFactory('SmartWallet')
    let wallet = SmartWallet.attach(walletAddr)

    //call
    let callArr = []
    let to = '0x'
    let value = 0
    let data = '0x'

    to = bundler.address
    value = 0
    data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', ['0x82D5d55f7BffD3eEc52ab0764F56c7A588799d04', m(15, 6)])
    data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [USDT_CONTRACT_ADDRESS, 0, data])
    callArr.push({ to, value, data })

    let p = await atomSign(accounts[0], wallet.address, callArr)
    let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallBytes, p.deadline, p.signature])

    await bundler.executeOperation(wallet.address, calldata)
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
