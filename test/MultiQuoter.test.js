const util = require('util')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const { ethers } = require('hardhat')
const { computePoolAddress, FeeAmount, Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade } = require('@uniswap/v3-sdk')
const { SupportedChainId, Token, Ether, Currency, CurrencyAmount, Percent, TradeType } = require('@uniswap/sdk-core')
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')
const UniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json')

//mainnet
const ChainId = SupportedChainId.MAINNET
const POOL_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
const QUOTER_V2_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const PEPE_ADDRESS = '0x6982508145454ce325ddbe47a25d4ec3d2311933'
const BITCOIN_ADDRESS = '0x72e4f9f808c49a2a61de9c5896298920dc4eeea9'

const NATIVE_ETH = new Ether(ChainId)
const WETH_TOKEN = new Token(ChainId, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether')
const USDC_TOKEN = new Token(ChainId, USDC_ADDRESS, 6, 'USDC', 'USD Coin')
const USDT_TOKEN = new Token(ChainId, USDT_ADDRESS, 6, 'USDT', 'Tether USD')
const PEPE_TOKEN = new Token(ChainId, PEPE_ADDRESS, 18, 'PEPE', 'Pepe')
const BITCOIN_TOKEN = new Token(ChainId, BITCOIN_ADDRESS, 18, 'BITCOIN', 'BITCOIN')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

const MAX_UINT256 = b('115792089237316195423570985008687907853269984665640564039457584007913129639935')


describe('MultiQuoter.test', function () {
    let chainId
    let accounts
    let signer
    let provider
    let ERC20
    let multiQuoter

    before(async function () {
        accounts = await ethers.getSigners()
        signer = accounts[0]
        provider = signer.provider
        chainId = (await provider.getNetwork()).chainId

        console.log('signer', signer.address)
        console.log('chainId', chainId)

        ERC20 = await ethers.getContractFactory('MockERC20', signer)

        const MultiQuoter = await ethers.getContractFactory('MultiQuoter')
        // multiQuoter = await MultiQuoter.deploy(QUOTER_ADDRESS, POOL_FACTORY_ADDRESS)
        // await multiQuoter.deployed()
        multiQuoter = MultiQuoter.attach('0xcb0a9835cdf63c84fe80fcc59d91d7505871c98b')
        console.log('const multiQuoterAddr =', multiQuoter.address)
    })

    it('quote amountOut USDC > WETH > PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountIn = m(10000, 6)

        let { routerPoolAddrsArr, poolConsts, poolImmutables } = getRouters_WETH(tokenIn, tokenOut)
        let poolStates = await multiQuoter.getPoolStates(poolImmutables)
        let routerPoolsArr = getRouterPoolsArr(poolStates, poolConsts, routerPoolAddrsArr)
        let callDatas = getCallDatasForAmountOut(tokenIn, amountIn, routerPoolsArr, tokenOut)
        let amountOuts = await multiQuoter.callStatic.aggregate(callDatas)
        let { routerPools, amountOut } = getHighestAmountOut(routerPoolsArr, amountOuts)

        console.log('best:', s(amountOut), 'routerPools:', util.inspect(routerPools, false, 3, true))
    })

    it('quote amountIn USDC > WETH > PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountOut = m(10000000, 18)

        let { routerPoolAddrsArr, poolConsts, poolImmutables } = getRouters_WETH(tokenIn, tokenOut)
        let poolStates = await multiQuoter.getPoolStates(poolImmutables)
        let routerPoolsArr = getRouterPoolsArr(poolStates, poolConsts, routerPoolAddrsArr)
        let callDatas = getCallDatasForAmountIn(tokenIn, routerPoolsArr, tokenOut, amountOut)
        let amountIns = await multiQuoter.callStatic.aggregate(callDatas)
        let { routerPools, amountIn } = getLowestAmountIn(routerPoolsArr, amountIns)

        console.log('best:', s(amountIn), 'routerPools:', util.inspect(routerPools, false, 3, true))
    })

    it('quote amountOut USDC > ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountIn = m(10000, 6)

        let { routerPoolAddrsArr, poolConsts, poolImmutables } = getRouters(tokenIn, tokenOut)
        let poolStates = await multiQuoter.getPoolStates(poolImmutables)
        let routerPoolsArr = getRouterPoolsArr(poolStates, poolConsts, routerPoolAddrsArr)
        let callDatas = getCallDatasForAmountOut(tokenIn, amountIn, routerPoolsArr, tokenOut)
        let amountOuts = await multiQuoter.callStatic.aggregate(callDatas)
        let { routerPools, amountOut } = getHighestAmountOut(routerPoolsArr, amountOuts)

        console.log('best:', s(amountOut), 'routerPools:', util.inspect(routerPools, false, 3, true))
    })

    it('quote amountIn USDC > ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountOut = m(1, 18)

        let { routerPoolAddrsArr, poolConsts, poolImmutables } = getRouters(tokenIn, tokenOut)
        let poolStates = await multiQuoter.getPoolStates(poolImmutables)
        let routerPoolsArr = getRouterPoolsArr(poolStates, poolConsts, routerPoolAddrsArr)
        let callDatas = getCallDatasForAmountIn(tokenIn, routerPoolsArr, tokenOut, amountOut)
        let amountIns = await multiQuoter.callStatic.aggregate(callDatas)
        let { routerPools, amountIn } = getLowestAmountIn(routerPoolsArr, amountIns)

        console.log('best:', s(amountIn), 'routerPools:', util.inspect(routerPools, false, 3, true))
    })

    it('quote amountOut USDC > ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountIn = m(1, 6)

        let { routerPoolAddrsArr, poolConsts, poolImmutables } = getRouters(tokenIn, tokenOut)
        let poolStates = await multiQuoter.getPoolStates(poolImmutables)
        let routerPoolsArr = getRouterPoolsArr(poolStates, poolConsts, routerPoolAddrsArr)
        let callDatas = getCallDatasForAmountOut(tokenIn, amountIn, routerPoolsArr, tokenOut)
        let amountOuts = await multiQuoter.callStatic.aggregate(callDatas)
        let { routerPools, amountOut } = getHighestAmountOut(routerPoolsArr, amountOuts)

        console.log('best:', s(amountOut), 'routerPools:', util.inspect(routerPools, false, 3, true))
    })

    it('quote amountIn USDC > ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountOut = m(10000000, 18)

        let { routerPoolAddrsArr, poolConsts, poolImmutables } = getRouters(tokenIn, tokenOut)
        let poolStates = await multiQuoter.getPoolStates(poolImmutables)
        let routerPoolsArr = getRouterPoolsArr(poolStates, poolConsts, routerPoolAddrsArr)
        let callDatas = getCallDatasForAmountIn(tokenIn, routerPoolsArr, tokenOut, amountOut)
        let amountIns = await multiQuoter.callStatic.aggregate(callDatas)
        let { routerPools, amountIn } = getLowestAmountIn(routerPoolsArr, amountIns)

        console.log('best:', s(amountIn), 'routerPools:', util.inspect(routerPools, false, 3, true))
    })



    function getRouters_WETH(tokenIn, tokenOut) {
        let routerPoolAddrsArr = []
        let poolConsts = []
        let poolImmutables = []

        let feeArr = [FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.LOWEST]
        for (let fee0 of feeArr) {
            //USDC -> WETH
            let pool0Addr = Pool.getAddress(tokenIn, WETH_TOKEN, fee0, undefined, POOL_FACTORY_ADDRESS)
            let poolImmutable = {
                tokenA: tokenIn.address,
                tokenB: WETH_TOKEN.address,
                fee: fee0
            }
            poolConsts.push({ tokenIn: tokenIn, tokenOut: WETH_TOKEN, fee: fee0 })
            poolImmutables.push(poolImmutable)

            for (let fee1 of feeArr) {
                //WETH -> PEPE
                let pool1Addr = Pool.getAddress(WETH_TOKEN, tokenOut, fee1, undefined, POOL_FACTORY_ADDRESS)
                let poolImmutable = {
                    tokenA: WETH_TOKEN.address,
                    tokenB: tokenOut.address,
                    fee: fee1
                }
                poolConsts.push({ tokenIn: WETH_TOKEN, tokenOut: tokenOut, fee: fee1 })
                poolImmutables.push(poolImmutable)

                routerPoolAddrsArr.push([pool0Addr, pool1Addr])
            }
        }
        return { routerPoolAddrsArr, poolConsts, poolImmutables }
    }


    function getRouters(tokenIn, tokenOut) {
        let routerPoolAddrsArr = []
        let poolConsts = []
        let poolImmutables = []

        let feeArr = [FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.LOWEST]
        for (let fee of feeArr) {
            let poolAddr = Pool.getAddress(
                tokenIn.isNative ? WETH_TOKEN : tokenIn, 
                tokenOut.isNative ? WETH_TOKEN : tokenOut, 
                fee, 
                undefined, 
                POOL_FACTORY_ADDRESS
            )
            let poolImmutable = {
                tokenA: tokenIn.isNative ? WETH_TOKEN.address : tokenIn.address,
                tokenB: tokenOut.isNative ? WETH_TOKEN.address : tokenOut.address,
                fee
            }
            poolImmutables.push(poolImmutable)
            poolConsts.push({ tokenIn, tokenOut, fee })
            routerPoolAddrsArr.push([poolAddr])
        }
        return { routerPoolAddrsArr, poolConsts, poolImmutables }
    }


    function getRouterPoolsArr(poolStates, poolConsts, routerPoolAddrsArr) {
        let addrToPool = {}
        for (let i = 0; i < poolStates.length; i++) {
            let poolState = poolStates[i]
            let poolConst = poolConsts[i]

            if (s(poolState.liquidity) != '0') {
                let pool = new Pool(
                    poolConst.tokenIn.isNative ? WETH_TOKEN : poolConst.tokenIn,
                    poolConst.tokenOut.isNative ? WETH_TOKEN : poolConst.tokenOut,
                    poolConst.fee,
                    poolState.slot0[0].toString(),
                    poolState.liquidity.toString(),
                    poolState.slot0[1]
                )
                pool.state = poolState
                pool.const = poolConst
                addrToPool[poolState.poolAddr] = pool
            } else {
                console.log('liquidity=0', poolConst.tokenIn.symbol, poolConst.tokenOut.symbol, poolConst.fee)
            }
        }

        let routerPoolsArr = []
        for (let i = 0; i < routerPoolAddrsArr.length; i++) {
            let poolAddrs = routerPoolAddrsArr[i]

            let routerPools = []
            for (let poolAddr of poolAddrs) {
                let pool = addrToPool[poolAddr]
                if (pool) {
                    routerPools.push(pool)
                } else {
                    routerPools.length = 0
                    break
                }
            }
            
            if (routerPools.length > 0) {
                routerPoolsArr.push(routerPools)
            }
        }
        return routerPoolsArr
    }


    function getCallDatasForAmountOut(tokenIn, amountIn, routerPoolsArr, tokenOut) {
        let callDatas = []
        for (let i = 0; i < routerPoolsArr.length; i++) {
            let routerPools = routerPoolsArr[i]
            let { calldata } = SwapQuoter.quoteCallParameters(
                new Route(routerPools, tokenIn, tokenOut),
                CurrencyAmount.fromRawAmount(
                    tokenIn,
                    amountIn
                ),
                TradeType.EXACT_INPUT,
                {
                    useQuoterV2: false,
                }
            )
            callDatas.push(calldata)
        }
        return callDatas
    }


    function getCallDatasForAmountIn(tokenIn, routerPoolsArr, tokenOut, amountOut) {
        let callDatas = []
        for (let i = 0; i < routerPoolsArr.length; i++) {
            let routerPools = routerPoolsArr[i]
            let { calldata } = SwapQuoter.quoteCallParameters(
                new Route(routerPools, tokenIn, tokenOut),
                CurrencyAmount.fromRawAmount(
                    tokenOut,
                    amountOut
                ),
                TradeType.EXACT_OUTPUT,
                {
                    useQuoterV2: false,
                }
            )
            callDatas.push(calldata)
        }
        return callDatas
    }


    function getHighestAmountOut(routerPoolsArr, amountOuts) {
        let best
        for (let i = 0; i < routerPoolsArr.length; i++) {
            let routerPools = routerPoolsArr[i]
            let amountOut = amountOuts[i]

            let routerStr = ''
            for (let pool of routerPools) {
                routerStr += pool.const.tokenIn.symbol + '-' + pool.const.fee + '-' + pool.const.tokenOut.symbol + ' '
            }

            console.log('amountOut:', s(amountOut), 'router:', routerStr)

            if (best) {
                if (amountOut.gt(best.amountOut)) {
                    best = { routerPools, amountOut }
                }
            } else {
                best = { routerPools, amountOut }
            }
        }
        return best
    }


    function getLowestAmountIn(routerPoolsArr, amountIns) {
        let best
        for (let i = 0; i < routerPoolsArr.length; i++) {
            let routerPools = routerPoolsArr[i]
            let amountIn = amountIns[i]

            let routerStr = ''
            for (let pool of routerPools) {
                routerStr += pool.const.tokenIn.symbol + '-' + pool.const.fee + '-' + pool.const.tokenOut.symbol + ' '
            }

            console.log('amountIn:', s(amountIn), 'router:', routerStr)

            if (best) {
                if (amountIn.lt(best.amountIn)) {
                    best = { routerPools, amountIn }
                }
            } else {
                best = { routerPools, amountIn }
            }
        }
        return best
    }


})
