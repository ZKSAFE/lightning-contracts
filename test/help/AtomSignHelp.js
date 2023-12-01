const { ethers } = require('hardhat')
const utils = ethers.utils

exports.atomSign = async function (signer, fromWallet, callArr, valid=1) {
    let atomCallBytes = '0x'
    for (let i=0; i<callArr.length; i++) {
        let to = callArr[i].to
        let value = callArr[i].value
        let data = callArr[i].data
        
        let len = utils.arrayify(data).length
        atomCallBytes = utils.hexConcat([atomCallBytes, to, utils.hexZeroPad(value, 32), utils.hexZeroPad(len, 32), data])
    }

    let deadline = parseInt(Date.now() / 1000 + Math.random() * 1000);
    let chainId = (await signer.provider.getNetwork()).chainId
    let SmartWallet = await ethers.getContractFactory('SmartWalletV2')

    let calldata = SmartWallet.interface.encodeFunctionData('atomSignCall', [atomCallBytes, deadline, '0x'])
    calldata = utils.hexConcat([calldata, utils.hexZeroPad(chainId, 31), fromWallet, utils.hexZeroPad(valid, 4)])
    let hash = utils.keccak256(calldata)
    let signature = await signer.signMessage(utils.arrayify(hash))
    
    return { atomCallBytes, deadline, chainId, fromWallet, valid, signature }
}

exports.uuidToBytes32 = function (uuid) {
    return utils.hexZeroPad('0x' + uuid.toString(), 32)
}

exports.toOperationData = async function (atomSignParams) {
    let SmartWallet = await ethers.getContractFactory('SmartWalletV2')
    return SmartWallet.interface.encodeFunctionData('atomSignCall', 
        [atomSignParams.atomCallBytes, atomSignParams.deadline, atomSignParams.signature])
}