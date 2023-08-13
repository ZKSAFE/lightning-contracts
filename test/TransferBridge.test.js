const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

describe('MerkleBridge-test', function () {
    let accounts
    let provider
    let readPort
    let writePort
    let transferBridgeA
    let transferBridgeB
    let usdt

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdt = await MockERC20.deploy('MockUSDT', 'USDT')
        await usdt.deployed()
        console.log('usdt deployed:', usdt.address)

        const ReadPort = await ethers.getContractFactory('ReadPort')
        readPort = await ReadPort.deploy()
        await readPort.deployed()
        console.log('readPort deployed:', readPort.address)

        const WritePort = await ethers.getContractFactory('WritePort')
        writePort = await WritePort.deploy()
        await writePort.deployed()
        console.log('writePort deployed:', writePort.address)

        const TransferBridge = await ethers.getContractFactory('TransferBridge')
        transferBridgeA = await TransferBridge.deploy(readPort.address, writePort.address)
        await transferBridgeA.deployed()
        console.log('transferBridgeA deployed:', transferBridgeA.address)

        transferBridgeB = await TransferBridge.deploy(readPort.address, writePort.address)
        await transferBridgeB.deployed()
        console.log('transferBridgeB deployed:', transferBridgeB.address)

        await usdt.mint(accounts[0].address, m(1000, 18))
        console.log('usdt mint to accounts[0]', d(await usdt.balanceOf(accounts[0].address), 18))

        await usdt.mint(transferBridgeB.address, m(1000, 18))
        console.log('usdt mint to transferBridgeB', d(await usdt.balanceOf(accounts[0].address), 18))
    })

    it('crossChainTransfer', async function () {
        for (let i=1; i<=4; i++) {
            let amount = s(m(i*10, 18))
            await usdt.approve(transferBridgeA.address, amount)
            await transferBridgeA.crossChainTransfer(usdt.address, amount, accounts[i].address)
        }

        await print()
    })

    let leaves
    let root
    it('cross', async function () {
        await writePort.generateRoot()

        root = await writePort.root()
        leaves = await writePort.getLeaves()
        console.log('root:', root)
        console.log('leaves:', leaves)

        await readPort.setRoot(root)
    })


    it('crossChainWithdraw', async function () {
        let tree = new MerkleTree(leaves, keccak256, { hashLeaves: false, sortPairs: true })
        console.log('tree.getHexRoot:', tree.getHexRoot())

        for (let i=1; i<=4; i++) {
            let leaf = leaves[i-1]
            let proof = tree.getHexProof(leaf)
            let amount = s(m(i*10, 18))
            await transferBridgeB.connect(accounts[i]).crossChainWithdraw(proof, usdt.address, amount, accounts[i].address)
        }

        await print()
    })


    async function print() {
        console.log('')
        
        for (let i=1; i<=4; i++) {
            console.log('account' + i + ' usdt:', d(await usdt.balanceOf(accounts[i].address), 18))
        }
        console.log('transferBridgeA usdt:', d(await usdt.balanceOf(transferBridgeA.address), 18))
        console.log('transferBridgeB usdt:', d(await usdt.balanceOf(transferBridgeB.address), 18))

        console.log('')
    }
})