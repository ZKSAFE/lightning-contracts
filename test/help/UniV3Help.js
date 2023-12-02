const util = require('util')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./BigNumberHelp')
const { ethers } = require('hardhat')
const { computePoolAddress, Pool, Route, SwapRouter, Trade } = require('@uniswap/v3-sdk')
const { SupportedChainId, Token, CurrencyAmount, Percent } = require('@uniswap/sdk-core')
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')

//mainnet
const ChainId = SupportedChainId.MAINNET
const POOL_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

const WETH_TOKEN = new Token(ChainId, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether')


async function swapCallParameters({ routerPools, amountIn, amountOut, tradeType, recipient }) {
    let pools = await getPools(routerPools)

    let tokenIn = routerPools[0].tokenIn
    let tokenOut = routerPools[routerPools.length-1].tokenOut

    //swap
    let uncheckedTrade = Trade.createUncheckedTrade({
        route: new Route(
            pools,
            tokenIn,
            tokenOut
        ),
        inputAmount: CurrencyAmount.fromRawAmount(
            tokenIn,
            amountIn
        ),
        outputAmount: CurrencyAmount.fromRawAmount(
            tokenOut,
            amountOut
        ),
        tradeType,
    })

    let options = {
        slippageTolerance: new Percent(10, 10000),
        deadline: Math.floor(Date.now() / 1000) + 600,
        recipient
    }
    let methodParameters = SwapRouter.swapCallParameters([uncheckedTrade], options)
    return methodParameters
}


async function getPools(routerPools) {
    let pools = []
    for (let poolInfo of routerPools) {
        let { tokenIn, tokenOut, fee } = poolInfo

        let currentPoolAddress = computePoolAddress({
            factoryAddress: POOL_FACTORY_ADDRESS,
            tokenIn: tokenIn.isNative ? WETH_TOKEN : tokenIn,
            tokenOut: tokenOut.isNative ? WETH_TOKEN : tokenOut,
            fee,
        })

        let poolContract = new ethers.Contract(
            currentPoolAddress,
            IUniswapV3PoolABI.abi,
            provider
        )

        let [liquidity, slot0] =
            await Promise.all([
                poolContract.liquidity(),
                poolContract.slot0(),
            ])

        let pool = new Pool(
            tokenIn.isNative ? WETH_TOKEN : tokenIn,
            tokenOut.isNative ? WETH_TOKEN : tokenOut,
            fee,
            slot0[0].toString(),
            liquidity.toString(),
            slot0[1]
        )
        pools.push(pool)
    }
    return pools
}


exports.swapCallParameters = swapCallParameters