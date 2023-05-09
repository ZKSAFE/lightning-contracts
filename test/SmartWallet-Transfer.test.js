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

const transferTo = '0xE44081Ee2D0D4cbaCd10b44e769A14Def065eD4D'

describe('SmartWallet-Maker-test', function () {
    let accounts
    let provider
    let wallet
    let subBundler
    let usdc
    let weth
    let check
    let signData = null

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


    it('attach', async function () {
        const SubBundler = await ethers.getContractFactory('SubBundler')
        subBundler = SubBundler.attach(SubBundler_Address)

        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        wallet = SmartWallet.attach(Wallet_Address)

        await print()
    })


    it('account1 atomSign', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = transferTo
        value = await provider.getBalance(wallet.address)
        data = '0x'
        if (n(value) > 0) {
            callArr.push({to, value, data})
        }
        
        to = usdc.address
        value = 0
        const ERC = await ethers.getContractFactory('MockERC20')
        let balance = await usdc.balanceOf(wallet.address)
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [transferTo, balance])
        if (n(balance) > 0) {
            callArr.push({to, value, data})
        }

        if (callArr.length > 0) {
            signData = await atomSign(accounts[1], wallet.address, callArr)
            console.log('atomSign done')
        } else {
            console.log('atomSign nothing')
        }
    })


    it('subBundler executeOp', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        if (signData) {
            to = wallet.address
            value = 0
            const SmartWallet = await ethers.getContractFactory('SmartWallet')
            let s = signData
            data = SmartWallet.interface.encodeFunctionData('atomSignCall', [s.toArr, s.valueArr, s.dataArr, s.deadline, s.signature])
            callArr.push({to, value, data})
            console.log('add atomSignCall')
        }

        to = usdc.address
        value = 0
        const ERC = await ethers.getContractFactory('MockERC20')
        let balance = await usdc.balanceOf(subBundler.address)
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [transferTo, balance])
        if (n(balance) > 0) {
            callArr.push({to, value, data})
            console.log('add transfer USDC')
        }

        to = transferTo
        value = await provider.getBalance(subBundler.address)
        data = '0x'
        if (n(value) > 0) {
            callArr.push({to, value, data})
            console.log('add transfer ETH')
        }

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
