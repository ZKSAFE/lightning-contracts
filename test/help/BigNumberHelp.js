const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const ETH_ADDRESS = ZERO_ADDRESS
const MAX_UINT256 = ethers.constants.MaxUint256

function m(num, decimals) {
    if (decimals <= 4) {
        return BigNumber.from(parseInt(num)).mul(BigNumber.from(10).pow(decimals))
    }
    return BigNumber.from(parseInt(num * 10000)).mul(BigNumber.from(10).pow(decimals - 4))
}

function d(bn, decimals) {
    return bn.mul(BigNumber.from(10000)).div(BigNumber.from(10).pow(decimals)).toNumber() / 10000
}

function b(num) {
    return BigNumber.from(num)
}

function n(bn) {
    return bn.toNumber()
}

function s(bn) {
    return bn.toString()
}

async function delay(sec) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, sec * 1000);
    })
}

async function balanceStr(userAddr, tokenAddrs) {
    const MockERC20 = await ethers.getContractFactory('MockERC20')
    let accounts = await ethers.getSigners()
    let provider = accounts[0].provider

    if (userAddr == undefined || userAddr == null) {
        userAddr = ZERO_ADDRESS
    }

    let str = ''
    for (let tokenAddr of tokenAddrs) {
        let tokenName, banlance
        if (tokenAddr == ETH_ADDRESS) {
            tokenName = 'ETH'
            banlance = d(await provider.getBalance(userAddr), 18)
        } else {
            token = MockERC20.attach(tokenAddr)
            tokenName = await token.symbol()
            banlance = d(await token.balanceOf(userAddr), await token.decimals())
        }
        str += tokenName + ':' + banlance + ' '
    }
    return str
}

module.exports = { ZERO_ADDRESS, ETH_ADDRESS, MAX_UINT256, m, d, b, n, s, delay, balanceStr }