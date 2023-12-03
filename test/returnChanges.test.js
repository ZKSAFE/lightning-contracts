const util = require('util')
const { ObjectId } = require('bson')
const { utils } = require('ethers')
const { m, d, b, n, s, ETH_ADDRESS, balanceStr } = require('./help/BigNumberHelp')
const { atomSign, toOperationData, uuidToBytes32, toBundleDataArr } = require('./help/AtomSignHelp')

describe('returnChanges.test', function () {
    let accounts
    let provider
    let factory
    let wallet0
    let wallet1
    let bundler
    let bundlerManager
    let publicSocialRecovery
    let usdt

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
        await usdt.mint(accounts[1].address, m(10000, 6))
        console.log('usdt mint to accounts[1]', d(await usdt.balanceOf(accounts[1].address), 6))
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

        const SmartWallet = await ethers.getContractFactory('SmartWalletV2')
        let tx = await (await factory.createWallet(
            uuidToBytes32(new ObjectId()), accounts[0].address, bundler.address)).wait()
        let wallet0Addr
        for (let event of tx.events) {
            if (event.address == factory.address) {
                if (event.eventSignature == 'WalletCreated(address,address,address)') {
                    wallet0Addr = event.args[0]
                    break
                }
            }
        }
        wallet0 = SmartWallet.attach(wallet0Addr)
        console.log('wallet0 deployed:', wallet0.address)

        tx = await (await factory.createWallet(
            uuidToBytes32(new ObjectId()), accounts[1].address, bundler.address)).wait()
        let wallet1Addr
        for (let event of tx.events) {
            if (event.address == factory.address) {
                if (event.eventSignature == 'WalletCreated(address,address,address)') {
                    wallet1Addr = event.args[0]
                    break
                }
            }
        }
        wallet1 = SmartWallet.attach(wallet1Addr)
        console.log('wallet1 deployed:', wallet1.address)
    })

    it('deposit', async function () {
        await accounts[0].sendTransaction({ to: wallet1.address, value: m(10, 18) })
        await accounts[0].sendTransaction({ to: bundler.address, value: m(10, 18) })
        await usdt.transfer(wallet1.address, m(1000, 6))
        await usdt.transfer(bundler.address, m(1000, 6))

        await print()
    })

    it('account1 atomSign', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = bundler.address
        value = 0
        const Bundler = await ethers.getContractFactory('Bundler')
        data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [wallet1.address, m(1, 18), '0x'])
        callArr.push({ to, value, data })

        to = bundler.address
        value = 0
        const ERC = await ethers.getContractFactory('MockERC20')
        let data2 = ERC.interface.encodeFunctionData('transfer(address,uint256)', [wallet1.address, m(200, 6)])
        data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [usdt.address, 0, data2])
        callArr.push({ to, value, data })

        to = usdt.address
        value = 0
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [bundler.address, m(1000, 6)])
        callArr.push({ to, value, data })

        atomSignParams = await atomSign(accounts[1], wallet1.address, callArr)
        console.log('atomSign done')
    })

    it('bundler executeOperation', async function () {
        let data = toOperationData(atomSignParams)
        let retTokens = [usdt.address, ETH_ADDRESS]
        let changes = await bundler.callStatic.executeOperationReturnChanges(wallet1.address, data, retTokens)
        console.log('beforeBalances:', changes.beforeBalances, 'afterBalances:', changes.afterBalances)

        await bundler.executeOperation(wallet1.address, data)

        await print()
    })


    async function print() {
        let tokenAddrs = [usdt.address, ETH_ADDRESS]
        console.log('')
        console.log('account0', await balanceStr(accounts[0].address, tokenAddrs))
        console.log('account1', await balanceStr(accounts[1].address, tokenAddrs))
        console.log('bundler', await balanceStr(bundler.address, tokenAddrs))
        console.log('wallet0', await balanceStr(wallet0.address, tokenAddrs))
        console.log('wallet1', await balanceStr(wallet1.address, tokenAddrs))
        console.log('')
    }
})
