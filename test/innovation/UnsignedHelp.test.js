const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564'

describe('SmartWallet-Bundler.test', function () {
    let accounts
    let provider
    let wallet
    let bundler
    let bundlerManager
    let atomSignParams
    let unsignedHelp

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy BundlerManager Bundler WalletFactory WalletHelper', async function () {
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

        const UnsignedHelp = await ethers.getContractFactory('UnsignedHelp')
        unsignedHelp = await UnsignedHelp.deploy()
        await unsignedHelp.deployed()
        console.log('unsignedHelp deployed:', unsignedHelp.address)
    })

    it('createWallet', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let tx = await (await factory.createWallet(accounts[1].address, bundler.address)).wait()
        let walletAddr = tx.events[0].args[0]
        wallet = SmartWallet.attach(walletAddr)
        console.log('walletAddr:', wallet.address)
    })


    it('account1 atomSign', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        const UnsignedHelp = await ethers.getContractFactory('UnsignedHelp')

        let to = unsignedHelp.address
        let data = UnsignedHelp.interface.encodeFunctionData('test(uint,bytes)', [
            123, '0x'
        ])

        atomSignParams = await atomSign(accounts[1], wallet.address, to, data)
        console.log('atomSign done')
    })


    it('bundler executeOperation', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')

        let unsignedData = '0x123456'
        let p = atomSignParams
        let data = SmartWallet.interface.encodeFunctionData('delegateCallWithUnsignedData(address,bytes,uint32,bytes,bytes)', [
            p.to, p.data, p.deadline, p.signature, unsignedData
        ])

        let estimateGas = await bundler.estimateGas.executeOperation(wallet.address, data)
        await bundler.executeOperation(wallet.address, data)
        console.log('executeOperation done, gasCost:', estimateGas, 'valid:', await wallet.valid())
    })


    async function atomSign(signer, fromWallet, to, data) {
        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let wallet = SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let msg = utils.hexConcat([
            to,
            data,
            utils.hexZeroPad(deadline, 4),
            utils.hexZeroPad(chainId, 32),
            fromWallet,
            utils.hexZeroPad(valid, 4)
        ])

        let hash = utils.keccak256(msg)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return { deadline, chainId, fromWallet, to, data, valid, signature }
    }

})
