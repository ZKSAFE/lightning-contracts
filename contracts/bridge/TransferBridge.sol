// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ReadPort.sol";
import "./WritePort.sol";

contract TransferBridge {
    using SafeERC20 for IERC20;

    ReadPort public readPort;
    WritePort public writePort;

    mapping(bytes32 => bool) public usedMsgHashes;

    constructor(address readPortAddr, address writePortAddr) {
        readPort = ReadPort(readPortAddr);
        writePort = WritePort(writePortAddr);
    }

    function crossChainTransfer(
        address tokenAddr,
        uint amount,
        address receiver
    ) public {
        IERC20(tokenAddr).safeTransferFrom(msg.sender, address(this), amount);

        bytes32 msgHash = keccak256(
            abi.encodePacked(tokenAddr, amount, receiver)
        );
        writePort.addMsgHash(msgHash);
    }

    function crossChainWithdraw(
        bytes32[] memory proof,
        address tokenAddr,
        uint amount,
        address receiver
    ) public {
        bytes32 msgHash = keccak256(
            abi.encodePacked(tokenAddr, amount, receiver)
        );

        require(!usedMsgHashes[msgHash], "TransferBridge: Used msgHash");

        require(readPort.verify(proof, msgHash), "TransferBridge: verify failed");

        usedMsgHashes[msgHash] = true;
        IERC20(tokenAddr).safeTransfer(receiver, amount);
    }
}