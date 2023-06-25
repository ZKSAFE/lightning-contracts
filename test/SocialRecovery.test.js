const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('SocialRecovery-test', function () {
    let accounts
    let provider
    let factory
    let wallet
    let bundler
    let subBundler
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


    it('deploy Bundler SubBundler WalletFactory SmartWallet', async function () {
        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = await Bundler.deploy()
        await bundler.deployed()
        console.log('bundler deployed:', bundler.address)

        const SubBundler = await ethers.getContractFactory('SubBundler')
        subBundler = SubBundler.attach(await bundler.subBundler())
        console.log('subBundler deployed:', subBundler.address)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy()
        await factory.deployed()
        console.log('factory deployed:', factory.address)

        let tx = await (await factory.createWallet(accounts[0].address, subBundler.address)).wait()
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


    it('account2 transferOwnership', async function () {

        await wallet.connect(accounts[2]).transferOwnership(accounts[3].address)
        
        let sr = await wallet.getSocialRecovery()
        console.log('getSocialRecovery:', sr)

        console.log('owner:', await wallet.owner())
    })


    it('account3 transferOwnership', async function () {

        await wallet.connect(accounts[3]).transferOwnership(accounts[3].address)
        
        let sr = await wallet.getSocialRecovery()
        console.log('getSocialRecovery:', sr)
        
        console.log('owner:', await wallet.owner())
    })




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
        return BigNumber.from(num).mul(BigNumber.from(10).pow(decimals))
    }

    function d(bn, decimals) {
        return bn.mul(BigNumber.from(100)).div(BigNumber.from(10).pow(decimals)).toNumber() / 100
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
