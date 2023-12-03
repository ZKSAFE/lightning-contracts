const { ObjectId } = require('bson')
const { utils } = require('ethers')
const { m, d, b, n, s, delay } = require('./help/BigNumberHelp')
const { atomSign, toOperationData, uuidToBytes32 } = require('./help/AtomSignHelp')

describe('SmartWallet-SocialRecovery.test', function () {
    let accounts
    let provider
    let factory
    let wallet
    let bundler
    let bundlerManager
    let publicSocialRecovery

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy lightning', async function () {
        const PublicSocialRecovery = await ethers.getContractFactory('PublicSocialRecovery')
        publicSocialRecovery = await PublicSocialRecovery.deploy()
        await publicSocialRecovery.deployed()
        console.log('publicSocialRecovery deployed:', publicSocialRecovery.address)

        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('bundlerManager deployed:', bundlerManager.address)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('bundler deployed:', bundler.address)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy([], 0)
        await factory.deployed()
        console.log('factory deployed:', factory.address)

        let tx = await (await factory.createWallet(
            uuidToBytes32(new ObjectId()), accounts[0].address, bundler.address)).wait()
        let walletAddr
        for (let event of tx.events) {
            if (event.address == factory.address) {
                if (event.eventSignature == 'WalletCreated(address,address,address)') {
                    walletAddr = event.args[0]
                    break
                }
            }
        }

        const SmartWallet = await ethers.getContractFactory('SmartWalletV2')
        wallet = SmartWallet.attach(walletAddr)
        console.log('wallet deployed:', wallet.address)

        let isWallet = await factory.wallets(walletAddr)
        console.log('isWallet:', isWallet)
    })

    it('initSocialRecovery', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = wallet.address
        value = 0
        let guardians = [accounts[0].address, accounts[1].address]
        let needGuardiansNum = 2
        const SmartWallet = await ethers.getContractFactory('SmartWalletV2')
        data = SmartWallet.interface.encodeFunctionData(
            'initSocialRecovery(address,address[],uint8)', 
                [publicSocialRecovery.address, guardians, needGuardiansNum])
        callArr.push({to, value, data})
        
        let atomSignParams = await atomSign(accounts[0], wallet.address, callArr)
        await bundler.executeOperation(wallet.address, await toOperationData(atomSignParams))

        await printSocialRecovery()
        await printOwner()
    })

    it('changeOwner: accounts[1]', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = wallet.address
        value = 0
        const SmartWallet = await ethers.getContractFactory('SmartWalletV2')
        data = SmartWallet.interface.encodeFunctionData(
                                        'changeOwner(address)', 
                                            [accounts[1].address])
        callArr.push({to, value, data})
        
        let atomSignParams = await atomSign(accounts[0], wallet.address, callArr)
        await bundler.executeOperation(wallet.address, await toOperationData(atomSignParams))

        await printOwner()
    })

    it('changeBundler: accounts[1]', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = wallet.address
        value = 0
        const SmartWallet = await ethers.getContractFactory('SmartWalletV2')
        data = SmartWallet.interface.encodeFunctionData(
                                        'changeBundler(address)', 
                                            [accounts[1].address])
        callArr.push({to, value, data})
        
        let atomSignParams = await atomSign(accounts[1], wallet.address, callArr)
        await bundler.executeOperation(wallet.address, await toOperationData(atomSignParams))

        await printOwner()
    })

    it('resetBundler: accounts[1]', async function () {

        async function tryResetBundler() {
            console.log('tryResetBundler...')
            await delay(1)
            try {
                await wallet.connect(accounts[1]).resetBundler()
                console.log('resetBundler done')
            } catch (error) {
                await tryResetBundler()
            }
        }

        await tryResetBundler()

        await printOwner()
    })


    async function printSocialRecovery() {
        console.log('')
        let group = await publicSocialRecovery.getGroup(wallet.address)
        console.log('smartWallet:', group.smartWallet)
        console.log('guardians:', group.guardians)
        console.log('needGuardiansNum:', group.needGuardiansNum)
        console.log('approvedGuardians:', group.approvedGuardians)
        console.log('rejectedGuardians:', group.rejectedGuardians)
        console.log('proposal:', group.proposal)
    }

    async function printOwner() {
        console.log('')
        console.log('owner:', await wallet.owner())
        console.log('bundler:', await wallet.bundler())
        console.log('pendingBundler:', await wallet.pendingBundler())
    }
})
