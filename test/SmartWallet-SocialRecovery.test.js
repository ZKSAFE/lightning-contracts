const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')

describe('SmartWallet-SocialRecovery.test', function () {
    let accounts
    let provider
    let factory
    let wallet
    let bundler
    let bundlerManager
    let usdt
    let atomSignParams

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
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = wallet.address
        value = 0
        let guardians = [accounts[0].address, accounts[1].address, accounts[2].address, accounts[3].address]
        let needGuardiansNum = 2
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        data = SmartWallet.interface.encodeFunctionData('setSocialRecovery(address[],uint256)', [guardians, needGuardiansNum])
        callArr.push({to, value, data})
        
        atomSignParams = await atomSign(accounts[0], wallet.address, callArr)
        console.log('atomSign done')

        let p = atomSignParams
        let opData = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallbytes, p.deadline, p.signature])

        await bundler.executeOperation(wallet.address, opData)

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


    async function atomSign(signer, fromWallet, callArr) {
        let atomCallbytes = '0x'
        for (let i=0; i<callArr.length; i++) {
            let to = callArr[i].to
            let value = callArr[i].value
            let data = callArr[i].data
            
            let len = utils.arrayify(data).length
            atomCallbytes = utils.hexConcat([atomCallbytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
        }

        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let wallet = await SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallbytes, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return { atomCallbytes, deadline, chainId, fromWallet, valid, signature }
    }
})
