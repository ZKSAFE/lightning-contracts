const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const { ObjectId } = require('bson')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

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


    it('deploy BundlerManager Bundler WalletFactory', async function () {
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

    const uuid0 = new ObjectId()
    let wallet0Addr
    it('computeWalletAddr && deposit', async function () {
        wallet0Addr = await factory.computeWalletAddr(uuidToBytes32(uuid0))
    
        await usdc.transfer(wallet0Addr, m(10, 6))
        console.log('deposit USDC to wallet0Addr', wallet0Addr)

        await print()
    })


    it('createWallet', async function () {
        let tx = await (await factory.createWallet(uuidToBytes32(uuid0), accounts[0].address, bundler.address)).wait()
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
        console.log('deposit USDC to wallet1Addr', wallet1Addr)

        await print()
    })


    it('bundlerManager bundle: createWallet & transfer', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        const Bundler = await ethers.getContractFactory('Bundler')
        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        const ERC = await ethers.getContractFactory('MockERC20')

        let atomSignParamsArr = []

        //wallet0: createWallet
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = factory.address
        value = 0
        data = WalletFactory.interface.encodeFunctionData('createWallet(bytes32,address,address)',
            [uuidToBytes32(uuid1), accounts[1].address, bundler.address])
        callArr.push({ to, value, data })

        let atomSignParams = await atomSign(accounts[0], wallet0Addr, callArr)
        atomSignParamsArr.push(atomSignParams)

        //wallet1: transfer
        callArr = []
        to = '0x'
        value = 0
        data = '0x'

        to = usdc.address
        value = 0
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(100, 6)])
        callArr.push({ to, value, data })

        atomSignParams = await atomSign(accounts[1], wallet1Addr, callArr)
        atomSignParamsArr.push(atomSignParams)

        //wallet1: transfer
        callArr = []
        to = '0x'
        value = 0
        data = '0x'

        to = usdc.address
        value = 0
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(100, 6)])
        callArr.push({ to, value, data })

        atomSignParams = await atomSign(accounts[1], wallet1Addr, callArr)
        atomSignParamsArr.push(atomSignParams)


        let bundleDataArr = []
        for (let p of atomSignParamsArr) {
            let atomSignData = SmartWallet.interface.encodeFunctionData('atomSignCall',
                [p.atomCallbytes, p.deadline, p.signature])

            let bundleData = Bundler.interface.encodeFunctionData('executeOperation', [p.fromWallet, atomSignData])
            bundleDataArr.push(bundleData)
        }

        let tx = await bundlerManager.bundle(bundleDataArr)
        let tx2 = await tx.wait()
        console.log('bundle done', tx)
        console.log('bundle done2', tx2)
        for (let event of tx2.events) {
            if (event.address == bundlerManager.address) {
                if (event.eventSignature == 'Error(uint8)') {
                    console.log('Error index:', b(event.data))
                }
            }
        }
        
        await print()
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

        let deadline = parseInt(Date.now() / 1000 + Math.random() * 1000);
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let hasWallet =  await factory.wallets(fromWallet)
        let valid = hasWallet ? await SmartWallet.attach(fromWallet).valid() : 1

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallbytes, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])
        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))
        
        return { atomCallbytes, deadline, chainId, fromWallet, valid, signature }
    }


    function uuidToBytes32(uuid) {
        return utils.hexZeroPad('0x' + uuid.toString(), 32)
    }


    async function print() {
        console.log('')
        
        console.log('account0 usdc:', d(await usdc.balanceOf(accounts[0].address), 6), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdc:', d(await usdc.balanceOf(accounts[1].address), 6), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('bundler usdc:', d(await usdc.balanceOf(bundler.address), 6), 'eth:', d(await provider.getBalance(bundler.address), 18))
        wallet0Addr && console.log('wallet0 usdc:', d(await usdc.balanceOf(wallet0Addr), 6), 'eth:', d(await provider.getBalance(wallet0Addr), 18))
        wallet1Addr && console.log('wallet1 usdc:', d(await usdc.balanceOf(wallet1Addr), 6), 'eth:', d(await provider.getBalance(wallet1Addr), 18))

        console.log('')
    }
})
