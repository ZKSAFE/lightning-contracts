// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./SendPort.sol";
import "./ReceivePort.sol";

contract LockBridge is ReceivePort, Ownable {
    using SafeERC20 for IERC20;

    SendPort public sendPort;

    mapping(bytes32 => bool) public usedMsgHashes;

    mapping(uint => address) public trustBridges;

    mapping(address => address) public crossPairs;

    constructor(address sendPortAddr) {
        sendPort = SendPort(sendPortAddr);
    }

    function setTrustBridge(uint chainId, address bridge) public onlyOwner {
        trustBridges[chainId] = bridge;
    }

    function setCrossPair(address fromTokenAddr, address toTokenAddr) public onlyOwner {
        crossPairs[fromTokenAddr] = toTokenAddr;
    }

    function transferTo(
        uint toChainId,
        address fromTokenAddr,
        uint amount,
        address receiver
    ) public {
        bytes32 msgHash = keccak256(
            abi.encodePacked(toChainId, fromTokenAddr, amount, receiver)
        );
        sendPort.addMsgHash(msgHash, toChainId);

        IERC20(fromTokenAddr).safeTransferFrom(msg.sender, address(this), amount);
    }

    function transferFrom(
        uint fromChainId,
        uint rootIndex,
        bytes32[] memory proof,
        address fromTokenAddr,
        uint amount,
        address receiver
    ) public {
        bytes32 msgHash = keccak256(
            abi.encodePacked(block.chainid, fromTokenAddr, amount, receiver)
        );

        require(!usedMsgHashes[msgHash], "transferFrom: Used msgHash");

        require(
            verify(
                fromChainId,
                rootIndex,
                proof,
                msgHash,
                trustBridges[fromChainId]
            ),
            "transferFrom: verify failed"
        );

        usedMsgHashes[msgHash] = true;

        address toTokenAddr = crossPairs[fromTokenAddr];
        require(toTokenAddr != address(0), "transferFrom: fromTokenAddr is not crossPair");
        IERC20(toTokenAddr).safeTransfer(receiver, amount);
    }
}
