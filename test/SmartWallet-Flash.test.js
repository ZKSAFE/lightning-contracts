const { BigNumber, utils } = require('ethers')
const { ethers } = require('hardhat')
const snarkjs = require("snarkjs")
const fs = require("fs")
const { computePoolAddress, FeeAmount, Pool, Route, SwapOptions, SwapQuoter, SwapRouter, Trade } = require('@uniswap/v3-sdk')
const { SupportedChainId, Token, Ether, Currency, CurrencyAmount, Percent, TradeType } = require('@uniswap/sdk-core')
const IUniswapV3PoolABI = require('@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json')

//mainnet
const ChainId = SupportedChainId.MAINNET
const POOL_FACTORY_CONTRACT_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
const QUOTER_CONTRACT_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'
const WETH_CONTRACT_ADDRESS = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
const USDC_CONTRACT_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

const NATIVE_ETH = new Ether(ChainId)
const WETH_TOKEN = new Token(ChainId,WETH_CONTRACT_ADDRESS,18,'WETH','Wrapped Ether')
const USDC_TOKEN = new Token(ChainId,USDC_CONTRACT_ADDRESS,6,'USDC','USD Coin')


describe('SmartWallet-Flash-test', function () {
    let accounts
    let provider
    let wallet
    let bundler
    let subBundler
    let signData
    let usdc
    let weth

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })


    it('attach', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdc = MockERC20.attach(USDC_CONTRACT_ADDRESS)
        weth = MockERC20.attach(WETH_CONTRACT_ADDRESS)

        // const Bundler = await ethers.getContractFactory('Bundler')
        // bundler = Bundler.attach('0x82BBAA3B0982D88741B275aE1752DB85CAfe3c65')

        // const SubBundler = await ethers.getContractFactory('SubBundler')
        // subBundler = SubBundler.attach('0x6b7cf4f9Ab6aeDC97116850Ec71ce56eB1C65f8A')

        // const SmartWallet = await ethers.getContractFactory('SmartWallet')
        // wallet = SmartWallet.attach('0x084815D1330eCC3eF94193a19Ec222C0C73dFf2d')
    })


    it('deploy Bundler SubBundler SmartWallet', async function () {
        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = await Bundler.deploy()
        await bundler.deployed()
        console.log('bundler deployed:', bundler.address)

        const SubBundler = await ethers.getContractFactory('SubBundler')
        subBundler = SubBundler.attach(await bundler.subBundler())
        console.log('subBundler deployed:', subBundler.address)

        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        wallet = await SmartWallet.deploy(accounts[1].address, subBundler.address)
        await wallet.deployed()
        console.log('wallet deployed:', wallet.address)
    })


    it('deposit', async function () {
        await accounts[0].sendTransaction({to: subBundler.address, value: m(1, 18)})
        console.log('transfer ETH to', subBundler.address)

        await usdc.transfer(subBundler.address, m(1, 6))
        console.log('deposit ERC20 to', subBundler.address)

        await print()
    })


    it('account1 atomSign', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = subBundler.address
        value = 0
        const SubBundler = await ethers.getContractFactory('SubBundler')
        data = SubBundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [wallet.address, m(0.1, 18), []])
        callArr.push({to, value, data})
        
        // to = usdc.address
        // value = 0
        // const ERC = await ethers.getContractFactory('MockERC20')
        // data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [subBundler.address, m(1, 18)])
        // callArr.push({to, value, data})

        signData = await atomSign(accounts[1], wallet.address, callArr)
        console.log('atomSign done')
    })


    // it('bundler executeOp', async function () {
    //     const SmartWallet = await ethers.getContractFactory('SmartWallet')
    //     const MockERC20 = await ethers.getContractFactory('MockERC20')

    //     let s = signData
    //     let callData = SmartWallet.interface.encodeFunctionData('atomSignCall', [s.toArr, s.valueArr, s.dataArr, s.deadline, s.signature])
        
    //     let { poolAddress, token0, token1, fee } = await getPoolInfo()
    //     console.log('token0:', token0, 'token1:', token1)

    //     let borrowAmount0 = m(100, 6)
    //     console.log('token0 is USDC')
        
    //     let borrowFee = borrowAmount0.mul(fee).div(1e6)
    //     console.log('borrowFee:', borrowFee)

    //     let paybackData = MockERC20.interface.encodeFunctionData('transfer', [poolAddress, borrowAmount0.add(borrowFee)])
        
    //     let data = utils.defaultAbiCoder.encode(
    //         ['address[]', 'uint256[]', 'bytes[]'], 
    //         [[wallet.address, usdc.address], [0, 0], [callData, paybackData]]
    //     )

    //     let bytes = utils.defaultAbiCoder.encode(
    //         ['address', 'uint256', 'uint256', 'bytes'], 
    //         [poolAddress, borrowAmount0, 0, data]
    //     )

    //     let estimateGas = await bundler.estimateGas.bundle([false], [bytes])
    //     console.log('estimateGas', estimateGas) //there's a bug, estimateGas may be less than the real gas cost, if using try..catch in solidity
    //     let tx = await (await bundler.bundle([false], [bytes], { gasLimit:estimateGas })).wait()
    //     console.log(tx)

    //     await print()
    // })

    it('subBundler executeOp', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        const MockERC20 = await ethers.getContractFactory('MockERC20')

        let s = signData
        let callData = SmartWallet.interface.encodeFunctionData('atomSignCall', [s.toArr, s.valueArr, s.dataArr, s.deadline, s.signature])
        
        let { poolAddress, token0, token1, fee } = await getPoolInfo()
        console.log('token0:', token0, 'token1:', token1)

        let borrowAmount0 = m(100, 6)
        console.log('token0 is USDC')
        
        let borrowFee = borrowAmount0.mul(fee).div(1e6)
        console.log('borrowFee:', borrowFee)

        let paybackData = MockERC20.interface.encodeFunctionData('transfer', [poolAddress, borrowAmount0.add(borrowFee)])
        
        let bytes = utils.defaultAbiCoder.encode(
            ['address[]', 'uint256[]', 'bytes[]'], 
            [[wallet.address, usdc.address], [0, 0], [callData, paybackData]]
        )

        //without payback
        // let bytes = utils.defaultAbiCoder.encode(
        //     ['address[]', 'uint256[]', 'bytes[]'], 
        //     [[wallet.address], [0], [callData]]
        // )

        let re = await subBundler.executeFlash(poolAddress, borrowAmount0, 0, bytes)
        console.log('re', re)
        let tx = await re.wait()
        console.log('tx', tx)
        // const SubBundler = await ethers.getContractFactory('SubBundler')
        // SubBundler.interface.decodeFunctionResult('executeFlash', tx.)

        await print()
    })


    async function atomSign(signer, fromWallet, callArr) {
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

        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let wallet = await SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [toArr, valueArr, dataArr, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return {toArr, valueArr, dataArr, deadline, chainId, fromWallet, valid, signature}
    }


    async function getPoolInfo() {
        let poolAddress = computePoolAddress({
            factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
            tokenA: USDC_TOKEN,
            tokenB: WETH_TOKEN,
            fee: FeeAmount.LOW,
        })

        let poolContract = new ethers.Contract(
            poolAddress,
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
            poolAddress,
            token0,
            token1,
            fee,
            tickSpacing,
            liquidity,
            sqrtPriceX96: slot0[0],
            tick: slot0[1],
        }
    }


    async function print() {
        console.log('')
        
        console.log('account0 usdc:', d(await usdc.balanceOf(accounts[0].address), 6), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdc:', d(await usdc.balanceOf(accounts[1].address), 6), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('subBundler usdc:', d(await usdc.balanceOf(subBundler.address), 6), 'eth:', d(await provider.getBalance(subBundler.address), 18))
        console.log('wallet usdc:', d(await usdc.balanceOf(wallet.address), 6), 'eth:', d(await provider.getBalance(wallet.address), 18))

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
