const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')

const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

describe('SmartWallet-Bundler-test', function () {
    let accounts
    let provider
    let wallet
    let bundler
    let bundlerManager
    let usdt
    let atomSignParams

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdt = await MockERC20.deploy('MockUSDT', 'USDT')
        await usdt.deployed()
        console.log('usdt deployed:', usdt.address)
        await usdt.mint(accounts[0].address, m(10000, 18))
        console.log('usdt mint to accounts[0]', d(await usdt.balanceOf(accounts[0].address), 18))
        await usdt.mint(accounts[1].address, m(10000, 18))
        console.log('usdt mint to accounts[1]', d(await usdt.balanceOf(accounts[1].address), 18))
    })


    it('deploy BundlerManager Bundler WalletFactory SmartWallet', async function () {
        const BundlerManager = await ethers.getContractFactory('BundlerManager')
        bundlerManager = await BundlerManager.deploy()
        await bundlerManager.deployed()
        console.log('bundlerManager deployed:', bundlerManager.address)

        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = Bundler.attach(await bundlerManager.bundler())
        console.log('bundler deployed:', bundler.address)

        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        wallet = await SmartWallet.deploy(accounts[1].address, bundler.address)
        await wallet.deployed()
        console.log('wallet deployed:', wallet.address)
    })


    it('deposit', async function () {
        await accounts[0].sendTransaction({to: wallet.address, value: m(5, 18)})
        console.log('transfer ETH to', wallet.address)

        await accounts[0].sendTransaction({to: bundler.address, value: m(5, 18)})
        console.log('transfer ETH to', wallet.address)

        await usdt.transfer(bundler.address, m(200, 18))
        console.log('deposit ERC20 to', bundler.address)

        await usdt.transfer(wallet.address, m(2000, 18))
        console.log('deposit ERC20 to', wallet.address)

        await print()
    })


    // it('atomCall', async function () {
    //     let callArr = []
    //     let to = '0x'
    //     let value = 0
    //     let data = '0x'

    //     to = usdt.address
    //     value = 0
    //     const ERC = await ethers.getContractFactory('MockERC20')
    //     data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [bundler.address, m(10, 18)])
    //     callArr.push({to, value, data})

    //     to = bundler.address
    //     value = m(1, 18)
    //     data = '0x'
    //     callArr.push({to, value, data})

    //     let atomCallbytes = '0x'
    //     for (let i=0; i<callArr.length; i++) {
    //         let to = callArr[i].to
    //         let value = callArr[i].value
    //         let data = callArr[i].data
            
    //         let len = utils.arrayify(data).length
    //         atomCallbytes = utils.hexConcat([atomCallbytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
    //     }
    //     console.log('atomCallbytes:', atomCallbytes)

    //     let estimateGas = await wallet.estimateGas.atomCall(atomCallbytes)
    //     await wallet.atomCall(atomCallbytes)
    //     console.log('atomCall done, gasCost:', estimateGas)

    //     await print()
    // })


    it('account1 atomSign', async function () {
        let callArr = []
        let to = '0x'
        let value = 0
        let data = '0x'

        to = bundler.address
        value = 0
        const Bundler = await ethers.getContractFactory('Bundler')
        data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [wallet.address, m(1, 18), '0x'])
        callArr.push({to, value, data})

        to = bundler.address
        value = 0
        const ERC = await ethers.getContractFactory('MockERC20')
        let data2 = ERC.interface.encodeFunctionData('transfer(address,uint256)', [wallet.address, m(200, 18)])
        data = Bundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [usdt.address, 0, data2])
        callArr.push({to, value, data})
        
        to = usdt.address
        value = 0
        data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [bundler.address, m(1000, 18)])
        callArr.push({to, value, data})

        atomSignParams = await atomSign(accounts[1], wallet.address, callArr)
        console.log('atomSign done')
    })


    it('bundler executeOperationReturnChanges', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let p = atomSignParams
        let data = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallbytes, p.deadline, p.signature])

        let retTokens = [NATIVE_ETH_ADDRESS, usdt.address]
        let arr = await bundler.callStatic.executeOperationReturnChanges(wallet.address, data, retTokens)
        console.log('executeOperationReturnChanges done, arr:', arr)

        await print()
    })


    it('bundler executeOperation', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let p = atomSignParams
        let data = SmartWallet.interface.encodeFunctionData('atomSignCall', [p.atomCallbytes, p.deadline, p.signature])

        // let estimateGas = await bundler.estimateGas.executeOperation(wallet.address, data)
        await bundler.executeOperation(wallet.address, data)
        // console.log('executeOperation done, gasCost:', estimateGas)

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
        
        console.log('account0 usdt:', d(await usdt.balanceOf(accounts[0].address), 18), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        console.log('account1 usdt:', d(await usdt.balanceOf(accounts[1].address), 18), 'eth:', d(await provider.getBalance(accounts[1].address), 18))
        console.log('bundler usdt:', d(await usdt.balanceOf(bundler.address), 18), 'eth:', d(await provider.getBalance(bundler.address), 18))
        console.log('wallet usdt:', d(await usdt.balanceOf(wallet.address), 18), 'eth:', d(await provider.getBalance(wallet.address), 18))

        console.log('')
    }
})
