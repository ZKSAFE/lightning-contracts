const { BigNumber, utils } = require('ethers')
const fs = require('fs')
const { ethers } = require('hardhat')
const { computePoolAddress, FeeAmount, Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade } = require('@uniswap/v3-sdk')
const { SupportedChainId, Token, Ether, Currency, CurrencyAmount, Percent, TradeType } = require('@uniswap/sdk-core')
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')
const QuoterABI = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json')

//mainnet
const ChainId = SupportedChainId.MAINNET
const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const QUOTER_CONTRACT_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const WETH_CONTRACT_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const USDC_CONTRACT_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

// //arbi
// const ChainId = SupportedChainId.ARBITRUM_ONE
// const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
// const QUOTER_CONTRACT_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
// const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
// const WETH_CONTRACT_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
// const USDC_CONTRACT_ADDRESS = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'


const NATIVE_ETH = new Ether(ChainId)
const WETH_TOKEN = new Token(ChainId,WETH_CONTRACT_ADDRESS,18,'WETH','Wrapped Ether')
const USDC_TOKEN = new Token(ChainId,USDC_CONTRACT_ADDRESS,6,'USDC','USD Coin')

const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint amount) returns (bool)",
    "function deposit() public payable",
    "function approve(address spender, uint256 amount) returns (bool)",
]

const WETH_ABI = [
    'function deposit() payable',
    'function withdraw(uint wad) public',
]


describe('SmartWallet-Taker-test', function () {
    let accounts
    let provider
    let usdc
    let weth

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider

        usdc = new ethers.Contract(
            USDC_TOKEN.address,
            ERC20_ABI,
            accounts[0]
        )

        weth = new ethers.Contract(
            WETH_TOKEN.address,
            ERC20_ABI,
            accounts[0]
        )
    })


    let tokenIn = NATIVE_ETH
    let tokenOut = USDC_TOKEN
    let amountIn = m(2, tokenIn.decimals)
    let amountOut
    let swapRoute
    it('quote', async function () {
        let poolInfo = await getPoolInfo()

        let pool = new Pool(
            tokenIn.isNative ? WETH_TOKEN : tokenIn,
            tokenOut.isNative ? WETH_TOKEN : tokenOut,
            FeeAmount.LOW,
            poolInfo.sqrtPriceX96.toString(),
            poolInfo.liquidity.toString(),
            poolInfo.tick
        )

        // console.log('pool:', pool)

        swapRoute = new Route(
            [pool],
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
                useQuoterV2: true,
            }
        )

        let quoteCallReturnData = await provider.call({
            to: QUOTER_CONTRACT_ADDRESS,
            data: calldata,
        })

        amountOut = utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)[0]
        console.log('amountOut:', d(amountOut, tokenOut.decimals))
    })


    async function getPoolInfo() {
        let currentPoolAddress = computePoolAddress({
            factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
            tokenA: USDC_TOKEN,
            tokenB: WETH_TOKEN,
            fee: FeeAmount.LOW,
        })

        let poolContract = new ethers.Contract(
            currentPoolAddress,
            IUniswapV3PoolABI.abi,
            provider
        )

        let [token0, token1, fee, tickSpacing, liquidity, slot0] =
            await Promise.all([
                poolContract.token0(),
                poolContract.token1(),
                poolContract.fee(),
                poolContract.tickSpacing(),
                poolContract.liquidity(),
                poolContract.slot0(),
            ])

        return {
            token0,
            token1,
            fee,
            tickSpacing,
            liquidity,
            sqrtPriceX96: slot0[0],
            tick: slot0[1],
        }
    }


    it('swap', async function () {
        let to = '0x'
        let value = 0
        let data = '0x'

        let uncheckedTrade = Trade.createUncheckedTrade({
            route: swapRoute,
            inputAmount: CurrencyAmount.fromRawAmount(
                tokenIn,
                amountIn
            ),
            outputAmount: CurrencyAmount.fromRawAmount(
                tokenOut,
                amountOut
            ),
            tradeType: TradeType.EXACT_INPUT,
        })

        let options = {
            slippageTolerance: new Percent(1, 10000), // 50 bips, or 0.50%
            deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
            recipient: accounts[0].address
        }
        let methodParameters = SwapRouter.swapCallParameters([uncheckedTrade], options)

        to = SWAP_ROUTER_ADDRESS
        value = methodParameters.value
        data = methodParameters.calldata
        
        await (await accounts[0].sendTransaction({to, value, data})).wait()
        console.log('swap done')
        await print()
    })


    async function print() {
        console.log('')
        
        let objArr = [
            {name:'account0', address:accounts[0].address},
            {name:'account1', address:accounts[1].address}
        ]
        for (let obj of objArr) {
            console.log(obj.address, obj.name, 
                'usdc:', d(await usdc.balanceOf(obj.address), USDC_TOKEN.decimals),
                'weth:', d(await weth.balanceOf(obj.address), WETH_TOKEN.decimals),
                'eth:', d(await provider.getBalance(obj.address), WETH_TOKEN.decimals)
            )
        }

        console.log('')
    }


    function stringToHex(string) {
        let hexStr = '';
        for (let i = 0; i < string.length; i++) {
            let compact = string.charCodeAt(i).toString(16)
            hexStr += compact
        }
        return '0x' + hexStr
    }

    function getAbi(jsonPath) {
        let file = fs.readFileSync(jsonPath)
        let abi = JSON.parse(file.toString()).abi
        return abi
    }

    async function delay(sec) {
        console.log('delay.. ' + sec + 's')
        return new Promise((resolve, reject) => {
            setTimeout(resolve, sec * 1000);
        })
    }

    function m(num, decimals) {
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
})
