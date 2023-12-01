const { BigNumber } = require('ethers')


exports.m = function(num, decimals) {
    if (decimals <= 4) {
        return BigNumber.from(parseInt(num)).mul(BigNumber.from(10).pow(decimals))
    }
    return BigNumber.from(parseInt(num * 10000)).mul(BigNumber.from(10).pow(decimals - 4))
}

exports.d = function(bn, decimals) {
    return bn.mul(BigNumber.from(10000)).div(BigNumber.from(10).pow(decimals)).toNumber() / 10000
}

exports.b = function(num) {
    return BigNumber.from(num)
}

exports.n = function(bn) {
    return bn.toNumber()
}

exports.s = function(bn) {
    return bn.toString()
}

exports.delay =async function delay(sec) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, sec * 1000);
    })
}