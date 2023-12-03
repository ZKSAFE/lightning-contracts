const { ethers } = require('hardhat')
const utils = ethers.utils

async function atomSign(signer, fromWallet, callArr, valid = 1) {
    let atomCallBytes = encodeAtomCallBytes(callArr)

    let deadline = parseInt(Date.now() / 1000 + 1000 + Math.random() * 1000);
    let chainId = (await signer.provider.getNetwork()).chainId
    let SmartWallet = await ethers.getContractFactory('SmartWalletV2')

    let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallBytes, deadline, '0x'])
    calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])
    let hash = utils.keccak256(calldata)
    let signature = await signer.signMessage(utils.arrayify(hash))

    return { atomCallBytes, deadline, chainId, fromWallet, valid, signature }
}

function encodeAtomCallBytes(callArr) {
    let atomCallBytes = '0x'
    for (let i = 0; i < callArr.length; i++) {
        let to = callArr[i].to
        let value = callArr[i].value
        let data = callArr[i].data

        let len = utils.arrayify(data).length
        atomCallBytes = utils.hexConcat([atomCallBytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
    }
    return atomCallBytes
}

function uuidToBytes32(uuid) {
    return utils.hexZeroPad('0x' + uuid.toString(), 32)
}

async function toOperationData(atomSignParams) {
    let SmartWallet = await ethers.getContractFactory('SmartWalletV2')
    return SmartWallet.interface.encodeFunctionData('atomSignCall',
        [atomSignParams.atomCallBytes, atomSignParams.deadline, atomSignParams.signature])
}

async function toBundleDataArr(atomSignParamsArr) {
    let SmartWallet = await ethers.getContractFactory('SmartWalletV2')
    let Bundler = await ethers.getContractFactory('Bundler')

    let bundleDataArr = []
    for (let p of atomSignParamsArr) {
        let atomSignData = SmartWallet.interface.encodeFunctionData('atomSignCall',
            [p.atomCallBytes, p.deadline, p.signature])

        let bundleData = Bundler.interface.encodeFunctionData('executeOperation', [p.fromWallet, atomSignData])
        bundleDataArr.push(bundleData)
    }
    return bundleDataArr
}

module.exports = { atomSign, encodeAtomCallBytes, uuidToBytes32, toOperationData, toBundleDataArr }