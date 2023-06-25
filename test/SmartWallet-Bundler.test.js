const { BigNumber, utils } = require('ethers')
const snarkjs = require("snarkjs")
const fs = require("fs")

describe('SmartWallet-Bundler-test', function () {
    let accounts
    let provider
    let factory
    let walletArr
    let bundler
    let subBundler
    let usdt
    let signedDataArr

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


    it('deploy Bundler SubBundler WalletFactory SmartWallet', async function () {
        const Bundler = await ethers.getContractFactory('Bundler')
        bundler = await Bundler.deploy()
        await bundler.deployed()
        console.log('bundler deployed:', bundler.address)

        const SubBundler = await ethers.getContractFactory('SubBundler')
        subBundler = SubBundler.attach(await bundler.subBundler())
        console.log('subBundler deployed:', subBundler.address)

        const WalletFactory = await ethers.getContractFactory('WalletFactory')
        factory = await WalletFactory.deploy()
        await factory.deployed()
        console.log('factory deployed:', factory.address)

        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        walletArr = []
        for (let i=1; i<=5; i++) {
            let tx = await (await factory.createWallet(accounts[i].address, subBundler.address)).wait()
            let walletAddr = tx.events[0].args[0]
            let wallet = SmartWallet.attach(walletAddr)
            walletArr.push(wallet)
            console.log('wallet' + i + ' deployed:', wallet.address)
        }
    })


    it('deposit', async function () {
        await accounts[0].sendTransaction({to: subBundler.address, value: m(4, 18)})
        console.log('transfer ETH to', subBundler.address)

        for (let wallet of walletArr) {
            await usdt.transfer(wallet.address, m(2000, 18))
            console.log('deposit ERC20 to', wallet.address)
        }

        await print()
    })

    
    it('accounts atomSign', async function () {
        signedDataArr = []
        for (let wallet of walletArr) {
            let count = walletArr.indexOf(wallet) + 1

            let callArr = []
            let to = '0x'
            let value = 0
            let data = '0x'

            to = subBundler.address
            value = 0
            const SubBundler = await ethers.getContractFactory('SubBundler')
            data = SubBundler.interface.encodeFunctionData('bundlerCallback(address,uint256,bytes)', [wallet.address, m(1, 18), '0x'])
            callArr.push({to, value, data})
            
            to = usdt.address
            value = 0
            const ERC = await ethers.getContractFactory('MockERC20')
            data = ERC.interface.encodeFunctionData('transfer(address,uint256)', [subBundler.address, m(2000, 18)])
            callArr.push({to, value, data})

            let signedData = await atomSign(accounts[count], wallet.address, callArr)
            signedDataArr.push(signedData)
            console.log('wallet' + count + ' atomSign done')
        }
    })


    it('bundler executeOp', async function () {
        const SmartWallet = await ethers.getContractFactory('SmartWallet')
        let bytesArr = []
        let typeArr = []
        for (let signedData of signedDataArr) {
            let s = signedData
            let callData = SmartWallet.interface.encodeFunctionData('atomSignCall', [s.toArr, s.valueArr, s.dataArr, s.deadline, s.signature])
            
            let estimateGas = await subBundler.estimateGas.executeOp(s.fromWallet, callData)
            console.log('subBundler estimateGas:', estimateGas)

            let bytes = utils.defaultAbiCoder.encode(
                ['address', 'bytes'], 
                [s.fromWallet, callData]
            )

            typeArr.push(true)
            bytesArr.push(bytes)
        }

        let estimateGas = await bundler.estimateGas.bundle(typeArr, bytesArr)
        await bundler.bundle(typeArr, bytesArr)
        console.log('bundle done gasCost:', estimateGas)

        await print()
    })


    async function atomSign(signer, fromWallet, callArr) {
        let toArr = []
        let valueArr = []
        let dataArr = []
        for (let i=0; i<callArr.length; i++) {
            let to = callArr[i].to
            let value = callArr[i].value
            let data = callArr[i].data

            toArr.push(to)
            valueArr.push(value)
            dataArr.push(data)
        }

        let deadline = parseInt(Date.now() / 1000) + 600;
        let chainId = (await provider.getNetwork()).chainId
        let SmartWallet = await ethers.getContractFactory('SmartWallet')
        let wallet = await SmartWallet.attach(fromWallet)
        let valid = await wallet.valid()

        let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [toArr, valueArr, dataArr, deadline, '0x'])
        calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])

        let hash = utils.keccak256(calldata)
        let signature = await signer.signMessage(utils.arrayify(hash))

        return { toArr, valueArr, dataArr, deadline, chainId, fromWallet, valid, signature }
    }


    async function print() {
        console.log('')

        console.log('account0 usdt:', d(await usdt.balanceOf(accounts[0].address), 18), 'eth:', d(await provider.getBalance(accounts[0].address), 18))
        for (let wallet of walletArr) {
            let count = walletArr.indexOf(wallet) + 1
            console.log('wallet' + count + ' usdt:', d(await usdt.balanceOf(wallet.address), 18), 'eth:', d(await provider.getBalance(wallet.address), 18))
        }
        
        console.log('bundler usdt:', d(await usdt.balanceOf(bundler.address), 18), 'eth:', d(await provider.getBalance(bundler.address), 18))
        console.log('subBundler usdt:', d(await usdt.balanceOf(subBundler.address), 18), 'eth:', d(await provider.getBalance(subBundler.address), 18))

        console.log('')
    }


    function stringToHex(string) {
        let hexStr = '';
        for (let i = 0; i < string.length; i++) {
            let compact = string.charCodeAt(i).toString(16)
            hexStr += compact
        }
        return '0x' + hexStr
    }

    function getAbi(jsonPath) {
        let file = fs.readFileSync(jsonPath)
        let abi = JSON.parse(file.toString()).abi
        return abi
    }

    async function delay(sec) {
        console.log('delay.. ' + sec + 's')
        return new Promise((resolve, reject) => {
            setTimeout(resolve, sec * 1000);
        })
    }

    function m(num, decimals) {
        return BigNumber.from(num).mul(BigNumber.from(10).pow(decimals))
    }

    function d(bn, decimals) {
        return bn.mul(BigNumber.from(100)).div(BigNumber.from(10).pow(decimals)).toNumber() / 100
    }

    function b(num) {
        return BigNumber.from(num)
    }

    function n(bn) {
        return bn.toNumber()
    }

    function s(bn) {
        return bn.toString()
    }
})
