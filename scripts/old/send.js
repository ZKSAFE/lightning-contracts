const hre = require('hardhat')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('../test/help/BigNumberHelp')

const MAX_UINT256 = b('115792089237316195423570985008687907853269984665640564039457584007913129639935')

//2023-9-3 goerli
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const USDC_CONTRACT_ADDRESS = '0x07865c6E87B9F70255377e024ace6630C1Eaa37F'

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

    let tx = await usdc.transfer('0x9718d3981bf6cd5b1da3b3e72abfb25390dc6742', m(10, 6))
    console.log('done tx.hash=', tx.hash)
}


main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
