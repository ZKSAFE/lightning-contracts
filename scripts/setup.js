const hre = require('hardhat')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('../test/help/BigNumberHelp')

const MAX_UINT256 = b('115792089237316195423570985008687907853269984665640564039457584007913129639935')

//2023-9-3 goerli
const bundlerManagerAddr = '0xee428Df259DBAfb297ae35675Ac59eD988B5eA0D'
const bundlerAddr = '0x8C1C64E6e5a5e31A9B6bd6728c2ad37838a0D301'
const factoryAddr = '0xBb77D8caB687A32fA09388807Db4C439DC281f10'
const walletAddr = '0x34aFD2d2C4d81B2f60e2399D6580DeAa8Cc5781B'

const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

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
    let usdc = ERC20.attach(USDC_CONTRACT_ADDRESS)

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
    data = ERC20.interface.encodeFunctionData('approve(address,uint256)', [SWAP_ROUTER_ADDRESS, MAX_UINT256])
    data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [usdc.address, 0, data])
    callArr.push({ to, value, data })

    let p = await atomSign(accounts[0], wallet.address, callArr)
    let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallBytes, p.deadline, p.signature])

    await bundler.executeOperation(wallet.address, calldata)
    console.log('approve done')
}


async function atomSign(signer, fromWallet, callArr) {
    let atomCallBytes = convertCallArrToCallBytes(callArr)

    let deadline = parseInt(Date.now() / 1000) + 600;
    let SmartWallet = await ethers.getContractFactory('SmartWallet')
    let wallet = SmartWallet.attach(fromWallet)
    let valid = await wallet.valid()

    let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallBytes, deadline, '0x'])
    calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

    let hash = utils.keccak256(calldata)
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