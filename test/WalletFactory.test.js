const { ObjectId } = require('bson')
const { m, d, b, n, s, ETH_ADDRESS, balanceStr } = require('./help/BigNumberHelp')
const { atomSign, uuidToBytes32, toBundleDataArr, encodeAtomCallBytes, toBundleData } = require('./help/AtomSignHelp')

describe('WalletFactory.test', function () {
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


    it('deploy lightning', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('bundlerManager deployed:', bundlerManager.address)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('bundler deployed:', bundler.address)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy([dai.address, usdt.address, usdc.address], 1, bundler.address)
        await factory.deployed()
        console.log('factory deployed:', factory.address)
    })

    const uuid0 = new ObjectId()
    let wallet0Addr
    it('computeWalletAddr && deposit', async function () {
        wallet0Addr = await factory.computeWalletAddr(uuidToBytes32(uuid0))
    
        await usdc.transfer(wallet0Addr, m(10, 6))
        console.log('deposit USDC to wallet0Addr', wallet0Addr)

        await print()
    })


    it('createWallet', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = factory.address
        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        data = WalletFactory.interface.encodeFunctionData('createWallet(bytes32,address,address)',
            [uuidToBytes32(uuid0), accounts[0].address, bundler.address])
        callArr.push({ to, value, data })

        let tx = await (await bundler.atomCall(encodeAtomCallBytes(callArr))).wait()
        console.log('createWallet gas used:', tx.cumulativeGasUsed, 'gas price:', tx.effectiveGasPrice)

        let hasWallet =  await factory.wallets(wallet0Addr)
        console.log('wallet is created:', hasWallet)

        await print()
    })

    const uuid1 = new ObjectId()
    let wallet1Addr
    it('computeWalletAddr && deposit', async function () {
        wallet1Addr = await factory.computeWalletAddr(uuidToBytes32(uuid1))
    
        await usdc.transfer(wallet1Addr, m(10, 6))
        console.log('deposit $USD to wallet1Addr', wallet1Addr)

        await print()
    })


    it('bundlerManager bundle: createWallet & transfer', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        const Bundler = await ethers.getContractFactory('Bundler')
        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        const ERC = await ethers.getContractFactory('MockERC20')

        let atomSignParams
        let bundleData
        let bundleDataArr = []

        //bundler: createWallet
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = factory.address
        value = 0
        data = WalletFactory.interface.encodeFunctionData('createWallet(bytes32,address,address)',
            [uuidToBytes32(uuid1), accounts[1].address, bundler.address])
        callArr.push({ to, value, data })

        let atomCallBytes = encodeAtomCallBytes(callArr)
        bundleData = SmartWallet.interface.encodeFunctionData('atomCall', [atomCallBytes])
        bundleDataArr.push(bundleData)

        //wallet1: transfer
        callArr = []
        to = '0x'
        value = 0
        data = '0x'

        to = usdc.address
        value = 0
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(1, 6)])
        callArr.push({ to, value, data })

        atomSignParams = await atomSign(accounts[1], wallet1Addr, callArr)
        bundleData = await toBundleData(atomSignParams)
        bundleDataArr.push(bundleData)

        //wallet1: transfer
        callArr = []
        to = '0x'
        value = 0
        data = '0x'

        to = usdc.address
        value = 0
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(1, 6)])
        callArr.push({ to, value, data })

        atomSignParams = await atomSign(accounts[1], wallet1Addr, callArr)
        bundleData = await toBundleData(atomSignParams)
        bundleDataArr.push(bundleData)

        //bundle
        let tx = await (await bundlerManager.bundle(bundleDataArr)).wait()
        for (let event of tx.events) {
            if (event.address == bundlerManager.address) {
                if (event.eventSignature == 'Error(uint8)') {
                    console.log('Error index:', b(event.data))
                }
            }
        }
        
        await print()
    })


    async function print() {
        let tokenAddrs = [usdc.address, ETH_ADDRESS]
        console.log('')
        console.log('account0', await balanceStr(accounts[0].address, tokenAddrs))
        console.log('account1', await balanceStr(accounts[1].address, tokenAddrs))
        console.log('bundler', await balanceStr(bundler.address, tokenAddrs))
        wallet0Addr && console.log('wallet0', await balanceStr(wallet0Addr, tokenAddrs))
        wallet1Addr && console.log('wallet1', await balanceStr(wallet1Addr, tokenAddrs))
    }
})
