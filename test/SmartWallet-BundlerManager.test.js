const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')

describe('SmartWallet-BundlerManager.test', function () {
    let accounts
    let provider
    let factory
    let walletArr
    let bundler
    let bundlerManager
    let usdt
    let atomSignParamsArr

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdt = await MockERC20.deploy('MockUSDT', 'USDT')
        await usdt.deployed()
        console.log('usdt deployed:', usdt.address)
        await usdt.mint(accounts[0].address, m(100000, 18))
        console.log('usdt mint to accounts[0]', d(await usdt.balanceOf(accounts[0].address), 18))
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

        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        walletArr = []
        for (let i = 1; i <= 5; i++) {
            let tx = await (await factory.createWallet(accounts[i].address, bundler.address)).wait()
            let walletAddr = tx.events[0].args[0]
            let wallet = SmartWallet.attach(walletAddr)
            walletArr.push(wallet)
            console.log('wallet' + i + ' deployed:', wallet.address)
        }
    })


    it('deposit', async function () {
        await accounts[0].sendTransaction({ to: bundler.address, value: m(4, 18) })
        console.log('transfer ETH to', bundler.address)

        for (let wallet of walletArr) {
            await usdt.transfer(wallet.address, m(2000, 18))
            console.log('deposit ERC20 to', wallet.address)
        }

        await print()
    })


    it('accounts atomSign', async function () {
        atomSignParamsArr = []
        for (let wallet of walletArr) {
            let count = walletArr.indexOf(wallet) + 1

            let callArr = []
            let to = '0x'
            let value = 0
            let data = '0x'

            to = bundler.address
            value = 0
            const Bundler = await ethers.getContractFactory('Bundler')
            data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)',
                [wallet.address, m(1, 18), '0x'])
            callArr.push({ to, value, data })

            to = usdt.address
            value = 0
            const ERC = await ethers.getContractFactory('MockERC20')
            data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [bundler.address, m(2000, 18)])
            callArr.push({ to, value, data })

            let atomSignParams = await atomSign(accounts[count], wallet.address, callArr)
            atomSignParamsArr.push(atomSignParams)
            console.log('wallet' + count + ' atomSign done')
        }
    })


    it('bundlerManager bundle', async function () {
        const Bundler = await ethers.getContractFactory('Bundler')
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let bundleDataArr = []
        for (let p of atomSignParamsArr) {
            let atomSignData = SmartWallet.interface.encodeFunctionData('atomSignCall',
                [p.atomCallbytes, p.deadline, p.signature])

            let bundleData = Bundler.interface.encodeFunctionData('executeOperation', [p.fromWallet, atomSignData])
            bundleDataArr.push(bundleData)
        }

        let estimateGas = await bundlerManager.estimateGas.bundle(bundleDataArr)
        await bundlerManager.bundle(bundleDataArr)
        console.log('bundle done gasCost:', estimateGas)

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
        let wallet = await SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallbytes, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return { atomCallbytes, deadline, chainId, fromWallet, valid, signature }
    }


    async function print() {
        console.log('')

        console.log('account0 usdt:', d(await usdt.balanceOf(accounts[0].address), 18),
            'eth:', d(await provider.getBalance(accounts[0].address), 18))

        for (let wallet of walletArr) {
            let count = walletArr.indexOf(wallet) + 1

            console.log('wallet' + count + ' usdt:', d(await usdt.balanceOf(wallet.address), 18),
                'eth:', d(await provider.getBalance(wallet.address), 18))
        }

        console.log('bundlerManager usdt:', d(await usdt.balanceOf(bundlerManager.address), 18),
            'eth:', d(await provider.getBalance(bundlerManager.address), 18))

        console.log('bundler usdt:', d(await usdt.balanceOf(bundler.address), 18),
            'eth:', d(await provider.getBalance(bundler.address), 18))

        console.log('')
    }
})
