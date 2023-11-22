const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

describe('SmartWallet-Bundler.test', function () {
    let accounts
    let provider
    let bundler
    let bundlerManager
    let usdc
    let factory
    

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdc = await MockERC20.deploy('MockUSDC', 'USDC')
        await usdc.deployed()
        await usdc.setDecimals(6)
        console.log('usdc deployed:', usdc.address)
        await usdc.mint(accounts[0].address, m(10000, 6))
        console.log('usdc mint to accounts[0]', d(await usdc.balanceOf(accounts[0].address), 6))
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
        factory = await WalletFactory.deploy([usdc.address], 0)
        await factory.deployed()
        console.log('factory deployed:', factory.address)
    })


    let wallet0Addr
    it('computeWalletAddr && deposit', async function () {
        let nonce = await factory.nonceOf(accounts[0].address)
        nonce++
        wallet0Addr = await factory.computeWalletAddr(accounts[0].address, nonce)

        await usdc.transfer(wallet0Addr, m(100, 6))
        console.log('deposit USDC to wallet0Addr', wallet0Addr)
    
        await print()
    })


    it('createWallet', async function () {
        await factory.createWallet(accounts[0].address, bundler.address)
        
        let hasWallet =  await factory.wallets(wallet0Addr)
        console.log('wallet is created:', hasWallet)

        await print()
    })


    it('transfer', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        const Bundler = await ethers.getContractFactory('Bundler')
        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        const SmartWallet = await ethers.getContractFactory('SmartWallet')

        let atomSignParamsArr = []
        
        for (let i=0; i<2; i++) {
            let callArr = []
            let to = '0x'
            let value = 0
            let data = '0x'
            
            to = usdc.address
            value = 0
            const ERC = await ethers.getContractFactory('MockERC20')
            data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [accounts[1].address, m(1, 6)])
            callArr.push({ to, value, data })
            
            let atomSignParams = await atomSign(accounts[0], wallet0Addr, callArr)
            atomSignParamsArr.push(atomSignParams)
        }

        let bundleDataArr = []
        for (let p of atomSignParamsArr) {
            let atomSignData = SmartWallet.interface.encodeFunctionData('atomSignCall',
                [p.atomCallbytes, p.deadline, p.signature])

            let bundleData = Bundler.interface.encodeFunctionData('executeOperation', [p.fromWallet, atomSignData])
            bundleDataArr.push(bundleData)
        }

        let estimateGas = await bundlerManager.estimateGas.bundle(bundleDataArr)
        await bundlerManager.bundle(bundleDataArr)
        console.log('bundle ' + atomSignParamsArr.length +' done gasCost:', estimateGas, 'single:' + estimateGas.div(atomSignParamsArr.length))

        // bundle 1 done gasCost: BigNumber { value: "75236" }      single:75236  84783(no signature recover)
        // bundle 25 done gasCost: BigNumber { value: "1196536" }   single:47858  35705(no signature recover)
        // bundle 50 done gasCost: BigNumber { value: "2364589" }   single:47291  34429(no signature recover)
        // bundle 75 done gasCost: BigNumber { value: "3531920" }   single:47092  33999(no signature recover)
        // bundle 100 done gasCost: BigNumber { value: "4700761" }  single:47007  33723(no signature recover)
        //                                                       zk-single:442040
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

        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let hasWallet =  await factory.wallets(fromWallet)
        let valid = hasWallet ? await SmartWallet.attach(fromWallet).valid() : 0

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallbytes, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return { atomCallbytes, deadline, chainId, fromWallet, valid, signature }
    }


    async function print() {
        console.log('')
        
        console.log('account0 usdc:', d(await usdc.balanceOf(accounts[0].address), 6), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdc:', d(await usdc.balanceOf(accounts[1].address), 6), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('bundler usdc:', d(await usdc.balanceOf(bundler.address), 6), 'eth:', d(await provider.getBalance(bundler.address), 18))
        wallet0Addr && console.log('wallet0 usdc:', d(await usdc.balanceOf(wallet0Addr), 6), 'eth:', d(await provider.getBalance(wallet0Addr), 18))

        console.log('')
    }
})
