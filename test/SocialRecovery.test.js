const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')

describe('SocialRecovery-test', function () {
    let accounts
    let provider
    let factory
    let wallet
    let bundler
    let bundlerManager
    let usdt
    let signData

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdt = await MockERC20.deploy('MockUSDT', 'USDT')
        await usdt.deployed()
        console.log('usdt deployed:', usdt.address)
        await usdt.mint(accounts[0].address, m(10000, 18))
        console.log('usdt mint to accounts[0]', d(await usdt.balanceOf(accounts[0].address), 18))
        await usdt.mint(accounts[1].address, m(10000, 18))
        console.log('usdt mint to accounts[1]', d(await usdt.balanceOf(accounts[1].address), 18))
    })


    it('deploy BundlerManager Bundler WalletFactory SmartWallet', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('bundlerManager deployed:', bundlerManager.address)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('bundler deployed:', bundler.address)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy()
        await factory.deployed()
        console.log('factory deployed:', factory.address)

        let tx = await (await factory.createWallet(accounts[0].address, bundler.address)).wait()
        // console.log('tx', tx, { depth: null })
        let walletAddr = tx.events[0].args[0]
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        wallet = SmartWallet.attach(walletAddr)
        console.log('wallet deployed:', wallet.address)
        
        let isWallet = await factory.wallets(walletAddr)
        console.log('isWallet:', isWallet)
    })


    it('setSocialRecovery', async function () {
        let guardians = [accounts[0].address, accounts[1].address, accounts[2].address, accounts[3].address]
        let needGuardiansNum = 2
        await wallet.setSocialRecovery(guardians, needGuardiansNum)

        let sr = await wallet.getSocialRecovery()
        console.log('getSocialRecovery:', sr)
    })


    it('account0 quitGuardian', async function () {

        await wallet.quitGuardian()
        
        let sr = await wallet.getSocialRecovery()
        console.log('getSocialRecovery:', sr)
    })


    it('account1 quitGuardian', async function () {

        await wallet.connect(accounts[1]).quitGuardian()
        
        let sr = await wallet.getSocialRecovery()
        console.log('getSocialRecovery:', sr)
    })


    it('account2 coverOwnership', async function () {

        await wallet.connect(accounts[2]).coverOwnership(accounts[3].address)
        
        let sr = await wallet.getSocialRecovery()
        console.log('getSocialRecovery:', sr)

        console.log('owner:', await wallet.owner())
    })


    it('account3 coverOwnership', async function () {

        await wallet.connect(accounts[3]).coverOwnership(accounts[3].address)
        
        let sr = await wallet.getSocialRecovery()
        console.log('getSocialRecovery:', sr)
        
        console.log('owner:', await wallet.owner())
    })
})
