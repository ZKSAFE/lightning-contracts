const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

describe('SmartWallet-Bundler.test', function () {
    let accounts
    let provider
    let bundler
    let bundlerManager
    let usdt
    let usdc
    let dai
    let factory
    

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdt = await MockERC20.deploy('MockUSDT', 'USDT')
        await usdt.deployed()
        await usdt.setDecimals(6)
        console.log('usdt deployed:', usdt.address)
        await usdt.mint(accounts[0].address, m(10000, 6))
        console.log('usdt mint to accounts[0]', d(await usdt.balanceOf(accounts[0].address), 6))
        
        usdc = await MockERC20.deploy('MockUSDC', 'USDC')
        await usdc.deployed()
        await usdc.setDecimals(6)
        console.log('usdc deployed:', usdc.address)
        await usdc.mint(accounts[0].address, m(10000, 6))
        console.log('usdc mint to accounts[0]', d(await usdc.balanceOf(accounts[0].address), 6))

        dai = await MockERC20.deploy('MockDAI', 'DAI')
        await dai.deployed()
        console.log('dai deployed:', dai.address)
        await dai.mint(accounts[0].address, m(10000, 18))
        console.log('dai mint to accounts[0]', d(await dai.balanceOf(accounts[0].address), 18))
    })


    it('deploy BundlerManager Bundler WalletFactory', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('bundlerManager deployed:', bundlerManager.address)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('bundler deployed:', bundler.address)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy([usdt.address, usdc.address, dai.address])
        await factory.deployed()
        console.log('factory deployed:', factory.address)
    })


    let predictedAddr
    it('computeWalletAddr && deposit', async function () {
        let nonce = await factory.nonceOf(accounts[0].address)
        nonce++
        predictedAddr = await factory.computeWalletAddr(accounts[0].address, nonce)
    
        await usdc.transfer(predictedAddr, m(10, 6))
        console.log('deposit USDC to', predictedAddr)

        await print()
    })


    it('createWallet', async function () {
        await factory.createWallet(accounts[0].address, bundler.address)
        
        let hasWallet =  await factory.wallets(predictedAddr)
        console.log('wallet is created:', hasWallet)

        await print()
    })


    async function print() {
        console.log('')
        
        console.log('account0 usdc:', d(await usdc.balanceOf(accounts[0].address), 6), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdc:', d(await usdc.balanceOf(accounts[1].address), 6), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('bundler usdc:', d(await usdc.balanceOf(bundler.address), 6), 'eth:', d(await provider.getBalance(bundler.address), 18))
        console.log('wallet usdc:', d(await usdc.balanceOf(predictedAddr), 6), 'eth:', d(await provider.getBalance(predictedAddr), 18))

        console.log('')
    }
})
