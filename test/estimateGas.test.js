const util = require('util')
const { ObjectId } = require('bson')
const { utils } = require('ethers')
const { m, d, b, n, s, ETH_ADDRESS, balanceStr } = require('./help/BigNumberHelp')
const { atomSign, toOperationData, uuidToBytes32, toBundleDataArr } = require('./help/AtomSignHelp')

describe('estimateGas.test', function () {
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
        await usdt.mint(accounts[0].address, m(20000, 6))
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
        await usdt.transfer(wallet1.address, m(10000, 6))
        await usdt.transfer(bundler.address, m(1000, 6))

        await print()
    })

    
    it('executeOperationReturnChanges', async function () {
        const Bundler = await ethers.getContractFactory('Bundler')
        const ERC = await ethers.getContractFactory('MockERC20')

       

        for (let num=1; num<100; num+=10) {

            let callArr = []
            let to = '0x'
            let value = 0
            let data = '0x'

            for (let i = 0; i < num; i++) {
                to = usdt.address
                value = 0
                data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [bundler.address, m(1, 6)])
                callArr.push({ to, value, data })
            }

            let atomSignParams = await atomSign(accounts[1], wallet1.address, callArr)


            let opData = await toOperationData(atomSignParams)
            let retTokens = [usdt.address, ETH_ADDRESS]

            let gasLimit = 3000000
            let changes
            try {
                await bundler.callStatic.executeOperationReturnChanges(wallet1.address, opData, retTokens, { gasLimit })
            } catch (error) {
                changes = decodeChanges(error.toString())
            }
            console.log('beforeBalances:', changes.beforeBalances, 'afterBalances:', changes.afterBalances,
                'startGasleft:', changes.startGasleft, 'gasUse:', changes.gasUse)

            let tx = await (await bundler.executeOperation(wallet1.address, opData)).wait()
            console.log('cumulativeGasUsed:', tx.cumulativeGasUsed)

            console.log('cumulativeGasUsed - gasUse =', n(tx.cumulativeGasUsed) - n(changes.gasUse))
            console.log('gasUse / cumulativeGasUsed =', n(changes.gasUse) / n(tx.cumulativeGasUsed))
            let fixed = gasLimit - n(changes.startGasleft) + n(changes.gasUse) - 8442
            console.log('fixed gasUse =', fixed)
            console.log('fixed gasUse - cumulativeGasUsed =', fixed - n(tx.cumulativeGasUsed))
        }

        await print()
    })


    function decodeChanges(errorStr) {
        let start = errorStr.indexOf('TheChanges')
        errorStr = errorStr.slice(start)
        let end = errorStr.indexOf('"')
        errorStr = errorStr.slice(0, end)
        console.log(errorStr)

        let arr = errorStr.split('0x')
        arr.shift()

        let gasUse = b('0x' + arr.pop())
        let startGasleft = b('0x' + arr.pop())
        let beforeBalances = []
        let afterBalances = []
        let i
        for (i= 0; i < arr.length / 2; i++) {
            beforeBalances.push(b('0x' + arr[i]))
        }
        for (i = arr.length / 2; i < arr.length; i++) {
            afterBalances.push(b('0x' + arr[i]))
        }

        return { beforeBalances, afterBalances, startGasleft, gasUse }
    }


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
