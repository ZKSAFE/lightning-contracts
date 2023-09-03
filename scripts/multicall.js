const hre = require('hardhat')
const { BigNumber } = require('ethers')


const MulticallAddr = '0x9e9835e736199C72fc481D13339F3817B9cC8dAD'
const WETHAddr = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'
const USDCAddr = '0x07865c6e87b9f70255377e024ace6630c1eaa37f'

async function main() {
	const accounts = await hre.ethers.getSigners()
	const signer = accounts[0]
	console.log('deployer:', signer.address)

	const provider = signer.provider
	const chainId = (await provider.getNetwork()).chainId
	console.log('chainId:', chainId)

    
	const Multicall = await ethers.getContractFactory('Multicall')
	let multicall = await Multicall.attach(MulticallAddr)
    
	const ERC20 = await ethers.getContractFactory('ERC20')
	
    let calls = []
    //WETH
    calls.push([
        WETHAddr,
        ERC20.interface.encodeFunctionData('name()', [])
    ])
    calls.push([
        WETHAddr,
        ERC20.interface.encodeFunctionData('symbol()', [])
    ])
    calls.push([
        WETHAddr,
        ERC20.interface.encodeFunctionData('balanceOf(address)', [signer.address])
    ])
    //USDC
    calls.push([
        USDCAddr,
        ERC20.interface.encodeFunctionData('name()', [])
    ])
    calls.push([
        USDCAddr,
        ERC20.interface.encodeFunctionData('symbol()', [])
    ])
    calls.push([
        USDCAddr,
        ERC20.interface.encodeFunctionData('balanceOf(address)', [signer.address])
    ])
    //ETH
    calls.push([
        MulticallAddr,
        Multicall.interface.encodeFunctionData('getEthBalance(address)', [signer.address])
    ])

    let ret = await multicall.aggregate(calls)
    let name = ERC20.interface.decodeFunctionResult('name()', ret.returnData[0])[0]
    let symbol = ERC20.interface.decodeFunctionResult('symbol()', ret.returnData[1])[0]
    let balance = ERC20.interface.decodeFunctionResult('balanceOf(address)', ret.returnData[2])[0]
    console.log(name, symbol, balance)

    name = ERC20.interface.decodeFunctionResult('name()', ret.returnData[3])[0]
    symbol = ERC20.interface.decodeFunctionResult('symbol()', ret.returnData[4])[0]
    balance = ERC20.interface.decodeFunctionResult('balanceOf(address)', ret.returnData[5])[0]
    console.log(name, symbol, balance)

    balance = Multicall.interface.decodeFunctionResult('getEthBalance(address)', ret.returnData[6])[0]
    console.log(balance)
}


main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})
