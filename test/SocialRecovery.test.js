const { ObjectId } = require('bson')
const { utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const { uuidToBytes32 } = require('./help/AtomSignHelp')

const Reject = utils.hexZeroPad(0, 32)
const Add_Guardian = utils.hexZeroPad(1, 12)
const Remove_Guardian = utils.hexZeroPad(2, 12)
const Update_NeedGuardiansNum = utils.hexZeroPad(3, 12)
const Change_Owner = utils.hexZeroPad(4, 12)

describe('SocialRecovery.test', function () {
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
        let guardians = [accounts[0].address]
        let needGuardiansNum = 1
        await wallet.initSocialRecovery(publicSocialRecovery.address, guardians, needGuardiansNum)
        await print()
    })

    it('addGuardian: accounts[1]', async function () {
        let proposal = utils.hexConcat([Add_Guardian, accounts[1].address])
        try {
            await publicSocialRecovery.connect(accounts[0]).propose(wallet.address, Reject)
        } catch (error) {
            //propose: new proposal cannot be empty
            console.log(error)
        }
        await print()

        await publicSocialRecovery.connect(accounts[0]).propose(wallet.address, proposal)
        await print()
    })

    it('updateNeedGuardiansNum: 2', async function () {
        let proposal = utils.hexConcat([Update_NeedGuardiansNum, utils.hexZeroPad(2, 20)])
        await publicSocialRecovery.connect(accounts[1]).propose(wallet.address, proposal)
        await print()
    })

    it('addGuardian: accounts[2]', async function () {
        let proposal = utils.hexConcat([Add_Guardian, accounts[2].address])
        await publicSocialRecovery.connect(accounts[0]).propose(wallet.address, proposal)
        await print()

        await publicSocialRecovery.connect(accounts[1]).propose(wallet.address, proposal)
        await print()
    })

    it('removeGuardian: accounts[3]', async function () {
        let proposal = utils.hexConcat([Remove_Guardian, accounts[3].address])
        await publicSocialRecovery.connect(accounts[0]).propose(wallet.address, proposal)
        await print()

        await publicSocialRecovery.connect(accounts[1]).propose(wallet.address, Reject)
        await print()

        try {
            await publicSocialRecovery.connect(accounts[2]).propose(wallet.address, proposal)
        } catch (error) {
            //removeGuardian: not exist
            console.log(error)
        }
        await print()

        await publicSocialRecovery.connect(accounts[2]).propose(wallet.address, Reject)
        await print()
    })

    it('removeGuardian: accounts[2]', async function () {
        let proposal = utils.hexConcat([Remove_Guardian, accounts[2].address])
        await publicSocialRecovery.connect(accounts[0]).propose(wallet.address, proposal)
        await print()

        await publicSocialRecovery.connect(accounts[2]).propose(wallet.address, Reject)
        await print()

        try {
            await publicSocialRecovery.connect(accounts[2]).propose(wallet.address, Reject)
        } catch (error) {
            //propose: don't repeat
            console.log(error)
        }
        await print()

        await publicSocialRecovery.connect(accounts[1]).propose(wallet.address, proposal)
        await print()
    })

    it('change owner', async function () {
        let proposal = utils.hexConcat([Change_Owner, accounts[1].address])
        await publicSocialRecovery.connect(accounts[0]).propose(wallet.address, proposal)
        await print()

        await publicSocialRecovery.connect(accounts[1]).propose(wallet.address, proposal)
        await print()

        console.log('owner:', await wallet.owner(), 'bundler:', await wallet.bundler())
    })

    it('removeGuardian: accounts[0]', async function () {
        let proposal = utils.hexConcat([Remove_Guardian, accounts[0].address])
        await publicSocialRecovery.connect(accounts[0]).propose(wallet.address, proposal)
        await print()

        try {
            await publicSocialRecovery.connect(accounts[2]).propose(wallet.address, Reject)
        } catch (error) {
            //propose: you're not the Guardian
            console.log(error)
        }
        await print()

        await publicSocialRecovery.connect(accounts[1]).propose(wallet.address, proposal)
        await print()
    })

    it('removeGuardian: accounts[1]', async function () {
        let proposal = utils.hexConcat([Remove_Guardian, accounts[1].address])
        await publicSocialRecovery.connect(accounts[1]).propose(wallet.address, proposal)
        await print()
    })

    it('addGuardian: accounts[1]', async function () {
        let proposal = utils.hexConcat([Add_Guardian, accounts[0].address])
        try {
            await publicSocialRecovery.connect(accounts[0]).propose(wallet.address, proposal)
        } catch (error) {
            //propose: you're not the Guardian
            console.log(error)
        }
        await print()
    })

    it('initSocialRecovery', async function () {
        let guardians = [accounts[0].address]
        let needGuardiansNum = 1
        try {
            await wallet.connect(accounts[1]).initSocialRecovery(
                publicSocialRecovery.address, guardians, needGuardiansNum)
        } catch (error) {
            //initSocialRecovery: group already exist
            console.log(error)
        }
        await print()
    })


    async function print() {
        console.log('')
        let group = await publicSocialRecovery.getGroup(wallet.address)
        console.log('smartWallet:', group.smartWallet)
        console.log('guardians:', group.guardians)
        console.log('needGuardiansNum:', group.needGuardiansNum)
        console.log('approvedGuardians:', group.approvedGuardians)
        console.log('rejectedGuardians:', group.rejectedGuardians)
        console.log('proposal:', group.proposal)
    }
})
