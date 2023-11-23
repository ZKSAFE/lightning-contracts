const util = require('util')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./BigNumberHelp')
const { ethers } = require('hardhat')
const { computePoolAddress, FeeAmount, Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade } = require('@uniswap/v3-sdk')
const { SupportedChainId, Token, Ether, Currency, CurrencyAmount, Percent, TradeType } = require('@uniswap/sdk-core')
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')

let ChainId, POOL_FACTORY_ADDRESS, SWAP_ROUTER_ADDRESS, WETH_ADDRESS, USDC_ADDRESS, USDT_ADDRESS, DAI_ADDRESS
let NATIVE_ETH, WETH_TOKEN, USDC_TOKEN, USDT_TOKEN, DAI_TOKEN

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
const MAX_UINT256 = b('115792089237316195423570985008687907853269984665640564039457584007913129639935')

let QuoterV3
let quoterV3

async function setup(addrsObj) {
    ChainId = addrsObj.ChainId
    POOL_FACTORY_ADDRESS = addrsObj.POOL_FACTORY_ADDRESS
    SWAP_ROUTER_ADDRESS = addrsObj.SWAP_ROUTER_ADDRESS
    WETH_ADDRESS = addrsObj.WETH_ADDRESS
    USDC_ADDRESS = addrsObj.USDC_ADDRESS
    USDT_ADDRESS = addrsObj.USDT_ADDRESS
    DAI_ADDRESS = addrsObj.DAI_ADDRESS

    NATIVE_ETH = new Ether(ChainId)
    WETH_TOKEN = new Token(ChainId, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether')
    USDC_TOKEN = new Token(ChainId, USDC_ADDRESS, 6, 'USDC', 'USD Coin')
    USDT_TOKEN = new Token(ChainId, USDT_ADDRESS, 6, 'USDT', 'Tether USD')
    DAI_TOKEN = new Token(ChainId, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin')

    QuoterV3 = await ethers.getContractFactory('QuoterV3')
    quoterV3 = QuoterV3.attach(addrsObj.QuoterV3Addr)
        
}


function getRoutersInfo_USD(tokenIn, tokenOut) {
    let routerPoolsArr = []
    let feeArr = [FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.LOWEST]

    let tokenUSDs = [USDC_TOKEN, USDT_TOKEN, DAI_TOKEN]
    let tokenUSDAddrs = [USDC_TOKEN.address, USDT_TOKEN.address, DAI_TOKEN.address]
    let indexIn = tokenUSDAddrs.indexOf(tokenIn.address)
    let indexOut = tokenUSDAddrs.indexOf(tokenOut.address)

    if (indexIn == -1 && indexOut >= 0) { //tokenOut is USD

        tokenUSDs.splice(indexOut, 1)
        for (let tokenUSD of tokenUSDs) {
            //TOKEN -> USD
            for (let fee0 of feeArr) {
                //USD -> USD
                routerPoolsArr.push([
                    { tokenIn: tokenIn, tokenOut: tokenUSD, fee: fee0 },
                    { tokenIn: tokenUSD, tokenOut: tokenOut, fee: FeeAmount.LOWEST }
                ])
            }
        }

    } else if (indexIn >= 0 && indexOut == -1) { //tokenIn is USD

        tokenUSDs.splice(indexIn, 1)
        for (let tokenUSD of tokenUSDs) {
            //USD -> USD
            for (let fee1 of feeArr) {
                //USD -> TOKEN
                routerPoolsArr.push([
                    { tokenIn: tokenIn, tokenOut: tokenUSD, fee: FeeAmount.LOWEST },
                    { tokenIn: tokenUSD, tokenOut: tokenOut, fee: fee1 }
                ])
            }
        }

    } else {
        throw new Error('only one of tokenIn and tokenOut MUST be stable coin')
    }

    return routerPoolsArr
}


function getRoutersInfo_WETH(tokenIn, tokenOut) {
    let routerPoolsArr = []

    let feeArr = [FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.LOWEST]
    for (let fee0 of feeArr) {
        //USDC -> WETH
        for (let fee1 of feeArr) {
            //WETH -> PEPE
            routerPoolsArr.push([
                { tokenIn: tokenIn, tokenOut: WETH_TOKEN, fee: fee0 },
                { tokenIn: WETH_TOKEN, tokenOut: tokenOut, fee: fee1 }
            ])
        }
    }
    return routerPoolsArr
}


function getRoutersInfo(tokenIn, tokenOut) {
    let routerPoolsArr = []

    let feeArr = [FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.LOWEST]
    for (let fee of feeArr) {
        routerPoolsArr.push([
            { tokenIn, tokenOut, fee }
        ])
    }
    return routerPoolsArr
}


function getCallDatasForAmountOut(amountIn, routerPoolsArr) {
    let callDatas = []
    for (let i = 0; i < routerPoolsArr.length; i++) {
        let routerPools = routerPoolsArr[i]

        let path = []
        for (let i = 0; i < routerPools.length; i++) {
            let pool = routerPools[i]
            if (i == 0) {
                path.push(pool.tokenIn.isNative ? WETH_ADDRESS : pool.tokenIn.address)
            }
            path.push(utils.hexZeroPad(pool.fee, 3))
            path.push(pool.tokenOut.isNative ? WETH_ADDRESS : pool.tokenOut.address)
        }
        path = utils.hexConcat(path)

        let callData = QuoterV3.interface.encodeFunctionData('quoteExactInput(bytes,uint256)', [path, amountIn])
        callDatas.push(callData)
    }
    return callDatas
}


function getCallDatasForAmountIn(routerPoolsArr, amountOut) {
    let callDatas = []
    for (let i = 0; i < routerPoolsArr.length; i++) {
        let routerPools = routerPoolsArr[i]

        let path = []
        for (let i = routerPools.length - 1; i >= 0; i--) {
            let pool = routerPools[i]
            if (i == routerPools.length - 1) {
                path.push(pool.tokenOut.isNative ? WETH_ADDRESS : pool.tokenOut.address)
            }
            path.push(utils.hexZeroPad(pool.fee, 3))
            path.push(pool.tokenIn.isNative ? WETH_ADDRESS : pool.tokenIn.address)
        }
        path = utils.hexConcat(path)

        let callData = QuoterV3.interface.encodeFunctionData('quoteExactOutput(bytes,uint256)', [path, amountOut])
        callDatas.push(callData)
    }
    return callDatas
}


async function getBestOfAmountOut(routerPoolsArr, amountIn) {
    let callDatas = getCallDatasForAmountOut(amountIn, routerPoolsArr)
    let amountOuts = await quoterV3.callStatic.aggregate(callDatas, 200000)
    let best = getHighestAmountOut(routerPoolsArr, amountOuts)
    return best
}


async function getBestOfAmountIn(routerPoolsArr, amountOut) {
    let callDatas = getCallDatasForAmountIn(routerPoolsArr, amountOut)
    let amountIns = await quoterV3.callStatic.aggregate(callDatas, 200000)
    let best = getLowestAmountIn(routerPoolsArr, amountIns)
    return best
}


function getHighestAmountOut(routerPoolsArr, amountOuts) {
    let best = null
    for (let i = 0; i < routerPoolsArr.length; i++) {
        let routerPools = routerPoolsArr[i]
        let amountOut = amountOuts[i]

        let routerStr = 'amountOut:' + s(amountOut) + ' router:'
        for (let pool of routerPools) {
            routerStr += pool.tokenIn.symbol + '-' + pool.fee + '-' + pool.tokenOut.symbol + ' '
        }

        console.log(routerStr)
        if (s(amountOut) == '0') continue

        if (best) {
            if (amountOut.gt(best.amountOut)) {
                best = { routerPools, amountOut, routerStr }
            }
        } else {
            best = { routerPools, amountOut, routerStr }
        }
    }
    if (best == null) {
        best = { routerPools: [], amountOut: b(0), routerStr: 'No routers' }
    }
    return best
}


function getLowestAmountIn(routerPoolsArr, amountIns) {
    let best = null
    for (let i = 0; i < routerPoolsArr.length; i++) {
        let routerPools = routerPoolsArr[i]
        let amountIn = amountIns[i]

        let routerStr = 'amountIn:' + s(amountIn) + ' router:'
        for (let pool of routerPools) {
            routerStr += pool.tokenIn.symbol + '-' + pool.fee + '-' + pool.tokenOut.symbol + ' '
        }

        console.log(routerStr)
        if (s(amountIn) == '0') continue

        if (best) {
            if (amountIn.lt(best.amountIn)) {
                best = { routerPools, amountIn, routerStr }
            }
        } else {
            best = { routerPools, amountIn, routerStr }
        }
    }
    if (best == null) {
        best = { routerPools: [], amountOut: b(0), routerStr: 'No routers' }
    }
    return best
}


exports.setup = setup
exports.getRoutersInfo_USD = getRoutersInfo_USD
exports.getRoutersInfo_WETH = getRoutersInfo_WETH
exports.getRoutersInfo = getRoutersInfo
exports.getBestOfAmountOut = getBestOfAmountOut
exports.getBestOfAmountIn = getBestOfAmountIn