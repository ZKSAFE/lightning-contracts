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
const USDT_CONTRACT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const PEPE_CONTRACT_ADDRESS = '0x6982508145454ce325ddbe47a25d4ec3d2311933'

//localhost fork from mainnet
const bundlerManagerAddr = '0x0B1a87021ec75fBaE919b1e86b2B1335FFC8F4d3'
const bundlerAddr = '0x5434e8FC67e9285d0DA256f81359610faF34Bc02'
const factoryAddr = '0x18eb8AF587dcd7E4F575040F6D800a6B5Cef6CAf'
const walletAddr = '0x94f4C1743d0a8d4F1b7792DD34Cf5A9F5ea97BCD'
const walletHelperAddr = '0xd6096fbEd8bCc461d06b0C468C8b1cF7d45dC92d'

const NATIVE_ETH = new Ether(ChainId)
const WETH_TOKEN = new Token(ChainId, WETH_CONTRACT_ADDRESS, 18, 'WETH', 'Wrapped Ether')
const USDC_TOKEN = new Token(ChainId, USDC_CONTRACT_ADDRESS, 6, 'USDC', 'USD Coin')
const USDT_TOKEN = new Token(ChainId, USDT_CONTRACT_ADDRESS, 6, 'USDT', 'Tether USD')
const PEPE_TOKEN = new Token(ChainId, PEPE_CONTRACT_ADDRESS, 18, 'PEPE', 'Pepe')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

const MAX_UINT256 = b('115792089237316195423570985008687907853269984665640564039457584007913129639935')


describe('USDsBuyPepe.test', function () {
    let chainId
    let accounts
    let signer
    let provider
    let wallet
    let bundler
    let bundlerManager

    before(async function () {
        accounts = await ethers.getSigners()
        signer = accounts[0]
        provider = signer.provider
        chainId = (await provider.getNetwork()).chainId

        console.log('signer', signer.address)
        console.log('chainId', chainId)
    })

    // it('deploy BundlerManager Bundler WalletFactory WalletHelperV1', async function () {
    //     const BundlerManager = await ethers.getContractFactory('BundlerManager')
    //     bundlerManager = await BundlerManager.deploy()
    //     await bundlerManager.deployed()
    //     console.log('const bundlerManagerAddr =', bundlerManager.address)

    //     const Bundler = await ethers.getContractFactory('Bundler')
    //     bundler = Bundler.attach(await bundlerManager.bundler())
    //     console.log('const bundlerAddr =', bundler.address)

    //     const WalletFactory = await ethers.getContractFactory('WalletFactory')
    //     factory = await WalletFactory.deploy()
    //     await factory.deployed()
    //     console.log('const factoryAddr =', factory.address)

    //     const WalletHelperV1 = await ethers.getContractFactory('WalletHelperV1')
    //     let walletHelper = await WalletHelperV1.deploy(SWAP_ROUTER_ADDRESS)
    //     await walletHelper.deployed()
    //     console.log('const walletHelperAddr =', walletHelper.address)
    // })

    // it('createWallet', async function () {
    //     const SmartWallet = await ethers.getContractFactory('SmartWallet')
    //     let tx = await (await factory.createWallet(accounts[1].address, bundler.address)).wait()
    //     let walletAddr = tx.events[0].args[0]
    //     wallet = SmartWallet.attach(walletAddr)
    //     console.log('const walletAddr =', wallet.address)
    // })


    it('attach', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = BundlerManager.attach(bundlerManagerAddr)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(bundlerAddr)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = WalletFactory.attach(factoryAddr)

        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        wallet = SmartWallet.attach(walletAddr)

        const WalletHelperV1 = await ethers.getContractFactory('WalletHelperV1')
        walletHelper = WalletHelperV1.attach(walletHelperAddr)

        await print()
    })


    // it('transfer', async function () {
    //     const SmartWallet = await ethers.getContractFactory('SmartWallet')
    //     const ERC20 = await ethers.getContractFactory('MockERC20', signer)

    //     let usdc = ERC20.attach(USDC_CONTRACT_ADDRESS)
    //     let usdt = ERC20.attach(USDT_CONTRACT_ADDRESS)
    //     let weth = ERC20.attach(WETH_CONTRACT_ADDRESS)
    //     let pepe = ERC20.attach(PEPE_CONTRACT_ADDRESS)

    //     // await accounts[0].sendTransaction({to: wallet.address, value: m(5, 18)})
    //     // console.log('transfer ETH to', wallet.address)

    //     // await accounts[0].sendTransaction({to: bundler.address, value: m(5, 18)})
    //     // console.log('transfer ETH to', bundler.address)
        
    //     let to = usdt.address
    //     let value = 0
    //     let data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', [bundler.address, m(1610, 6)])
    //     let callArr = [{ to, value, data }]
        
    //     let p  = await atomSign(accounts[1], wallet.address, callArr)
    //     let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallBytes, p.deadline, p.signature])
    //     await bundler.executeOperation(wallet.address, calldata)
    
    //     await print()
    // })

    //run once
    // it('approve', async function () {
    //     const ERC20 = await ethers.getContractFactory('MockERC20')
    //     const Bundler = await ethers.getContractFactory('Bundler')
    //     const SmartWallet = await ethers.getContractFactory('SmartWallet')

    //     let callArr = []
    //     let to = '0x'
    //     let value = 0
    //     let data = '0x'

    //     to = bundler.address
    //     value = 0
    //     data = ERC20.interface.encodeFunctionData('approve(address,uint256)', [SWAP_ROUTER_ADDRESS, MAX_UINT256])
    //     data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [usdc.address, 0, data])
    //     callArr.push({ to, value, data })

    //     to = bundler.address
    //     value = 0
    //     data = ERC20.interface.encodeFunctionData('approve(address,uint256)', [SWAP_ROUTER_ADDRESS, MAX_UINT256])
    //     data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [usdt.address, 0, data])
    //     callArr.push({ to, value, data })

    //     let p = await atomSign(accounts[1], wallet.address, callArr)
    //     let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallBytes, p.deadline, p.signature])

    //     await bundler.executeOperation(wallet.address, calldata)
    //     console.log('approve done')
    // })



    let tokenIn = USDC_TOKEN
    let tokenOut = PEPE_TOKEN
    let amountIn
    let amountOut = m(10000000, tokenOut.decimals)
    let swapRoute
    it('quote', async function () {
        //USDC -> WETH
        let pool0 = await getPool(USDC_TOKEN, WETH_TOKEN, FeeAmount.LOW)

        //WETH -> PEPE
        let pool1 = await getPool(WETH_TOKEN, PEPE_TOKEN, FeeAmount.HIGH)

        // console.log('pool:', pool)

        swapRoute = new Route(
            [pool0, pool1],
            tokenIn,
            tokenOut
        )

        let { calldata } = SwapQuoter.quoteCallParameters(
            swapRoute,
            CurrencyAmount.fromRawAmount(
                tokenOut,
                amountOut
            ),
            TradeType.EXACT_OUTPUT,
            {
                useQuoterV2: true,
            }
        )

        let quoteCallReturnData = await provider.call({
            to: QUOTER_CONTRACT_ADDRESS,
            data: calldata,
        })

        amountIn = utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)[0]
        console.log('amountIn:', d(amountIn, tokenIn.decimals))
    })

    async function getPool(tokenA, tokenB, tradeFee) {
        let currentPoolAddress = computePoolAddress({
            factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
            tokenA: tokenA.isNative ? WETH_TOKEN : tokenA,
            tokenB: tokenB.isNative ? WETH_TOKEN : tokenB,
            fee: tradeFee,
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

        return new Pool(
            tokenA.isNative ? WETH_TOKEN : tokenA,
            tokenB.isNative ? WETH_TOKEN : tokenB,
            tradeFee,
            slot0[0].toString(),
            liquidity.toString(),
            slot0[1]
        )
    }


    let atomSignParams
    it('place order', async function () {
        const ERC20 = await ethers.getContractFactory('MockERC20')
        const Bundler = await ethers.getContractFactory('Bundler')
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        const WalletHelperV1 = await ethers.getContractFactory('WalletHelperV1')

        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        //1. swapStableCoins 
        to = wallet.address
        value = 0
        let decimals6Total = amountIn.div(m(1, tokenIn.decimals - 6))
        console.log('decimals6Total:', decimals6Total)
        let swapStableCoinsData = WalletHelperV1.interface.encodeFunctionData('swapStableCoins(address[],uint256,address)', [
            [USDT_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS], decimals6Total, USDC_CONTRACT_ADDRESS
        ])
        data = SmartWallet.interface.encodeFunctionData('delegateCall(address,bytes)', [
            walletHelperAddr, swapStableCoinsData
        ])
        
        callArr.push({ to, value, data })

        //2. transfer (amountIn + 2) USDC to Bundler
        to = USDC_CONTRACT_ADDRESS
        value = 0
        let payUSDCAmount = amountIn.add(m(2, tokenIn.decimals))
        data = ERC20.interface.encodeFunctionData('transfer(address,uint256)', [bundler.address, payUSDCAmount])
        callArr.push({ to, value, data })

        //3. USDC swap(ExactOut) Token to Wallet
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
            tradeType: TradeType.EXACT_OUTPUT,
        })

        let options = {
            slippageTolerance: new Percent(1, 10000),
            deadline: Math.floor(Date.now() / 1000) + 60,
            recipient: wallet.address
        }
        let methodParameters = SwapRouter.swapCallParameters([uncheckedTrade], options)

        to = bundler.address
        value = 0
        data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', 
                        [SWAP_ROUTER_ADDRESS, methodParameters.value, methodParameters.calldata])
        callArr.push({ to, value, data })

        atomSignParams = await atomSign(accounts[1], wallet.address, callArr)
        console.log('atomSign done')
    })


    it('bundler executeOperation', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')

        let p = atomSignParams
        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallBytes, p.deadline, p.signature])
        
        let estimateGas = await bundler.estimateGas.executeOperation(wallet.address, calldata)
        await bundler.executeOperation(wallet.address, calldata)
        console.log('executeOperation done, gasCost:', estimateGas) //331339 432011(USDT+USDC->WETH->PEPE)

        await print()
    })


    async function atomSign(signer, fromWallet, callArr) {
        let atomCallBytes = convertCallArrToCallBytes(callArr)

        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let wallet = SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallBytes, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return { atomCallBytes, deadline, chainId, fromWallet, valid, signature }
    }


    function convertCallArrToCallBytes(callArr) {
        let atomCallBytes = '0x'
        for (let i = 0; i < callArr.length; i++) {
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

        const ERC20 = await ethers.getContractFactory('MockERC20', signer)
        let usdc = ERC20.attach(USDC_CONTRACT_ADDRESS)
        let usdt = ERC20.attach(USDT_CONTRACT_ADDRESS)
        let weth = ERC20.attach(WETH_CONTRACT_ADDRESS)
        let pepe = ERC20.attach(PEPE_CONTRACT_ADDRESS)

        console.log('account0 usdc:', d(await usdc.balanceOf(accounts[0].address), USDC_TOKEN.decimals), 'usdt:', d(await usdt.balanceOf(accounts[0].address), USDT_TOKEN.decimals), 'weth:', d(await weth.balanceOf(accounts[0].address), 18), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdc:', d(await usdc.balanceOf(accounts[1].address), USDC_TOKEN.decimals), 'usdt:', d(await usdt.balanceOf(accounts[1].address), USDT_TOKEN.decimals), 'weth:', d(await weth.balanceOf(accounts[1].address), 18), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('bundler usdc:', d(await usdc.balanceOf(bundler.address), USDC_TOKEN.decimals), 'usdt:', d(await usdt.balanceOf(bundler.address), USDT_TOKEN.decimals), 'weth:', d(await weth.balanceOf(bundler.address), 18), 'pepe:', d(await pepe.balanceOf(bundler.address), 18))
        console.log('wallet usdc:', d(await usdc.balanceOf(wallet.address), USDC_TOKEN.decimals), 'usdt:', d(await usdt.balanceOf(wallet.address), USDT_TOKEN.decimals), 'weth:', d(await weth.balanceOf(wallet.address), 18), 'pepe:', d(await pepe.balanceOf(wallet.address), 18))

        console.log('')
    }
})
