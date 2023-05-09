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

//fork mainnet to local
const SubBundler_Address = '0x0b545A095e837d23a74340A75798B519fA27bcbD'
const Wallet_Address = '0xAe2563b4315469bF6bdD41A6ea26157dE57Ed94e'

// //arbi
// const ChainId = SupportedChainId.ARBITRUM_ONE
// const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
// const QUOTER_CONTRACT_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
// const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
// const WETH_CONTRACT_ADDRESS = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
// const USDC_CONTRACT_ADDRESS = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'

// //arbi
// const Bundler_Address = '0xa877a2247b318b40935E102926Ba5ff4F3b0E8b1'
// const Wallet_Address = '0x6D288698986A3b1C1286fB074c45Ac2F10409E28'


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

const MAX_UINT256 = BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')


describe('SmartWallet-Maker-test', function () {
    let accounts
    let provider
    let wallet
    let subBundler
    let usdc
    let weth
    let signData

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


    // it('deploy', async function () {
    //     const Bundler = await ethers.getContractFactory('Bundler')
    //     let bundler = await Bundler.deploy()
    //     await bundler.deployed()
    //     console.log('bundler deployed:', bundler.address)

    //     const SubBundler = await ethers.getContractFactory('SubBundler')
    //     subBundler = SubBundler.attach(await bundler.subBundler())
    //     console.log('subBundler deployed:', subBundler.address)

    //     const SmartWallet = await ethers.getContractFactory('SmartWallet')
    //     wallet = await SmartWallet.deploy(accounts[1].address, subBundler.address)
    //     await wallet.deployed()
    //     console.log('wallet deployed:', wallet.address)

    //     await print()
    // })


    it('attach', async function () {
        const SubBundler = await ethers.getContractFactory('SubBundler')
        subBundler = SubBundler.attach(SubBundler_Address)

        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        wallet = SmartWallet.attach(Wallet_Address)

        await print()
    })


    it('deposit', async function () {
        await usdc.transfer(wallet.address, m(100, USDC_TOKEN.decimals))
        console.log('deposit ERC20 to wallet', wallet.address)

        await usdc.transfer(subBundler.address, m(100, USDC_TOKEN.decimals))
        console.log('deposit ERC20 to subBundler', subBundler.address)

        await print()
    })


    let tokenIn = USDC_TOKEN
    let tokenOut = NATIVE_ETH
    let amountIn = m(100, tokenIn.decimals)
    let amountOut
    let amountOutToUser
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
        amountOutToUser = amountOut.mul(b(9980)).div(b(10000))
        console.log('uniswap price:', 100/d(amountOut, tokenOut.decimals), 'to user price:', 100/d(amountOutToUser, tokenOut.decimals))
        console.log('amountOut:', d(amountOut, tokenOut.decimals), 'amountOutToUser:', d(amountOutToUser, tokenOut.decimals))
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


    it('account1 atomSign', async function () {
        let callArr = []
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
                amountOutToUser
            ),
            tradeType: TradeType.EXACT_OUTPUT,
        })

        let options = {
            slippageTolerance: new Percent(1, 10000), // 50 bips, or 0.50%
            deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
            recipient: wallet.address
        }
        let methodParameters = SwapRouter.swapCallParameters([uncheckedTrade], options)

        to = subBundler.address
        value = 0
        const SubBundler = await ethers.getContractFactory('SubBundler')
        data = SubBundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', 
            [SWAP_ROUTER_ADDRESS, methodParameters.value, methodParameters.calldata]
            )
        callArr.push({to, value, data})
        
        to = usdc.address
        value = 0
        const ERC = await ethers.getContractFactory('MockERC20')
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [subBundler.address, amountIn])
        callArr.push({to, value, data})

        signData = await atomSign(accounts[1], wallet.address, callArr)
        console.log('atomSign done')
    })


    it('subBundler executeOp', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        if (tokenIn.isToken) {
            const ERC20 = await ethers.getContractFactory('MockERC20')
            let token = ERC20.attach(tokenIn.address)
            let allowance = await token.allowance(subBundler.address, SWAP_ROUTER_ADDRESS)
            if (allowance.lt(amountIn)) {
                to = tokenIn.address
                value = 0
                data = ERC20.interface.encodeFunctionData('approve(address,uint256)', [SWAP_ROUTER_ADDRESS, MAX_UINT256])
                callArr.push({to, value, data})
                console.log('add approve')
            }
        }

        to = wallet.address
        value = 0
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let s = signData
        data = SmartWallet.interface.encodeFunctionData('atomSignCall', [s.toArr, s.valueArr, s.dataArr, s.deadline, s.signature])
        callArr.push({to, value, data})
        console.log('add atomSignCall')

        let {toArr, valueArr, dataArr} = toAtomOp(callArr)
        await (await subBundler.executeOp(toArr, valueArr, dataArr)).wait()
        console.log('executeOp done')

        await print()
    })


    function toAtomOp(callArr) {
        let toArr = []
        let valueArr = []
        let dataArr = []
        for (let i=0; i<callArr.length; i++) {
            let to = callArr[i].to
            let value = callArr[i].value
            let data = callArr[i].data

            toArr.push(to)
            valueArr.push(value)
            dataArr.push(data)
        }
        return {toArr, valueArr, dataArr}
    }


    async function atomSign(signer, fromWallet, callArr) {
        let {toArr, valueArr, dataArr} = toAtomOp(callArr)

        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let wallet = SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [toArr, valueArr, dataArr, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return {toArr, valueArr, dataArr, deadline, chainId, fromWallet, valid, signature}
    }


    async function print() {
        console.log('')
        
        let objArr = [
            {name:'account0', address:accounts[0].address},
            {name:'account1', address:accounts[1].address},
            {name:'subBundler', address:subBundler.address},
            {name:'wallet', address:wallet.address}
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
