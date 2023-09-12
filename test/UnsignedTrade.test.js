const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const { ethers } = require('hardhat')
const { computePoolAddress, FeeAmount, Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade } = require('@uniswap/v3-sdk')
const { SupportedChainId, Token, Ether, Currency, CurrencyAmount, Percent, TradeType } = require('@uniswap/sdk-core')
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')

//mainnet
const ChainId = SupportedChainId.MAINNET
const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const QUOTER_CONTRACT_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const WETH_CONTRACT_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const USDC_CONTRACT_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'

//localhost fork from mainnet
// const bundlerManagerAddr = '0x0B1a87021ec75fBaE919b1e86b2B1335FFC8F4d3'
// const bundlerAddr = '0x5434e8FC67e9285d0DA256f81359610faF34Bc02'
// const factoryAddr = '0x18eb8AF587dcd7E4F575040F6D800a6B5Cef6CAf'
// const walletAddr = '0x94f4C1743d0a8d4F1b7792DD34Cf5A9F5ea97BCD'


const NATIVE_ETH = new Ether(ChainId)
const WETH_TOKEN = new Token(ChainId, WETH_CONTRACT_ADDRESS, 18, 'WETH', 'Wrapped Ether')
const USDC_TOKEN = new Token(ChainId, USDC_CONTRACT_ADDRESS, 6, 'USDC', 'USD Coin')

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

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'


describe('UnsignedTrade.test', function () {
    let chainId
    let accounts
    let signer
    let provider
    let wallet
    let bundler
    let bundlerManager
    let unsignedHelp

    before(async function () {
        accounts = await ethers.getSigners()
        signer = accounts[0]
        provider = signer.provider
        chainId = (await provider.getNetwork()).chainId

        console.log('signer', signer.address)
        console.log('chainId', chainId)

        const ERC20 = await ethers.getContractFactory('MockERC20', signer)
        usdc = ERC20.attach(USDC_CONTRACT_ADDRESS)
        weth = ERC20.attach(WETH_CONTRACT_ADDRESS)
    })

    it('deploy BundlerManager Bundler WalletFactory', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('const bundlerManagerAddr =', bundlerManager.address)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('const bundlerAddr =', bundler.address)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy()
        await factory.deployed()
        console.log('const factoryAddr =', factory.address)

        const UnsignedHelp = await ethers.getContractFactory('UnsignedHelp')
        unsignedHelp = await UnsignedHelp.deploy()
        await unsignedHelp.deployed()
        console.log('unsignedHelp deployed:', unsignedHelp.address)
    })

    it('createWallet', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let tx = await (await factory.createWallet(accounts[1].address, bundler.address)).wait()
        let walletAddr = tx.events[0].args[0]
        wallet = SmartWallet.attach(walletAddr)
        console.log('const walletAddr =', wallet.address)
    })


    // it('attach', async function () {
    //     const BundlerManager = await ethers.getContractFactory('BundlerManager')
    //     bundlerManager = BundlerManager.attach(bundlerManagerAddr)

    //     const Bundler = await ethers.getContractFactory('Bundler')
    //     bundler = Bundler.attach(bundlerAddr)

    //     const WalletFactory = await ethers.getContractFactory('WalletFactory')
    //     factory = WalletFactory.attach(factoryAddr)

    //     const SmartWallet = await ethers.getContractFactory('SmartWallet')
    //     wallet = SmartWallet.attach(walletAddr)

    //     await print()
    // })


    it('deposit', async function () {
        await accounts[0].sendTransaction({to: wallet.address, value: m(5, 18)})
        console.log('transfer ETH to', wallet.address)

        await accounts[0].sendTransaction({to: bundler.address, value: m(5, 18)})
        console.log('transfer ETH to', bundler.address)

        await print()
    })
   
   
    let tokenIn = NATIVE_ETH
    let tokenOut = USDC_TOKEN
    let amountIn = m(1, tokenIn.decimals)
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


    let atomSignParams
    it('place order', async function () {
        const ERC20 = await ethers.getContractFactory('MockERC20')
        const Bundler = await ethers.getContractFactory('Bundler')
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        const UnsignedHelp = await ethers.getContractFactory('UnsignedHelp')

        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        //send amountIn ETH to bundler
        to = bundler.address
        value = amountIn
        data = '0x'
        callArr.push({to, value, data})

        //call bundler.bundlerCallback2
        to = bundler.address
        value = 0
        data = Bundler.interface.encodeFunctionData('bundlerCallback2(bytes)', ['0x'])
        console.log('bundlerCallback2(bytes)', data, utils.keccak256(data))
        callArr.push({to, value, data})
      
        //want amountOut-2 USDC from bundler
        to = bundler.address
        value = 0
        let wantUSDCAmount = amountOut.sub(m(2, USDC_TOKEN.decimals))
        data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', [wallet.address, wantUSDCAmount])
        data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [usdc.address, 0, data])
        callArr.push({to, value, data})

        let atomCallBytes = convertCallArrToCallBytes(callArr)

        to = unsignedHelp.address
        data = UnsignedHelp.interface.encodeFunctionData('atomSignCallWithUnsignedData(bytes,bytes)', [
            atomCallBytes, '0x'
        ])

        atomSignParams = await atomSign(accounts[1], wallet.address, to, data)
        console.log('atomSign done')
    })


    it('bundler executeOperation', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        const ERC20 = await ethers.getContractFactory('MockERC20')
        const Bundler = await ethers.getContractFactory('Bundler')

        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        //bundler: ERC20(ExactIn) swap to USD
        //1.approve
        // if (tokenInAddr !== NATIVE_ETH_ADDRESS) {
        //     let token = ERC20.attach(tokenInAddr)
        //     let allowance = await token.allowance(subBundler.address, chainInfo.SwapRouterAddr)
        //     if (allowance.lt(amountIn)) {
        //         to = tokenInAddr
        //         value = 0
        //         data = ERC20.interface.encodeFunctionData('approve(address,uint256)', [chainInfo.SwapRouterAddr, MAX_UINT256])
        //         callArr.push({to, value, data})
        //         console.log('[token_usd][executeOrder] add approve')
        //     }
        // }

        //swap
        let uncheckedTrade = Trade.createUncheckedTrade({
            route: swapRoute,
            inputAmount: CurrencyAmount.fromRawAmount(
                swapRoute.input,
                amountIn
            ),
            outputAmount: CurrencyAmount.fromRawAmount(
                swapRoute.output,
                amountOut
            ),
            tradeType: TradeType.EXACT_INPUT,
        })

        let options = {
            slippageTolerance: new Percent(1, 10000),
            deadline: Math.floor(Date.now() / 1000) + 60,
            recipient: bundler.address
        }
        let methodParameters = SwapRouter.swapCallParameters([uncheckedTrade], options)

        to = SWAP_ROUTER_ADDRESS
        value = methodParameters.value
        data = methodParameters.calldata
        callArr.push({ to, value, data })

        let unsignedData = convertCallArrToCallBytes(callArr)

        let p = atomSignParams
        data = SmartWallet.interface.encodeFunctionData('delegateCallWithUnsignedData(address,bytes,uint32,bytes,bytes)', [
            p.to, p.data, p.deadline, p.signature, unsignedData
        ])

        let estimateGas = await bundler.estimateGas.executeOperation(wallet.address, data)
        await bundler.executeOperation(wallet.address, data)
        console.log('executeOperation done, gasCost:', estimateGas) //297300

        await print()
    })


    async function atomSign(signer, fromWallet, to, data) {
        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let wallet = SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let msg = utils.hexConcat([
            to,
            data,
            utils.hexZeroPad(deadline, 4),
            utils.hexZeroPad(chainId, 32),
            fromWallet,
            utils.hexZeroPad(valid, 4)
        ])

        let hash = utils.keccak256(msg)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return { deadline, chainId, fromWallet, to, data, valid, signature }
    }


    function convertCallArrToCallBytes(callArr) {
        let atomCallBytes = '0x'
        for (let i=0; i<callArr.length; i++) {
            let to = callArr[i].to
            let value = callArr[i].value
            let data = callArr[i].data
            
            let len = utils.arrayify(data).length
            atomCallBytes = utils.hexConcat([atomCallBytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
        }
        return atomCallBytes
    }


    async function print() {
        console.log('')
        
        console.log('account0 usdc:', d(await usdc.balanceOf(accounts[0].address), USDC_TOKEN.decimals), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdc:', d(await usdc.balanceOf(accounts[1].address), USDC_TOKEN.decimals), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('bundler usdc:', d(await usdc.balanceOf(bundler.address), USDC_TOKEN.decimals), 'eth:', d(await provider.getBalance(bundler.address), 18))
        console.log('wallet usdc:', d(await usdc.balanceOf(wallet.address), USDC_TOKEN.decimals), 'eth:', d(await provider.getBalance(wallet.address), 18))

        console.log('')
    }
})
