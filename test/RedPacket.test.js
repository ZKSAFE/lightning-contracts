const { ObjectId } = require('bson')
const { m, d, b, n, s, ETH_ADDRESS, balanceStr } = require('./help/BigNumberHelp')
const { atomSign, uuidToBytes32, encodeAtomCallBytes, toOperationData } = require('./help/AtomSignHelp')

describe('RedPacket.test', function () {
    let accounts
    let provider
    let factory
    let wallets = []
    let uuids = []
    let bundler
    let bundlerManager
    let usdt
    let usdc
    let dai


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

    it('deploy lightning', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('bundlerManager deployed:', bundlerManager.address)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('bundler deployed:', bundler.address)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy([dai.address, usdt.address, usdc.address], 1)
        await factory.deployed()
        console.log('factory deployed:', factory.address)
    })

    it('computeWalletAddr deposit createWallet', async function () {
        for (let account of accounts) {
            uuids.push(new ObjectId())
        }

        let walletAddr = await factory.computeWalletAddr(uuidToBytes32(uuids[0]))
        await usdc.transfer(walletAddr, m(200, 6))
        await usdc.transfer(bundler.address, m(200, 6))

        await createWallet(accounts[0], uuids[0])

        await print()
    })

    let atomSignParams
    it('wallet0 send Red-packet', async function () {
        const ERC = await ethers.getContractFactory('MockERC20')

        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = usdc.address
        value = 0
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [bundler.address, m(100, 6)])
        callArr.push({ to, value, data })

        atomSignParams = await atomSign(accounts[0], wallets[0].address, callArr)
        console.log('atomSign done')

        // await bundler.executeOperation(wallets[0].address, toOperationData(atomSignParams))

        await print()
    })

    it('wallet1~10 claim Red-packet', async function () {
        const ERC = await ethers.getContractFactory('MockERC20')

        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'
        
        to = wallets[0].address
        value = 0
        data = await toOperationData(atomSignParams)
        callArr.push({ to, value, data })

        for (let i = 1; i <= 10; i++) {
            let walletAddr = await factory.computeWalletAddr(uuidToBytes32(uuids[i]))

            to = usdc.address
            value = 0
            data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [walletAddr, m(5, 6)])
            callArr.push({ to, value, data })
        }

        //give back
        to = usdc.address
        value = 0
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [wallets[0].address, m(50, 6)])
        callArr.push({ to, value, data })


        let tx = await (await bundler.atomCall(encodeAtomCallBytes(callArr))).wait()
        console.log('bundle gas used:', tx.cumulativeGasUsed)
        //1 transfers:114049, 10 transfers:366750, 19 transfers:624921

        await print()
    })

    it('wallet1~10 activate', async function () {
        for (let i = 1; i <= 10; i++) {
            await createWallet(accounts[i], uuids[i])
        }

        await print()
    })


    async function createWallet(account, uuid) {
        const SmartWallet = await ethers.getContractFactory('SmartWalletV2')

        let tx = await (await factory.createWallet(
            uuidToBytes32(uuid), account.address, bundler.address)).wait()
        let walletAddr
        for (let event of tx.events) {
            if (event.address == factory.address) {
                if (event.eventSignature == 'WalletCreated(address,address,address)') {
                    walletAddr = event.args[0]
                    break
                }
            }
        }

        let wallet = SmartWallet.attach(walletAddr)
        let index = accounts.indexOf(account)
        wallets[index] = wallet
        console.log('account' + index + ':', account.address, 'wallet' + index + ':', wallet.address)
    }

    async function print() {
        let tokenAddrs = [usdc.address]
        console.log('')
        for (let i = 0; i <= 10; i++) {
            let account = accounts[i].address
            let isActivated = wallets[i] != undefined
            let wallet = isActivated ? wallets[i].address : await factory.computeWalletAddr(uuidToBytes32(uuids[i]))

            console.log('account' + i, await balanceStr(account, tokenAddrs),
                'wallet' + i, await balanceStr(wallet, tokenAddrs), 'isActivated:', isActivated)
        }
        console.log('bundler', await balanceStr(bundler.address, tokenAddrs))
    }
})