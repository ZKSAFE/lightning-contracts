const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'

describe('SmartWallet-Bundler.test', function () {
    let accounts
    let provider
    let wallet
    let bundler
    let bundlerManager
    let usdt
    let usdc
    let atomSignParams
    let walletHelper

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdt = await MockERC20.deploy('MockUSDT', 'USDT')
        await usdt.deployed()
        console.log('usdt deployed:', usdt.address)
        await usdt.setDecimals(6)
        await usdt.mint(accounts[0].address, m(10000, 6))
        console.log('usdt mint to accounts[0]', d(await usdt.balanceOf(accounts[0].address), 6))
        await usdt.mint(accounts[1].address, m(10000, 6))
        console.log('usdt mint to accounts[1]', d(await usdt.balanceOf(accounts[1].address), 6))
       
        usdc = await MockERC20.deploy('MockUSDC', 'USDC')
        await usdc.deployed()
        console.log('usdc deployed:', usdc.address)
        await usdc.setDecimals(6)
        await usdc.mint(accounts[0].address, m(10000, 6))
        console.log('usdc mint to accounts[0]', d(await usdc.balanceOf(accounts[0].address), 6))
        await usdc.mint(accounts[1].address, m(10000, 6))
        console.log('usdc mint to accounts[1]', d(await usdc.balanceOf(accounts[1].address), 6))
       
        dai = await MockERC20.deploy('MockDai', 'DAI')
        await dai.deployed()
        console.log('dai deployed:', dai.address)
        await dai.setDecimals(18)
        await dai.mint(accounts[0].address, m(10000, 18))
        console.log('dai mint to accounts[0]', d(await dai.balanceOf(accounts[0].address), 18))
        await dai.mint(accounts[1].address, m(10000, 18))
        console.log('dai mint to accounts[1]', d(await dai.balanceOf(accounts[1].address), 18))
    })


    it('deploy BundlerManager Bundler WalletFactory WalletHelper', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('bundlerManager deployed:', bundlerManager.address)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('bundler deployed:', bundler.address)

        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        wallet = await SmartWallet.deploy(accounts[1].address, bundler.address)
        await wallet.deployed()
        console.log('wallet deployed:', wallet.address)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy()
        await factory.deployed()
        console.log('factory deployed:', factory.address)

        const WalletHelperV1 = await ethers.getContractFactory('WalletHelperV1')
        walletHelper = await WalletHelperV1.deploy(SWAP_ROUTER_ADDRESS)
        await walletHelper.deployed()
        console.log('walletHelper deployed:', walletHelper.address)
    })

    it('createWallet', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let tx = await (await factory.createWallet(accounts[1].address, bundler.address)).wait()
        let walletAddr = tx.events[0].args[0]
        wallet = SmartWallet.attach(walletAddr)
        console.log('const walletAddr =', wallet.address)
    })


    it('deposit', async function () {
        await accounts[0].sendTransaction({to: wallet.address, value: m(5, 18)})
        console.log('transfer ETH to', wallet.address)

        await accounts[0].sendTransaction({to: bundler.address, value: m(5, 18)})
        console.log('transfer ETH to', wallet.address)

        await usdt.transfer(wallet.address, m(80, 6))
        console.log('deposit USDT to', wallet.address)

        await usdc.transfer(wallet.address, m(50, 6))
        console.log('deposit USDC to', wallet.address)

        await dai.transfer(wallet.address, m(30, 18))
        console.log('deposit DAI to', wallet.address)

        await print()
    })


    it('account1 atomSign', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        const WalletHelperV1 = await ethers.getContractFactory('WalletHelperV1')

        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = wallet.address
        value = 0
        let transferStableCoinsData = WalletHelperV1.interface.encodeFunctionData('transferStableCoins(address[],uint256,address)', [
            [dai.address, usdc.address, usdt.address], m(99.1234, 6), bundler.address
        ])
        data = SmartWallet.interface.encodeFunctionData('delegateCall(address,bytes)', [
            walletHelper.address, transferStableCoinsData
        ])
        callArr.push({to, value, data})

        atomSignParams = await atomSign(accounts[1], wallet.address, callArr)
        console.log('atomSign done')
    })


    it('bundler executeOperation', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let p = atomSignParams
        let data = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallBytes, p.deadline, p.signature])

        let estimateGas = await bundler.estimateGas.executeOperation(wallet.address, data)
        await bundler.executeOperation(wallet.address, data)
        console.log('executeOperation done, gasCost:', estimateGas)

        await print()
    })


    async function atomSign(signer, fromWallet, callArr) {
        let atomCallBytes = '0x'
        for (let i=0; i<callArr.length; i++) {
            let to = callArr[i].to
            let value = callArr[i].value
            let data = callArr[i].data
            
            let len = utils.arrayify(data).length
            atomCallBytes = utils.hexConcat([atomCallBytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
        }

        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let wallet = await SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallBytes, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return { atomCallBytes, deadline, chainId, fromWallet, valid, signature }
    }


    async function print() {
        console.log('')
        
        console.log('account0 usdt:', d(await usdt.balanceOf(accounts[0].address), 6), 'usdc:', d(await usdc.balanceOf(accounts[0].address), 6), 'dai:', d(await dai.balanceOf(accounts[0].address), 18))
        console.log('account1 usdt:', d(await usdt.balanceOf(accounts[1].address), 6), 'usdc:', d(await usdc.balanceOf(accounts[1].address), 6), 'dai:', d(await dai.balanceOf(accounts[1].address), 18))
        console.log('bundler usdt:', d(await usdt.balanceOf(bundler.address), 6), 'usdc:', d(await usdc.balanceOf(bundler.address), 6), 'dai:', d(await dai.balanceOf(bundler.address), 18))
        console.log('wallet usdt:', d(await usdt.balanceOf(wallet.address), 6), 'usdc:', d(await usdc.balanceOf(wallet.address), 6), 'dai:', d(await dai.balanceOf(wallet.address), 18))

        console.log('')
    }
})
