const { ethers } = require('hardhat')
const utils = ethers.utils
const { m, d, b, n, s, ETH_ADDRESS, balanceStr, convertToHex } = require('../help/BigNumberHelp')

describe('ERC721Insc.test', function () {
    let accounts
    let provider
    let erc721Insc
    let erc20Insc
    
    before(async function () {
        accounts = await ethers.getSigners()
        provider = accounts[0].provider
    })

    it('deploy', async function () {
        const ERC721Insc = await ethers.getContractFactory('ERC721Insc')
        erc721Insc = await ERC721Insc.deploy('ERC721-Insc', 'deploy', 'Insc', 5*1000, 1000)
        await erc721Insc.deployed()
        console.log('erc721Insc deployed:', erc721Insc.address)

        console.log('name:', await erc721Insc.name())
        console.log('symbol:', await erc721Insc.symbol())
        console.log('')
        console.log('p:', utils.toUtf8String(await erc721Insc.deployInfo('p')))
        console.log('op:', utils.toUtf8String(await erc721Insc.deployInfo('op')))
        console.log('tick:', utils.toUtf8String(await erc721Insc.deployInfo('tick')))
        console.log('max:', parseInt(await erc721Insc.deployInfo('max')))
        console.log('lim:', parseInt(await erc721Insc.deployInfo('lim')))

        const ERC20Insc = await ethers.getContractFactory('ERC20Insc')
        erc20Insc = await ERC20Insc.deploy(erc721Insc.address)
        await erc20Insc.deployed()
        console.log('erc20Insc deployed:', erc20Insc.address)
    })

    it('inscribe mint', async function () {
        const insc = convertToHex('{"p":"ERC721-Insc","op":"mint","tick":"Insc","amt":"1000"}')
        console.log('mint insc:', insc)
        await erc721Insc.inscribe(accounts[0].address, insc)
        await erc721Insc.inscribe(accounts[0].address, insc)
        await erc721Insc.inscribe(accounts[0].address, insc)
        await erc721Insc.inscribe(accounts[0].address, insc)
        await erc721Insc.inscribe(accounts[1].address, insc)

        console.log('tokenURI:', await erc721Insc.tokenURI(1))
        await print()
    })

    it('inscribe transfer', async function () {
        const insc = convertToHex('{"p":"ERC721-Insc","op":"transfer","tick":"Insc","amt":"1000"}')
        console.log('transfer insc:', insc)
        await erc721Insc.inscribe(accounts[1].address, insc)
        await print()
    })

    it('erc721 convert to erc20', async function () {
        let tokenId = await erc721Insc.tokenOfOwnerByIndex(accounts[0].address, 0) 
        await erc721Insc.approve(erc20Insc.address, tokenId)
        await erc20Insc.mint(tokenId)

        tokenId = await erc721Insc.tokenOfOwnerByIndex(accounts[0].address, 0) 
        await erc721Insc.approve(erc20Insc.address, tokenId)
        await erc20Insc.mint(tokenId)
        
        tokenId = await erc721Insc.tokenOfOwnerByIndex(accounts[0].address, 0) 
        await erc721Insc.approve(erc20Insc.address, tokenId)
        await erc20Insc.mint(tokenId)

        await print()
    })

    it('erc20 transfer', async function () {
        await erc20Insc.transfer(accounts[1].address, m(3000, await erc20Insc.decimals()))
        await print()
    })

    it('erc20 convert to erc721', async function () {
        await erc20Insc.connect(accounts[1]).burn(m(2000, await erc20Insc.decimals()))
        await print()
    })

    async function print() {
        let lim = parseInt(await erc721Insc.deployInfo('lim'))
        let tickNum = n(await erc721Insc.balanceOf(accounts[0].address))
        for (let i=0; i<tickNum; i++) {
            let tokenId = await erc721Insc.tokenOfOwnerByIndex(accounts[0].address, i)
            console.log('account0 index:', i, '#' + n(tokenId))
        }
        console.log('account0 erc721 amt:', tickNum * lim)
        console.log('account0 erc20 amt:', await erc20Insc.balanceOf(accounts[0].address))

        tickNum = n(await erc721Insc.balanceOf(accounts[1].address))
        for (let i=0; i<tickNum; i++) {
            let tokenId = await erc721Insc.tokenOfOwnerByIndex(accounts[1].address, i)
            console.log('account1 index:', i, '#' + n(tokenId))
        }
        console.log('account1 amt:', tickNum * lim)
        console.log('account1 erc20 amt:', await erc20Insc.balanceOf(accounts[1].address))
    }
})
