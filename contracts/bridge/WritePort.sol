// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;


contract WritePort {

    bytes32[] public leaves;
    bytes32 public root;

    constructor() {}

    function addMsgHash(bytes32 msgHash) public {
        leaves.push(msgHash);
    }

    function generateRoot() public {
        if (leaves.length % 2 == 0) {
            bytes32[] memory _leaves = leaves;
            while (_leaves.length > 1) {
                _leaves = _computeLeaves(_leaves);
            }
            root = _leaves[0];

        } else {
            bytes32 lastLeaf = leaves[leaves.length - 1];
            leaves.pop();
            bytes32[] memory _leaves = leaves;
            while (_leaves.length > 1) {
                _leaves = _computeLeaves(_leaves);
            }
            root = _hashPair(_leaves[0], lastLeaf);
            leaves.push(lastLeaf);
        }
    }

    function getLeaves() public view returns (bytes32[] memory _leaves) {
        _leaves = leaves;
    }

    function _computeLeaves(bytes32[] memory _leaves) pure internal returns (bytes32[] memory _nextLeaves) {
        _nextLeaves = new bytes32[](_leaves.length / 2);
        bytes32 computedHash;
        for (uint i = 0; i + 1 < _leaves.length; i += 2) {
            computedHash = _hashPair(_leaves[i], _leaves[i + 1]);
            _nextLeaves[i / 2] = computedHash;
        }
    }

    function processProof(bytes32[] memory proof, bytes32 leaf) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = _hashPair(computedHash, proof[i]);
        }
        return computedHash;
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