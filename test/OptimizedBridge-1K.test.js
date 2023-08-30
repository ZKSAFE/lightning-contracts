const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s } = require('./help/BigNumberHelp')
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

describe('OptimizedBridge-1K.test', function () {
    let chainId
    let accounts
    let provider
    let sendPort
    let fromBridge
    let toBridge
    let usdt

    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
        chainId = (await provider.getNetwork()).chainId
    })

    it('deploy', async function () {
        const MockERC20 = await ethers.getContractFactory('MockERC20')
        usdt = await MockERC20.deploy('MockUSDT', 'USDT')
        await usdt.deployed()
        console.log('usdt deployed:', usdt.address)

        const OptimizedPort = await ethers.getContractFactory('OptimizedPort')
        sendPort = await OptimizedPort.deploy()
        await sendPort.deployed()
        console.log('sendPort deployed:', sendPort.address)

        const LockBridge = await ethers.getContractFactory('LockBridge')
        fromBridge = await LockBridge.deploy(sendPort.address)
        await fromBridge.deployed()
        console.log('fromBridge deployed:', fromBridge.address)

        toBridge = await LockBridge.deploy(sendPort.address)
        await toBridge.deployed()
        console.log('toBridge deployed:', toBridge.address)

        await usdt.mint(accounts[0].address, m(10000, 18))
        console.log('usdt mint to accounts[0]', d(await usdt.balanceOf(accounts[0].address), 18))

        await usdt.mint(toBridge.address, m(10000, 18))
        console.log('usdt mint to toBridge', d(await usdt.balanceOf(toBridge.address), 18))

        await toBridge.setTrustBridge(chainId, fromBridge.address)
        await toBridge.setCrossPair(usdt.address, usdt.address)
        console.log('toBridge setup done')
    })

    it('transferTo', async function () {
        for (let i=1; i<=100; i++) {
            let amount = s(m(i, 18))
            await usdt.approve(fromBridge.address, amount)
            let estimateGas = await fromBridge.estimateGas.transferTo(chainId, usdt.address, amount, accounts[1].address)
            console.log('transferTo estimateGas', estimateGas)
            await fromBridge.transferTo(chainId, usdt.address, amount, accounts[1].address)
        }

        await print()
    })

    let rootIndex
    let crossPackage
    it('cross', async function () {
        let estimateGas = await sendPort.estimateGas.pack()
        console.log('pack estimateGas', estimateGas) //5668876
        await sendPort.pack()

        let pendingPackage = await sendPort.pendingPackage()
        console.log('pendingPackage:', pendingPackage)

        rootIndex = n(pendingPackage.index) - 1
        crossPackage = await sendPort.packedPackage(rootIndex)
        console.log('crossPackage:', rootIndex, crossPackage)

        await toBridge.receivePackages([{
            fromChainId: chainId,
            rootIndex: rootIndex,
            root: crossPackage.root
        }])
        console.log('toBridge.receivePackages() done')
    })


    it('transferFrom', async function () {
        let leaves = []
        for (let i = 0; i < 10; i++) {
            let start = 10 * i;
            let ls = await fromBridge.getLeaves(rootIndex, start, 10)
            console.log('ls:', ls)
            leaves = leaves.concat(ls)
        }
        console.log('leaves:', leaves)

        let merkleTree = new MerkleTree(leaves, keccak256, { hashLeaves: false, sortPairs: true })
        console.log('merkleTree.getHexRoot:', merkleTree.getHexRoot())
        console.log('toBridge.getRoot():', await toBridge.getRoot(chainId, rootIndex))

        let leaf = leaves[0]
        let proof = merkleTree.getHexProof(leaf)
        let amount = s(m(1, 18))
        await toBridge.connect(accounts[1]).transferFrom(chainId, rootIndex, proof, usdt.address, amount, accounts[1].address)

        await print()
    })


    async function print() {
        console.log('')
        
        for (let i=1; i<=4; i++) {
            console.log('account' + i + ' usdt:', d(await usdt.balanceOf(accounts[i].address), 18))
        }
        console.log('fromBridge usdt:', d(await usdt.balanceOf(fromBridge.address), 18))
        console.log('toBridge usdt:', d(await usdt.balanceOf(toBridge.address), 18))

        console.log('')
    }
})