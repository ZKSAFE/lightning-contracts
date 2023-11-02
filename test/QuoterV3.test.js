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
// const ChainId = SupportedChainId.MAINNET
// const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
// const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
// const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
// const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
// const PEPE_ADDRESS = '0x6982508145454ce325ddbe47a25d4ec3d2311933'

//op
const ChainId = SupportedChainId.OPTIMISM
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'
const USDC_ADDRESS = '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
const USDT_ADDRESS = '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
const DAI_ADDRESS = '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
const PEPE_ADDRESS = '0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6'


const NATIVE_ETH = new Ether(ChainId)
const WETH_TOKEN = new Token(ChainId, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether')
const USDC_TOKEN = new Token(ChainId, USDC_ADDRESS, 6, 'USDC', 'USD Coin')
const USDT_TOKEN = new Token(ChainId, USDT_ADDRESS, 6, 'USDT', 'Tether USD')
const DAI_TOKEN = new Token(ChainId, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin')
const PEPE_TOKEN = new Token(ChainId, PEPE_ADDRESS, 18, 'PEPE', 'Pepe')




describe('QuoterV3.test', function () {
    let chainId
    let accounts
    let signer
    let provider
    let ERC20
    let multiQuoter
    let quoterV3
    let QuoterV3

    before(async function () {
        accounts = await ethers.getSigners()
        signer = accounts[0]
        provider = signer.provider
        chainId = (await provider.getNetwork()).chainId

        console.log('signer', signer.address)
        console.log('chainId', chainId)

        ERC20 = await ethers.getContractFactory('MockERC20', signer)

        QuoterV3 = await ethers.getContractFactory('QuoterV3')
        // quoterV3 = await QuoterV3.deploy(POOL_FACTORY_ADDRESS, WETH_ADDRESS)
        // await quoterV3.deployed()
        quoterV3 = QuoterV3.attach('0x42651ae9f9aae9ac51fd155dd4e98240e11e1344')
        console.log('const quoterV3Addr =', quoterV3.address)
    })

    // it('quote amountOut USDC > WETH > PEPE', async function () {
    //     let tokenIn = USDC_TOKEN
    //     let tokenOut = PEPE_TOKEN
    //     let amountIn = m(10000, 6)

    //     let best = await getBestOfAmountOut(getRoutersInfo_WETH(tokenIn, tokenOut), amountIn)
    //     console.log('best:', best.routerStr)
    // })

    // it('quote amountIn USDC > WETH > PEPE', async function () {
    //     let tokenIn = USDC_TOKEN
    //     let tokenOut = PEPE_TOKEN
    //     let amountOut = m(10000000, 18)

    //     let best = await getBestOfAmountIn(getRoutersInfo_WETH(tokenIn, tokenOut), amountOut)
    //     console.log('best:', best.routerStr)
    // })

    // it('quote amountOut USDC > ETH', async function () {
    //     let tokenIn = USDC_TOKEN
    //     let tokenOut = NATIVE_ETH
    //     let amountIn = m(10000, 6)

    //     let best = await getBestOfAmountOut(getRoutersInfo(tokenIn, tokenOut), amountIn)
    //     console.log('best:', best.routerStr)
    // })

    // it('quote amountIn USDC > ETH', async function () {
    //     let tokenIn = USDC_TOKEN
    //     let tokenOut = NATIVE_ETH
    //     let amountOut = m(1, 18)

    //     let best = await getBestOfAmountIn(getRoutersInfo(tokenIn, tokenOut), amountOut)
    //     console.log('best:', best.routerStr)
    // })

    // it('quote amountOut USDC > PEPE', async function () {
    //     let tokenIn = USDC_TOKEN
    //     let tokenOut = PEPE_TOKEN
    //     let amountIn = m(1, 6)

    //     let best = await getBestOfAmountOut(getRoutersInfo(tokenIn, tokenOut), amountIn)
    //     console.log('best:', best.routerStr)
    // })

    // it('quote amountIn USDC > PEPE', async function () {
    //     let tokenIn = USDC_TOKEN
    //     let tokenOut = PEPE_TOKEN
    //     let amountOut = m(10000000, 18)

    //     let best = await getBestOfAmountIn(getRoutersInfo(tokenIn, tokenOut), amountOut)
    //     console.log('best:', best.routerStr)
    // })


    ///////////////////////////////
    ////////    Advance     ///////
    ///////////////////////////////

    //////////  buy ETH  //////////

    // it('quote amountOut USDC > ETH & USDC > USD > ETH', async function () {
    //     let tokenIn = USDC_TOKEN
    //     let tokenOut = NATIVE_ETH
    //     let amountIn = m(100000, 6)

    //     let r0 = getRoutersInfo(tokenIn, tokenOut)
    //     let r1 = getRoutersInfo_USD(tokenIn, tokenOut)

    //     let best = await getBestOfAmountOut([...r0, ...r1], amountIn)
    //     console.log('best:', best.routerStr)
    // })

    // it('quote amountIn USDC > ETH & USDC > USD > ETH', async function () {
    //     let tokenIn = USDC_TOKEN
    //     let tokenOut = NATIVE_ETH
    //     let amountOut = m(1, 18)

    //     let r0 = getRoutersInfo(tokenIn, tokenOut)
    //     let r1 = getRoutersInfo_USD(tokenIn, tokenOut)

    //     let best = await getBestOfAmountIn([...r0, ...r1], amountOut)
    //     console.log('best:', best.routerStr)
    // })

    // //////////  sell ETH  //////////

    // it('quote amountOut ETH > USDC & ETH > USD > USDC', async function () {
    //     let tokenIn = NATIVE_ETH
    //     let tokenOut = USDC_TOKEN
    //     let amountIn = m(100, 18)

    //     let r0 = getRoutersInfo(tokenIn, tokenOut)
    //     let r1 = getRoutersInfo_USD(tokenIn, tokenOut)

    //     let best = await getBestOfAmountOut([...r0, ...r1], amountIn)
    //     console.log('best:', best.routerStr)
    // })

    // it('quote amountIn ETH > USDC & ETH > USD > USDC', async function () {
    //     let tokenIn = NATIVE_ETH
    //     let tokenOut = USDC_TOKEN
    //     let amountOut = m(1000, 6)

    //     let r0 = getRoutersInfo(tokenIn, tokenOut)
    //     let r1 = getRoutersInfo_USD(tokenIn, tokenOut)

    //     let best = await getBestOfAmountIn([...r0, ...r1], amountOut)
    //     console.log('best:', best.routerStr)
    // })

    // //////////  buy Token  //////////

    it('quote amountOut USDC>WETH>PEPE & USDC>PEPE & USDC>USD>PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountIn = m(100, 6)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)
        let r2 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountOut([...r0, ...r1, ...r2], amountIn)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC>WETH>PEPE & USDC>PEPE & USDC>USD>PEPE', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountOut = m(10, 18)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)
        let r2 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountIn([...r0, ...r1, ...r2], amountOut)
        console.log('best:', best.routerStr)
    })

    //////////  sell Token  //////////

    it('quote amountOut PEPE>WETH>USDC & PEPE>USDC & PEPE>USD>USDC', async function () {
        let tokenIn = PEPE_TOKEN
        let tokenOut = USDC_TOKEN
        let amountIn = m(10, 18)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)
        let r2 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountOut([...r0, ...r1, ...r2], amountIn)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn PEPE>WETH>USDC & PEPE>USDC & PEPE>USD>USDC', async function () {
        let tokenIn = PEPE_TOKEN
        let tokenOut = USDC_TOKEN
        let amountOut = m(100, 6)

        let r0 = getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = getRoutersInfo(tokenIn, tokenOut)
        let r2 = getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await getBestOfAmountIn([...r0, ...r1, ...r2], amountOut)
        console.log('best:', best.routerStr)
    })




    function getRoutersInfo_USD(tokenIn, tokenOut) {
        let routerPoolsArr = []
        let feeArr = [FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.LOWEST]

        let tokenUSDs = [USDC_TOKEN, USDT_TOKEN, DAI_TOKEN]
        let indexIn = tokenUSDs.indexOf(tokenIn)
        let indexOut = tokenUSDs.indexOf(tokenOut)

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


})
