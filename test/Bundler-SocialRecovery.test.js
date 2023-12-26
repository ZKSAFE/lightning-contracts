const { ObjectId } = require('bson')
const { utils } = require('ethers')
const { m, d, b, n, s, delay } = require('./help/BigNumberHelp')
const { atomSign, toOperationData, uuidToBytes32 } = require('./help/AtomSignHelp')

const Reject = utils.hexZeroPad(0, 32)
const Add_Guardian = utils.hexZeroPad(1, 12)
const Remove_Guardian = utils.hexZeroPad(2, 12)
const Update_NeedGuardiansNum = utils.hexZeroPad(3, 12)
const Change_Owner = utils.hexZeroPad(4, 12)

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
        factory = await WalletFactory.deploy(accounts[0].address)
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
        let guardians = [accounts[0].address, accounts[1].address]
        let needGuardiansNum = 2
        await bundlerManager.initSocialRecovery(publicSocialRecovery.address, guardians, needGuardiansNum)
        await printSocialRecovery()
    })

    it('changeOwner: accounts[1]', async function () {
        //owner can change owner immediately
        await bundlerManager.changeOwner(accounts[1].address)
        await printSocialRecovery()
    })

    it('changeOwner: accounts[2]', async function () {
        //SocialRecovery can change owner also
        let proposal = utils.hexConcat([Change_Owner, accounts[2].address])
        await publicSocialRecovery.connect(accounts[0]).propose(bundlerManager.address, proposal)
        await printSocialRecovery()

        await publicSocialRecovery.connect(accounts[1]).propose(bundlerManager.address, proposal)
        await printSocialRecovery()
    })


    async function printSocialRecovery() {
        console.log('')
        let group = await publicSocialRecovery.getGroup(bundlerManager.address)
        console.log('smartWallet:', group.smartWallet)
        console.log('guardians:', group.guardians)
        console.log('needGuardiansNum:', group.needGuardiansNum)
        console.log('approvedGuardians:', group.approvedGuardians)
        console.log('rejectedGuardians:', group.rejectedGuardians)
        console.log('proposal:', group.proposal)
        console.log('owner:', await bundlerManager.owner())
    }
})
