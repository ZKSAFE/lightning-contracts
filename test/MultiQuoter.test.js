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
        multiQuoter = await MultiQuoter.deploy(QUOTER_ADDRESS, WETH_ADDRESS, [USDT_ADDRESS, USDC_ADDRESS])
        await multiQuoter.deployed()
        // multiQuoter = MultiQuoter.attach('0x9a86494ba45ee1f9eeed9cfc0894f6c5d13a1f0b')
        console.log('const multiQuoterAddr =', multiQuoter.address)
    })

    it('quote', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = PEPE_TOKEN
        let amountIn = m(1, 6)

        let feeArr = [FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.LOWEST]

        let routerArr = []
        let calldataArr = []
        for (let fee0 of feeArr) {

            //USDC -> WETH
            let pool0 = await getPool(tokenIn, WETH_TOKEN, fee0)
            if (pool0 == null) continue

            for (let fee1 of feeArr) {
                //WETH -> PEPE
                let pool1 = await getPool(WETH_TOKEN, tokenOut, fee1)
                if (pool1 == null) continue

                routerArr.push({ pool0, fee0, pool1, fee1 })
                
                let calldata = getCalldata([pool0, pool1], tokenIn, tokenOut, amountIn)
                calldataArr.push(calldata)
            }

        }
        let amountOuts = await multiQuoter.callStatic.aggregate(calldataArr)
        
        for (let i=0; i< routerArr.length; i++) {
            let r = routerArr[i]
            let amountOut = amountOuts[i]
            console.log(r.pool0.address, r.fee0, r.pool1.address, r.fee1, 'amountOut:', s(amountOut))
        }

    })

    function getCalldata(poolArr, tokenIn, tokenOut, amountIn) {
        let swapRoute = new Route(
            poolArr,
            tokenIn,
            tokenOut
        )

        let { calldata } = SwapQuoter.quoteCallParameters(
            swapRoute,
            CurrencyAmount.fromRawAmount(
                tokenIn,
                amountIn
            ),
            TradeType.EXACT_INPUT,
            {
                useQuoterV2: false,
            }
        )

        return calldata
    }

    async function getPool(tokenA, tokenB, fee) {
        let poolAddr = Pool.getAddress(tokenA, tokenB, fee, undefined, POOL_FACTORY_ADDRESS)
        // console.log('poolAddr', poolAddr, tokenA.symbol, tokenB.symbol, fee)
        if (poolAddr == '0x0000000000000000000000000000000000000000') {
            console.log('poolAddr = 0', tokenA.symbol, tokenB.symbol, fee)
            return null
        }

        let poolContract = new ethers.Contract(
            poolAddr,
            IUniswapV3PoolABI.abi,
            provider
        )

        let [liquidity, slot0] =
            await Promise.all([
                poolContract.liquidity(),
                poolContract.slot0(),
            ])

        // console.log('liquidity', liquidity)
        if (s(liquidity) == '0') {
            console.log('liquidity = 0', tokenA.symbol, tokenB.symbol, fee)
            return null
        }

        let pool = new Pool(
            tokenA.isNative ? WETH_TOKEN : tokenA,
            tokenB.isNative ? WETH_TOKEN : tokenB,
            fee,
            slot0[0].toString(),
            liquidity.toString(),
            slot0[1]
        )

        pool.address = poolAddr

        return pool
    }
})
