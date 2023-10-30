const util = require('util')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const { ethers } = require('hardhat')
const { computePoolAddress, FeeAmount, Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade } = require('@uniswap/v3-sdk')
const { SupportedChainId, Token, Ether, Currency, CurrencyAmount, Percent, TradeType } = require('@uniswap/sdk-core')
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')
const UniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
const MAX_UINT256 = b('115792089237316195423570985008687907853269984665640564039457584007913129639935')

//mainnet
const ChainId = SupportedChainId.MAINNET
const POOL_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
const QUOTER_V2_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const PEPE_ADDRESS = '0x6982508145454ce325ddbe47a25d4ec3d2311933'
const BITCOIN_ADDRESS = '0x72e4f9f808c49a2a61de9c5896298920dc4eeea9'

const NATIVE_ETH = new Ether(ChainId)
const WETH_TOKEN = new Token(ChainId, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether')
const USDC_TOKEN = new Token(ChainId, USDC_ADDRESS, 6, 'USDC', 'USD Coin')
const USDT_TOKEN = new Token(ChainId, USDT_ADDRESS, 6, 'USDT', 'Tether USD')
const DAI_TOKEN = new Token(ChainId, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin')
const PEPE_TOKEN = new Token(ChainId, PEPE_ADDRESS, 18, 'PEPE', 'Pepe')
const BITCOIN_TOKEN = new Token(ChainId, BITCOIN_ADDRESS, 18, 'BITCOIN', 'BITCOIN')




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
        multiQuoter = await MultiQuoter.deploy(QUOTER_ADDRESS, POOL_FACTORY_ADDRESS)
        await multiQuoter.deployed()
        // multiQuoter = MultiQuoter.attach('0xf18774574148852771c2631d7d06e2a6c8b44fca')
        console.log('const multiQuoterAddr =', multiQuoter.address)
    })

    it('quote amountOut USDC > WETH > PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountIn = m(10000, 6)

        let best = await getBestOfAmountOut(getRoutersInfo_WETH(tokenIn, tokenOut), tokenIn, amountIn, tokenOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC > WETH > PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountOut = m(10000000, 18)

        let best = await getBestOfAmountIn(getRoutersInfo_WETH(tokenIn, tokenOut), tokenIn, tokenOut, amountOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountOut USDC > ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountIn = m(10000, 6)

        let best = await getBestOfAmountOut(getRoutersInfo(tokenIn, tokenOut), tokenIn, amountIn, tokenOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC > ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountOut = m(1, 18)

        let best = await getBestOfAmountIn(getRoutersInfo(tokenIn, tokenOut), tokenIn, tokenOut, amountOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountOut USDC > PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountIn = m(1, 6)

        let best = await getBestOfAmountOut(getRoutersInfo(tokenIn, tokenOut), tokenIn, amountIn, tokenOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC > PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountOut = m(10000000, 18)

        let best = await getBestOfAmountIn(getRoutersInfo(tokenIn, tokenOut), tokenIn, tokenOut, amountOut)
        console.log('best:', best.routerStr)
    })


    ///////////////////////////////
    ////////    Advance     ///////
    ///////////////////////////////

    //////////  buy Token  //////////

    it('quote amountOut USDC > WETH > PEPE & USDC > PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountIn = m(1, 6)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)

        let best = await getBestOfAmountOut(combine(r0, r1), tokenIn, amountIn, tokenOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC > WETH > PEPE & USDC > PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountOut = m(10000000, 18)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)

        let best = await getBestOfAmountIn(combine(r0, r1), tokenIn, tokenOut, amountOut)
        console.log('best:', best.routerStr)
    })

    //////////  sell Token  //////////

    it('quote amountOut PEPE > WETH > USDC & PEPE > USDC', async function () {
        let tokenIn = PEPE_TOKEN
        let tokenOut = USDC_TOKEN
        let amountIn = m(10000000, 18)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)

        let best = await getBestOfAmountOut(combine(r0, r1), tokenIn, amountIn, tokenOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn PEPE > WETH > USDC & PEPE > USDC', async function () {
        let tokenIn = PEPE_TOKEN
        let tokenOut = USDC_TOKEN
        let amountOut = m(1, 6)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)

        let best = await getBestOfAmountIn(combine(r0, r1), tokenIn, tokenOut, amountOut)
        console.log('best:', best.routerStr)
    })

    //////////  buy ETH  //////////

    it('quote amountOut USDC > ETH & USDC > USD > ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountIn = m(100000, 6)

        let r0 = getRoutersInfo(tokenIn, tokenOut)
        let r1 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountOut(combine(r0, r1), tokenIn, amountIn, tokenOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC > ETH & USDC > USD > ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountOut = m(1, 18)

        let r0 = getRoutersInfo(tokenIn, tokenOut)
        let r1 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountIn(combine(r0, r1), tokenIn, tokenOut, amountOut)
        console.log('best:', best.routerStr)
    })

    //////////  sell ETH  //////////

    it('quote amountOut ETH > USDC & ETH > USD > USDC', async function () {
        let tokenIn = NATIVE_ETH
        let tokenOut = USDC_TOKEN
        let amountIn = m(100, 18)

        let r0 = getRoutersInfo(tokenIn, tokenOut)
        let r1 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountOut(combine(r0, r1), tokenIn, amountIn, tokenOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn ETH > USDC & ETH > USD > USDC', async function () {
        let tokenIn = NATIVE_ETH
        let tokenOut = USDC_TOKEN
        let amountOut = m(1000, 6)

        let r0 = getRoutersInfo(tokenIn, tokenOut)
        let r1 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountIn(combine(r0, r1), tokenIn, tokenOut, amountOut)
        console.log('best:', best.routerStr)
    })

    //////////  buy Token3  //////////

    it('quote amountOut USDC>WETH>PEPE & USDC>PEPE & USDC>USD>PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountIn = m(1, 6)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)
        let r2 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountOut(combine(combine(r0, r1), r2), tokenIn, amountIn, tokenOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC>WETH>PEPE & USDC>PEPE & USDC>USD>PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountOut = m(10000000, 18)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)
        let r2 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountIn(combine(combine(r0, r1), r2), tokenIn, tokenOut, amountOut)
        console.log('best:', best.routerStr)
    })

    //////////  sell Token3  //////////

    it('quote amountOut PEPE>WETH>USDC & PEPE>USDC & PEPE>USD>USDC', async function () {
        let tokenIn = PEPE_TOKEN
        let tokenOut = USDC_TOKEN
        let amountIn = m(10000000, 18)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)
        let r2 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountOut(combine(combine(r0, r1), r2), tokenIn, amountIn, tokenOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn PEPE>WETH>USDC & PEPE>USDC & PEPE>USD>USDC', async function () {
        let tokenIn = PEPE_TOKEN
        let tokenOut = USDC_TOKEN
        let amountOut = m(1, 6)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)
        let r2 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountIn(combine(combine(r0, r1), r2), tokenIn, tokenOut, amountOut)
        console.log('best:', best.routerStr)
    })





    function combine(routersInfo0, routersInfo1) {
        let r0 = routersInfo0
        let r1 = routersInfo1

        let routerPoolAddrsArr = [...r0.routerPoolAddrsArr, ...r1.routerPoolAddrsArr]
        let poolImmutables = [...r0.poolImmutables]
        let poolConsts = [...r0.poolConsts]

        for (let i = 0; i < r1.poolImmutables.length; i++) {
            let a = r1.poolImmutables[i]
            let hasSame = false
            for (let b of r0.poolImmutables) {
                if (b.tokenA === a.tokenA && b.tokenB === a.tokenB && b.fee === a.fee) {
                    hasSame = true
                    break
                }
            }
            if (!hasSame) {
                poolImmutables.push(a)
                poolConsts.push(r1.poolConsts[i])
            }
        }

        return { routerPoolAddrsArr, poolConsts, poolImmutables }
    }


    async function getBestOfAmountOut(routersInfo, tokenIn, amountIn, tokenOut) {
        let { routerPoolAddrsArr, poolConsts, poolImmutables } = routersInfo
        let poolStates = await multiQuoter.getPoolStates(poolImmutables)
        let routerPoolsArr = getRouterPoolsArr(poolStates, poolConsts, routerPoolAddrsArr)
        let callDatas = getCallDatasForAmountOut(tokenIn, amountIn, routerPoolsArr, tokenOut)
        let amountOuts = await multiQuoter.callStatic.aggregate(callDatas, 200000)
        let best = getHighestAmountOut(routerPoolsArr, amountOuts)
        return best
    }


    async function getBestOfAmountIn(routersInfo, tokenIn, tokenOut, amountOut) {
        let { routerPoolAddrsArr, poolConsts, poolImmutables } = routersInfo
        let poolStates = await multiQuoter.getPoolStates(poolImmutables)
        let routerPoolsArr = getRouterPoolsArr(poolStates, poolConsts, routerPoolAddrsArr)
        let callDatas = getCallDatasForAmountIn(tokenIn, routerPoolsArr, tokenOut, amountOut)
        let amountIns = await multiQuoter.callStatic.aggregate(callDatas, 200000)
        let best = getLowestAmountIn(routerPoolsArr, amountIns)
        return best
    }


    function getRoutersInfo_USD(tokenIn, tokenOut) {
        let routerPoolAddrsArr = []
        let poolConsts = []
        let poolImmutables = []
        let feeArr = [FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.LOWEST]

        let tokenUSDs = [USDC_TOKEN, USDT_TOKEN, DAI_TOKEN]
        let indexIn = tokenUSDs.indexOf(tokenIn)
        let indexOut = tokenUSDs.indexOf(tokenOut)

        if (indexIn == -1 && indexOut >= 0) { //tokenOut is USD

            tokenUSDs.splice(indexOut, 1)
            for (let tokenUSD of tokenUSDs) {
                //TOKEN -> USD
                for (let fee0 of feeArr) {
                    let pool0Addr = Pool.getAddress(
                        tokenIn.isNative ? WETH_TOKEN : tokenIn,
                        tokenUSD,
                        fee0,
                        undefined,
                        POOL_FACTORY_ADDRESS
                    )
                    poolImmutables.push({
                        tokenA: tokenIn.isNative ? WETH_TOKEN.address : tokenIn.address,
                        tokenB: tokenUSD.address,
                        fee: fee0
                    })
                    poolConsts.push({ tokenIn: tokenIn, tokenOut: tokenUSD, fee: fee0 })

                    //USD -> USD
                    let pool1Addr = Pool.getAddress(
                        tokenUSD,
                        tokenOut,
                        FeeAmount.LOWEST,
                        undefined,
                        POOL_FACTORY_ADDRESS
                    )
                    poolImmutables.push({
                        tokenA: tokenUSD.address,
                        tokenB: tokenOut.address,
                        fee: FeeAmount.LOWEST
                    })
                    poolConsts.push({ tokenIn: tokenUSD, tokenOut: tokenOut, fee: FeeAmount.LOWEST })

                    routerPoolAddrsArr.push([pool0Addr, pool1Addr])
                }
            }

        } else if (indexIn >= 0 && indexOut == -1) { //tokenIn is USD

            tokenUSDs.splice(indexIn, 1)
            for (let tokenUSD of tokenUSDs) {
                //USD -> USD
                let pool0Addr = Pool.getAddress(
                    tokenIn,
                    tokenUSD,
                    FeeAmount.LOWEST,
                    undefined,
                    POOL_FACTORY_ADDRESS
                )
                poolImmutables.push({
                    tokenA: tokenIn.address,
                    tokenB: tokenUSD.address,
                    fee: FeeAmount.LOWEST
                })
                poolConsts.push({ tokenIn: tokenIn, tokenOut: tokenUSD, fee: FeeAmount.LOWEST })

                for (let fee1 of feeArr) {
                    //USD -> TOKEN
                    let pool1Addr = Pool.getAddress(
                        tokenUSD,
                        tokenOut.isNative ? WETH_TOKEN : tokenOut,
                        fee1,
                        undefined,
                        POOL_FACTORY_ADDRESS
                    )
                    poolImmutables.push({
                        tokenA: tokenUSD.address,
                        tokenB: tokenOut.isNative ? WETH_TOKEN.address : tokenOut.address,
                        fee: fee1
                    })
                    poolConsts.push({ tokenIn: tokenUSD, tokenOut: tokenOut, fee: fee1 })

                    routerPoolAddrsArr.push([pool0Addr, pool1Addr])
                }
            }

        } else {
            throw new Error('only one of tokenIn and tokenOut MUST be stable coin')
        }

        return { routerPoolAddrsArr, poolConsts, poolImmutables }
    }


    function getRoutersInfo_WETH(tokenIn, tokenOut) {
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


    function getRoutersInfo(tokenIn, tokenOut) {
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

                console.log('(valid) liquidity: ' + s(poolState.liquidity),
                    poolConst.tokenIn.symbol + '-' + poolConst.fee + '-' + poolConst.tokenOut.symbol)

            } else {
                console.log('(drop) liquidity: ' + s(poolState.liquidity),
                    poolConst.tokenIn.symbol + '-' + poolConst.fee + '-' + poolConst.tokenOut.symbol)
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
        let best = null
        for (let i = 0; i < routerPoolsArr.length; i++) {
            let routerPools = routerPoolsArr[i]
            let amountOut = amountOuts[i]

            let routerStr = 'amountOut:' + s(amountOut) + ' router:'
            for (let pool of routerPools) {
                routerStr += pool.const.tokenIn.symbol + '-' + pool.const.fee + '-' + pool.const.tokenOut.symbol + ' '
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
                routerStr += pool.const.tokenIn.symbol + '-' + pool.const.fee + '-' + pool.const.tokenOut.symbol + ' '
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


})
