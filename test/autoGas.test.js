const util = require('util')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const { ethers } = require('hardhat')
const { computePoolAddress, FeeAmount, Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade } = require('@uniswap/v3-sdk')
const { SupportedChainId, Token, Ether, Currency, CurrencyAmount, Percent, TradeType } = require('@uniswap/sdk-core')
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')
const QuoterV3Help = require('./help/QuoterV3Help')

//mainnet
const ChainId = SupportedChainId.MAINNET
const POOL_FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F'

const NATIVE_ETH = new Ether(ChainId)
const WETH_TOKEN = new Token(ChainId, WETH_ADDRESS, 18, 'WETH', 'Wrapped Ether')
const USDC_TOKEN = new Token(ChainId, USDC_ADDRESS, 6, 'USDC', 'USD Coin')
const USDT_TOKEN = new Token(ChainId, USDT_ADDRESS, 6, 'USDT', 'Tether USD')
const DAI_TOKEN = new Token(ChainId, DAI_ADDRESS, 18, 'DAI', 'Dai Stablecoin')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
const MAX_UINT256 = b('115792089237316195423570985008687907853269984665640564039457584007913129639935')


describe('autoGas.test', function () {
    let chainId
    let accounts
    let signer
    let provider
    let usdc
    let usdt
    let dai
    let weth
    let bundler
    let bundlerManager
    let factory
    let autoGasHelp


    before(async function () {
        accounts = await ethers.getSigners()
        signer = accounts[0]
        provider = signer.provider
        chainId = (await provider.getNetwork()).chainId

        console.log('signer', signer.address)
        console.log('chainId', chainId)

        const ERC20 = await ethers.getContractFactory('MockERC20')
        usdc = ERC20.attach(USDC_ADDRESS)
        usdt = ERC20.attach(USDT_ADDRESS)
        dai = ERC20.attach(DAI_ADDRESS)
        weth = ERC20.attach(WETH_ADDRESS)
    })


    it('deploy BundlerManager Bundler WalletFactory QuoterV3', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager', signer)
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('const bundlerManagerAddr =', bundlerManager.address)
        
        const Bundler = await ethers.getContractFactory('Bundler', signer)
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('const bundlerAddr =', bundler.address)
        
        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy([USDC_ADDRESS, USDT_ADDRESS, DAI_ADDRESS], 1)
        await factory.deployed()
        console.log('const factoryAddr =', factory.address)
        
        const QuoterV3 = await ethers.getContractFactory('QuoterV3')
        const quoterV3 = await QuoterV3.deploy(POOL_FACTORY_ADDRESS, WETH_ADDRESS)
        await quoterV3.deployed()
        console.log('const quoterV3Addr =', quoterV3.address)
        
        const AutoGasHelp = await ethers.getContractFactory('AutoGasHelp')
        autoGasHelp = await AutoGasHelp.deploy()
        await autoGasHelp.deployed()
        console.log('const autoGasHelp =', autoGasHelp.address)

        await QuoterV3Help.setup({
            ChainId,
            POOL_FACTORY_ADDRESS,
            SWAP_ROUTER_ADDRESS,
            WETH_ADDRESS,
            USDC_ADDRESS,
            USDT_ADDRESS,
            DAI_ADDRESS,
            QuoterV3Addr: quoterV3.address
        })
    })


    let wallet0Addr
    it('computeWalletAddr && deposit', async function () {
        let nonce = await factory.nonceOf(accounts[0].address)
        nonce++
        wallet0Addr = await factory.computeWalletAddr(accounts[0].address, nonce)

        await usdc.transfer(wallet0Addr, m(1, 6))
        console.log('deposit 1 USDC to wallet0Addr', wallet0Addr)

        await print()
    })


    it('createWallet', async function () {
        await factory.createWallet(accounts[0].address, bundler.address)

        let hasWallet = await factory.wallets(wallet0Addr)
        console.log('wallet0 is created:', hasWallet)

        await print()
    })


    it('approve', async function () {
        const ERC20 = await ethers.getContractFactory('MockERC20')
        const Bundler = await ethers.getContractFactory('Bundler')
        const SmartWallet = await ethers.getContractFactory('SmartWallet')

        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = bundler.address
        value = 0
        data = ERC20.interface.encodeFunctionData('approve(address,uint256)', [SWAP_ROUTER_ADDRESS, MAX_UINT256])
        data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [USDC_ADDRESS, 0, data])
        callArr.push({ to, value, data })

        to = bundler.address
        value = 0
        data = ERC20.interface.encodeFunctionData('approve(address,uint256)', [SWAP_ROUTER_ADDRESS, MAX_UINT256])
        data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [USDT_ADDRESS, 0, data])
        callArr.push({ to, value, data })

        to = bundler.address
        value = 0
        data = ERC20.interface.encodeFunctionData('approve(address,uint256)', [SWAP_ROUTER_ADDRESS, MAX_UINT256])
        data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [DAI_ADDRESS, 0, data])
        callArr.push({ to, value, data })

        let p = await atomSign(accounts[0], wallet0Addr, callArr)
        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallBytes, p.deadline, p.signature])

        await bundler.executeOperation(wallet0Addr, calldata)
        console.log('approve done')
    })


    let wallet1Addr
    it('computeWalletAddr && deposit', async function () {
        let nonce = await factory.nonceOf(accounts[1].address)
        nonce++
        wallet1Addr = await factory.computeWalletAddr(accounts[1].address, nonce)

        await usdc.transfer(wallet1Addr, m(2, 6))
        console.log('deposit 2 USDC to wallet1Addr:', wallet1Addr)

        await usdc.transfer(bundler.address, m(100, 6))
        console.log('deposit 100 USDC to bundler')

        await print()
    })


    it('bundlerManager bundle: createWallet & transfer', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        const Bundler = await ethers.getContractFactory('Bundler')
        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        const SmartWallet = await ethers.getContractFactory('SmartWallet')

        let atomSignParamsArr = []

        //wallet0: createWallet
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = factory.address
        value = 0
        data = WalletFactory.interface.encodeFunctionData('createWallet(address,address)',
            [accounts[1].address, bundler.address])
        callArr.push({ to, value, data })

        let atomSignParams = await atomSign(accounts[0], wallet0Addr, callArr)
        atomSignParamsArr.push(atomSignParams)

        //wallet1: transfer
        callArr = []
        to = '0x'
        value = 0
        data = '0x'

        to = usdc.address
        value = 0
        const ERC = await ethers.getContractFactory('MockERC20')
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(1, 6)])
        callArr.push({ to, value, data })

        atomSignParams = await atomSign(accounts[1], wallet1Addr, callArr)
        atomSignParamsArr.push(atomSignParams)

        //do autoGas when adminEOA has few gas
        let usdcBalance = await usdc.balanceOf(bundler.address)
        let needAutoGas = usdcBalance.gte(m(100, 6))
        if (needAutoGas) {
            atomSignParams = await autoGas()
            atomSignParamsArr.push(atomSignParams)
        }

        let bundleDataArr = []
        for (let p of atomSignParamsArr) {
            let atomSignData = SmartWallet.interface.encodeFunctionData('atomSignCall',
                [p.atomCallBytes, p.deadline, p.signature])

            let bundleData = Bundler.interface.encodeFunctionData('executeOperation',
                [p.fromWallet, atomSignData])

            bundleDataArr.push(bundleData)
            console.log('fromWallet:', p.fromWallet)
        }
        let tx = await (await bundlerManager.bundle(bundleDataArr, { gasLimit:10000000 })).wait()
        // console.log(util.inspect(tx, false, 6))
        console.log('bundle gas used:', tx.cumulativeGasUsed, 'gas price:', tx.effectiveGasPrice)

        //check result
        let hasWallet = await factory.wallets(wallet1Addr)
        console.log('wallet1 is created:', hasWallet)

        await print()
    })


    async function autoGas() {
        const ERC20 = await ethers.getContractFactory('MockERC20')
        const Bundler = await ethers.getContractFactory('Bundler')
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        const AutoGasHelp = await ethers.getContractFactory('AutoGasHelp')

        const adminEOA = accounts[0]
        const adminWalletAddr = wallet0Addr
        const coldWalletAddr = accounts[1].address
        const maxGas = m(0.02, 18)
        let ethOut = b(0)

        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        //1.bundler's USDs swap to adminWalletAddr's ETH
        let usdcBalance = await usdc.balanceOf(bundler.address)
        if (usdcBalance.gt(b(0))) {
            to = bundler.address
            value = 0
            let { methodParameters, amountOut } = await swapFromBundler(USDC_TOKEN, NATIVE_ETH, usdcBalance, adminWalletAddr)
            data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)',
                [SWAP_ROUTER_ADDRESS, methodParameters.value, methodParameters.calldata]
            )
            callArr.push({ to, value, data })
            ethOut = ethOut.add(amountOut)
        }

        let usdtBalance = await usdt.balanceOf(bundler.address)
        if (usdtBalance.gt(b(0))) {
            to = bundler.address
            value = 0
            let { methodParameters, amountOut } = await swapFromBundler(USDT_TOKEN, NATIVE_ETH, usdtBalance, adminWalletAddr)
            data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)',
                [SWAP_ROUTER_ADDRESS, methodParameters.value, methodParameters.calldata]
            )
            callArr.push({ to, value, data })
            ethOut = ethOut.add(amountOut)
        }

        let daiBalance = await dai.balanceOf(bundler.address)
        if (daiBalance.gt(b(0))) {
            to = bundler.address
            value = 0
            let { methodParameters, amountOut } = await swapFromBundler(DAI_TOKEN, NATIVE_ETH, daiBalance, adminWalletAddr)
            data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)',
                [SWAP_ROUTER_ADDRESS, methodParameters.value, methodParameters.calldata]
            )
            callArr.push({ to, value, data })
            ethOut = ethOut.add(amountOut)
        }

        console.log('ethOut:', d(ethOut, 18))

        //2.adminWalletAddr transfer maxGas to adminEOA
        to = adminWalletAddr
        value = 0
        let transferETHData = AutoGasHelp.interface.encodeFunctionData('transferETH(address,uint256)', [
            adminEOA.address, maxGas
        ])
        data = SmartWallet.interface.encodeFunctionData('delegateCall(address,bytes)', [
            autoGasHelp.address, transferETHData
        ])
        callArr.push({to, value, data})

        //3.adminWalletAddr transfer left ETH to coldWalletAddr
        if (coldWalletAddr != adminWalletAddr) {
            to = adminWalletAddr
            value = 0
            let transferETHData = AutoGasHelp.interface.encodeFunctionData('transferETH(address,uint256)', [
                coldWalletAddr, MAX_UINT256
            ])
            data = SmartWallet.interface.encodeFunctionData('delegateCall(address,bytes)', [
                autoGasHelp.address, transferETHData
            ])
            callArr.push({to, value, data})
        }

        let atomSignParams = await atomSign(adminEOA, adminWalletAddr, callArr)
        return atomSignParams
    }


    async function swapFromBundler(tokenIn, tokenOut, amountIn, recipient) {
        let r0 = QuoterV3Help.getRoutersInfo(tokenIn, tokenOut)
        let r1 = QuoterV3Help.getRoutersInfo_USD(tokenIn, tokenOut)

        let best = await QuoterV3Help.getBestOfAmountOut([...r0, ...r1], amountIn)
        let amountOut = best.amountOut
        console.log('best:', best.routerStr)

        let pools = []
        for (let p of best.routerPools) {
            let pool = await getPool(p.tokenIn, p.tokenOut, p.fee)
            pools.push(pool)
        }

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
            tradeType: TradeType.EXACT_INPUT,
        })

        let options = {
            slippageTolerance: new Percent(10, 10000),
            deadline: Math.floor(Date.now() / 1000) + 600,
            recipient: recipient
        }
        let methodParameters = SwapRouter.swapCallParameters([uncheckedTrade], options)
        return { methodParameters, amountOut }
    }


    async function getPool(tokenA, tokenB, tradeFee) {
        let currentPoolAddress = computePoolAddress({
            factoryAddress: POOL_FACTORY_ADDRESS,
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


    async function atomSign(signer, fromWallet, callArr) {
        let atomCallBytes = '0x'
        for (let i = 0; i < callArr.length; i++) {
            let to = callArr[i].to
            let value = callArr[i].value
            let data = callArr[i].data
            let len = utils.arrayify(data).length
            atomCallBytes = utils.hexConcat([atomCallBytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
        }
        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let hasWallet = await factory.wallets(fromWallet)
        let valid = hasWallet ? await SmartWallet.attach(fromWallet).valid() : 1
        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallBytes, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])
        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))
        return { atomCallBytes, deadline, chainId, fromWallet, valid, signature }
    }


    async function print() {
        console.log('')

        console.log('account0 usdc:', d(await usdc.balanceOf(accounts[0].address), 6), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdc:', d(await usdc.balanceOf(accounts[1].address), 6), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('bundler usdc:', d(await usdc.balanceOf(bundler.address), 6), 'eth:', d(await provider.getBalance(bundler.address), 18))
        wallet0Addr && console.log('wallet0 usdc:', d(await usdc.balanceOf(wallet0Addr), 6), 'eth:', d(await provider.getBalance(wallet0Addr), 18))
        wallet1Addr && console.log('wallet1 usdc:', d(await usdc.balanceOf(wallet1Addr), 6), 'eth:', d(await provider.getBalance(wallet1Addr), 18))

        console.log('')
    }
})
