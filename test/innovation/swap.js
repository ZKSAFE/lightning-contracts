const util = require('util')
const { BigNumber, utils } = require('ethers')
const { m, d, b, n, s, MAX_UINT256 } = require('../help/BigNumberHelp')


describe('swap.test', function () {
    let accounts
    let provider


    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })


    it('swap k = xy', async function () {
        console.log('')
        let poolUsd = m(200000, 6)
        let poolEth = m(100, 6)
        const k = poolUsd.mul(poolEth)
        console.log('addLiquidity USD:', d(poolUsd, 6), 'Token:', d(poolEth, 6))

        let inputUsd = m(20, 6)
        for (let i = 1; i <= 10; i++) {
            poolUsd = poolUsd.add(inputUsd)
            let balanceEth = k.div(poolUsd)
            let outputEth = poolEth.sub(balanceEth)
            poolEth = balanceEth
            console.log('input USD:', d(inputUsd, 6), 'output Token', d(outputEth, 6), 'deal price:', n(inputUsd)/n(outputEth))
        }
    })

    it('swap k = 1/x + 1/y', async function () {
        console.log('')
        let poolUsd = m(200000, 6)
        let poolEth = m(4470, 6)
        const k = MAX_UINT256.div(poolUsd).add( MAX_UINT256.div(poolEth) )
        console.log('addLiquidity USD:', d(poolUsd, 6), 'Token:', d(poolEth, 6))

        let inputUsd = m(2000, 6)
        for (let i = 1; i <= 10; i++) {
            poolUsd = poolUsd.add(inputUsd)
            let balanceEth = MAX_UINT256.div( k.sub( MAX_UINT256.div(poolUsd) ) )
            let outputEth = poolEth.sub(balanceEth)
            poolEth = balanceEth
            console.log('input USD:', d(inputUsd, 6), 'output Token', d(outputEth, 6), 'deal price:', n(inputUsd)/n(outputEth))
        }
    })

    it('swap k = xy', async function () {
        console.log('')
        let poolUsd = m(9000000, 6)
        let poolEth = m(4470, 6)
        const k = poolUsd.mul(poolEth)
        console.log('addLiquidity USD:', d(poolUsd, 6), 'Token:', d(poolEth, 6))

        let inputUsd = m(2000, 6)
        for (let i = 1; i <= 10; i++) {
            poolUsd = poolUsd.add(inputUsd)
            let balanceEth = k.div(poolUsd)
            let outputEth = poolEth.sub(balanceEth)
            poolEth = balanceEth
            console.log('input USD:', d(inputUsd, 6), 'output Token', d(outputEth, 6), 'deal price:', n(inputUsd)/n(outputEth))
        }
    })

    it('swap k = 1/x + 1/y', async function () {
        console.log('')
        let poolUsd = m(10000, 6)
        let poolEth = m(100, 6)
        const k = MAX_UINT256.div(poolUsd).add( MAX_UINT256.div(poolEth) )
        console.log('addLiquidity USD:', d(poolUsd, 6), 'Token:', d(poolEth, 6))

        let inputUsd = m(2000, 6)
        for (let i = 1; i <= 10; i++) {
            poolUsd = poolUsd.add(inputUsd)
            let balanceEth = MAX_UINT256.div( k.sub( MAX_UINT256.div(poolUsd) ) )
            let outputEth = poolEth.sub(balanceEth)
            poolEth = balanceEth
            console.log('input USD:', d(inputUsd, 6), 'output Token', d(outputEth, 6), 'deal price:', n(inputUsd)/n(outputEth))
        }
    })
})