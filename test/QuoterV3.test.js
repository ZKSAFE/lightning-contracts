const util = require('util')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s, MAX_UINT256, ETH_ADDRESS } = require('./help/BigIntHelp')
const { ethers } = require('hardhat')
const { computePoolAddress, FeeAmount, Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade } = require('@uniswap/v3-sdk')
const { Token, Ether, Currency, CurrencyAmount, Percent, TradeType } = require('@uniswap/sdk-core')
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')
const UniswapV3FactoryABI = require('@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json')
const QuoterV3Help = require('./help/QuoterV3Help')

//mainnet
const ChainId = 1
const POOL_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const TOKEN_ADDRESS = '0x6982508145454ce325ddbe47a25d4ec3d2311933'
const QuoterV3Addr = '0xFE92134da38df8c399A90a540f20187D19216E05'

//op
// const ChainId = SupportedChainId.OPTIMISM
// const WETH_ADDRESS = '0x4200000000000000000000000000000000000006'
// const USDCe_ADDRESS = '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'
// const USDC_ADDRESS = '0x0b2c639c533813f4aa9d7837caf62653d097ff85'
// const USDT_ADDRESS = '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'
// const DAI_ADDRESS = '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'
// const TOKEN_ADDRESS = '0x4200000000000000000000000000000000000042'
// const QuoterV3Addr = '0x42651ae9f9aae9ac51fd155dd4e98240e11e1344'

const NATIVE_ETH = new Ether(ChainId)
const WETH_TOKEN = new Token(ChainId, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether')
const USDC_TOKEN = new Token(ChainId, USDC_ADDRESS, 6, 'USDC', 'USD Coin')
const USDT_TOKEN = new Token(ChainId, USDT_ADDRESS, 6, 'USDT', 'Tether USD')
const DAI_TOKEN = new Token(ChainId, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin')
const TOKEN_TOKEN = new Token(ChainId, TOKEN_ADDRESS, 18, 'TOKEN', 'Pepe')


describe('QuoterV3.test', function () {
    let chainId
    let accounts
    let signer
    let provider

    before(async function () {
        accounts = await ethers.getSigners()
        signer = accounts[0]
        provider = signer.provider
        chainId = (await provider.getNetwork()).chainId

        console.log('signer', signer.address)
        console.log('chainId', chainId)

        ERC20 = await ethers.getContractFactory('MockERC20', signer)

        const QuoterV3 = await ethers.getContractFactory('QuoterV3')
        // const quoterV3 = await QuoterV3.deploy(POOL_FACTORY_ADDRESS, WETH_ADDRESS)
        // await quoterV3.waitForDeployment()
        const quoterV3 = QuoterV3.attach(QuoterV3Addr)
        console.log('const quoterV3Addr =', quoterV3.target)

        await QuoterV3Help.setup({
            ChainId,
            WETH_ADDRESS,
            USDC_ADDRESS,
            USDT_ADDRESS,
            DAI_ADDRESS,
            QuoterV3Addr: quoterV3.target
        })
    })

    it('quote amountOut USDC>WETH>TOKEN', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = TOKEN_TOKEN
        let amountIn = m(100, 6)

        let best = await QuoterV3Help.getBestOfAmountOut(QuoterV3Help.getRoutersInfo_WETH(tokenIn, tokenOut), amountIn)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC>WETH>TOKEN', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = TOKEN_TOKEN
        let amountOut = m(100, 18)

        let best = await QuoterV3Help.getBestOfAmountIn(QuoterV3Help.getRoutersInfo_WETH(tokenIn, tokenOut), amountOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountOut USDC>ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountIn = m(100, 6)

        let best = await QuoterV3Help.getBestOfAmountOut(QuoterV3Help.getRoutersInfo(tokenIn, tokenOut), amountIn)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC>ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountOut = m(1, 18)

        let best = await QuoterV3Help.getBestOfAmountIn(QuoterV3Help.getRoutersInfo(tokenIn, tokenOut), amountOut)
        console.log('best:', best.routerStr)
    })

    it('quote amountOut USDC>TOKEN', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = TOKEN_TOKEN
        let amountIn = m(100, 6)

        let best = await QuoterV3Help.getBestOfAmountOut(QuoterV3Help.getRoutersInfo(tokenIn, tokenOut), amountIn)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC>TOKEN', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = TOKEN_TOKEN
        let amountOut = m(100, 18)

        let best = await QuoterV3Help.getBestOfAmountIn(QuoterV3Help.getRoutersInfo(tokenIn, tokenOut), amountOut)
        console.log('best:', best.routerStr)
    })


    /////////////////////////////
    //////    Advance     ///////
    /////////////////////////////

    ////////  buy ETH  //////////

    it('quote amountOut USDC>ETH & USDC>USD>ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountIn = m(10000, 6)

        let r0 = QuoterV3Help.getRoutersInfo(tokenIn, tokenOut)
        let r1 = QuoterV3Help.getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await QuoterV3Help.getBestOfAmountOut([...r0, ...r1], amountIn)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC>ETH & USDC>USD>ETH', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = NATIVE_ETH
        let amountOut = m(1, 18)

        let r0 = QuoterV3Help.getRoutersInfo(tokenIn, tokenOut)
        let r1 = QuoterV3Help.getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await QuoterV3Help.getBestOfAmountIn([...r0, ...r1], amountOut)
        console.log('best:', best.routerStr)
    })

    //////////  sell ETH  //////////

    it('quote amountOut ETH>USDC & ETH>USD>USDC', async function () {
        let tokenIn = NATIVE_ETH
        let tokenOut = USDC_TOKEN
        let amountIn = m(1, 18)

        let r0 = QuoterV3Help.getRoutersInfo(tokenIn, tokenOut)
        let r1 = QuoterV3Help.getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await QuoterV3Help.getBestOfAmountOut([...r0, ...r1], amountIn)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn ETH>USDC & ETH>USD>USDC', async function () {
        let tokenIn = NATIVE_ETH
        let tokenOut = USDC_TOKEN
        let amountOut = m(10000, 6)

        let r0 = QuoterV3Help.getRoutersInfo(tokenIn, tokenOut)
        let r1 = QuoterV3Help.getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await QuoterV3Help.getBestOfAmountIn([...r0, ...r1], amountOut)
        console.log('best:', best.routerStr)
    })

    //////////  buy Token  //////////

    it('quote amountOut USDC>WETH>TOKEN & USDC>TOKEN & USDC>USD>TOKEN', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = TOKEN_TOKEN
        let amountIn = m(100, 6)

        let r0 = QuoterV3Help.getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = QuoterV3Help.getRoutersInfo(tokenIn, tokenOut)
        let r2 = QuoterV3Help.getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await QuoterV3Help.getBestOfAmountOut([...r0, ...r1, ...r2], amountIn)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn USDC>WETH>TOKEN & USDC>TOKEN & USDC>USD>TOKEN', async function () {
        let tokenIn = USDC_TOKEN
        let tokenOut = TOKEN_TOKEN
        let amountOut = m(100, 18)

        let r0 = QuoterV3Help.getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = QuoterV3Help.getRoutersInfo(tokenIn, tokenOut)
        let r2 = QuoterV3Help.getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await QuoterV3Help.getBestOfAmountIn([...r0, ...r1, ...r2], amountOut)
        console.log('best:', best.routerStr)
    })

    // //////////  sell Token  //////////

    it('quote amountOut TOKEN>WETH>USDC & TOKEN>USDC & TOKEN>USD>USDC', async function () {
        let tokenIn = TOKEN_TOKEN
        let tokenOut = USDT_TOKEN
        let amountIn = m(100, 18)

        let r0 = QuoterV3Help.getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = QuoterV3Help.getRoutersInfo(tokenIn, tokenOut)
        let r2 = QuoterV3Help.getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await QuoterV3Help.getBestOfAmountOut([...r0, ...r1, ...r2], amountIn)
        console.log('best:', best.routerStr)
    })

    it('quote amountIn TOKEN>WETH>USDC & TOKEN>USDC & TOKEN>USD>USDC', async function () {
        let tokenIn = TOKEN_TOKEN
        let tokenOut = USDC_TOKEN
        let amountOut = m(100, 6)

        let r0 = QuoterV3Help.getRoutersInfo_WETH(tokenIn, tokenOut)
        let r1 = QuoterV3Help.getRoutersInfo(tokenIn, tokenOut)
        let r2 = QuoterV3Help.getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await QuoterV3Help.getBestOfAmountIn([...r0, ...r1, ...r2], amountOut)
        console.log('best:', best.routerStr)
    })
})
