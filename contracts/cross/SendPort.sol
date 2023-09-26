// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./ISendPort.sol";
import "hardhat/console.sol";

contract SendPort is ISendPort {
    uint public constant PACK_INTERVAL = 6000;
    uint public constant MAX_PACKAGE_MESSAGES = 100;

    uint public pendingIndex = 0;

    mapping(uint => Package) public packages;

    constructor() {
        packages[0] = Package(0, bytes32(0), new bytes32[](0), block.timestamp, 0);
    }

    function addMsgHash(bytes32 msgHash, uint toChainId) public {
        bytes32 leaf = keccak256(
            abi.encodePacked(msgHash, msg.sender, toChainId)
        );
        Package storage pendingPackage = packages[pendingIndex];
        pendingPackage.leaves.push(leaf);

        emit MsgHashAdded(pendingPackage.packageIndex, msg.sender, msgHash, toChainId, leaf);

        if (pendingPackage.leaves.length >= MAX_PACKAGE_MESSAGES) {
            console.log("MAX_PACKAGE_MESSAGES", pendingPackage.leaves.length);
            _pack();
            return;
        }

        // console.log("block.timestamp", block.timestamp);
        if (pendingPackage.createTime + PACK_INTERVAL <= block.timestamp) {
            console.log("PACK_INTERVAL", pendingPackage.createTime, block.timestamp);
            _pack();
        }
    }

    function pack() public {
        // testing ignore
        // require(packages[pendingIndex].createTime + PACK_INTERVAL <= block.timestamp, "SendPort::pack: pack interval too short");

       _pack();
    }

    function getPackage(uint packageIndex) public view returns (Package memory) {
        return packages[packageIndex];
    }

    function getPendingPackage() public view returns (Package memory) {
        return packages[pendingIndex];
    }

    function _pack() internal {
        Package storage pendingPackage = packages[pendingIndex];
        bytes32[] memory _leaves = pendingPackage.leaves;
        while (_leaves.length > 1) {
            _leaves = _computeLeaves(_leaves);
        }
        pendingPackage.root = _leaves[0];
        pendingPackage.packTime = block.timestamp;

        emit Packed(pendingPackage.packageIndex, pendingPackage.packTime, pendingPackage.root);

        pendingIndex = pendingPackage.packageIndex + 1;
        packages[pendingIndex] = Package(pendingIndex, bytes32(0), new bytes32[](0), pendingPackage.packTime, 0);
    }

    function _computeLeaves(bytes32[] memory _leaves) pure internal returns (bytes32[] memory _nextLeaves) {
        if (_leaves.length % 2 == 0) {
            _nextLeaves = new bytes32[](_leaves.length / 2);
            bytes32 computedHash;
            for (uint i = 0; i + 1 < _leaves.length; i += 2) {
                computedHash = _hashPair(_leaves[i], _leaves[i + 1]);
                _nextLeaves[i / 2] = computedHash;
            }

        } else {
            bytes32 lastLeaf = _leaves[_leaves.length - 1];
            _nextLeaves = new bytes32[]((_leaves.length / 2 + 1));
            bytes32 computedHash;
            for (uint i = 0; i + 1 < _leaves.length; i += 2) {
                computedHash = _hashPair(_leaves[i], _leaves[i + 1]);
                _nextLeaves[i / 2] = computedHash;
            }
            _nextLeaves[_nextLeaves.length - 1] = lastLeaf;
        }
    }

    function _hashPair(bytes32 a, bytes32 b) private pure returns (bytes32) {
        return a < b ? _efficientHash(a, b) : _efficientHash(b, a);
    }

    function _efficientHash(bytes32 a, bytes32 b) private pure returns (bytes32 value) {
        /// @solidity memory-safe-assembly
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
}