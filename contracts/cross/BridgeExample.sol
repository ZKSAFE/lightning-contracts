// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ISendPort.sol";
import "./ReceivePort.sol";

contract BridgeExample is ReceivePort, Ownable {
    using SafeERC20 for IERC20;

    ISendPort public sendPort;

    mapping(bytes32 => bool) public usedMsgHashes;

    mapping(uint => address) public trustBridges;

    mapping(address => address) public crossPairs;

    constructor(address sendPortAddr) {
        sendPort = ISendPort(sendPortAddr);
    }

    function setTrustBridge(uint chainId, address bridge) public onlyOwner {
        trustBridges[chainId] = bridge;
    }

    function setCrossPair(address fromTokenAddr, address toTokenAddr) public onlyOwner {
        crossPairs[fromTokenAddr] = toTokenAddr;
    }

    function getLeaves(uint packageIndex, uint start, uint num) view public returns(bytes32[] memory) {
        ISendPort.Package memory p = sendPort.getPackage(packageIndex);
        bytes32[] memory result = new bytes32[](num);
        for (uint i = 0; i < p.leaves.length && i < num; i++) {
            result[i] = p.leaves[i + start];
        }
        return result;
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
        uint packageIndex,
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
                packageIndex,
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
