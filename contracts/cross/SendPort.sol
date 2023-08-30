// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./ISendPort.sol";
import "hardhat/console.sol";

contract SendPort is ISendPort {
    uint public constant PACK_INTERVAL = 60;
    uint public constant MAX_PACKAGE_MESSAGES = 3000;

    Package public pendingPackage;

    mapping(uint => Package) public packedPackage;

    constructor() {
        pendingPackage = Package(0, bytes32(0), new bytes32[](0), new uint[](0), block.timestamp, 0);
    }

    function addMsgHash(bytes32 msgHash, uint toChainId) public {
        bytes32 leaf = keccak256(
            abi.encodePacked(msgHash, msg.sender)
        );
        pendingPackage.leaves.push(leaf);
        pendingPackage.toChainIds.push(toChainId);

        emit MsgHashAdded(leaf, toChainId, msg.sender);

        if (pendingPackage.leaves.length >= MAX_PACKAGE_MESSAGES) {
            _pack();
            return;
        }

        if (pendingPackage.initTime + PACK_INTERVAL <= block.timestamp) {
            _pack();
        }
    }

    function pack() public {
        // testing jump
        // require(pendingPackage.initTime + PACK_INTERVAL <= block.timestamp, "SendPort::pack: pack interval too short");

       _pack();
    }

    function getPackedPackage(uint index) public view returns (Package memory) {
        return packedPackage[index];
    }

    function getPendingPackage() public view returns (Package memory) {
        return pendingPackage;
    }

    function _pack() internal {
        bytes32[] memory _leaves = pendingPackage.leaves;
        while (_leaves.length > 1) {
            _leaves = _computeLeaves(_leaves);
        }
        pendingPackage.root = _leaves[0];
        pendingPackage.packedTime = block.timestamp;

        packedPackage[pendingPackage.index] = pendingPackage;
        emit Packed(pendingPackage.index, pendingPackage.packedTime, pendingPackage.root);

        pendingPackage = Package(pendingPackage.index + 1, bytes32(0), new bytes32[](0), new uint[](0), pendingPackage.packedTime, 0);
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