// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./IReceivePort.sol";

abstract contract ReceivePort is IReceivePort {

    //fromChainId => packageIndex => root
    mapping(uint => mapping(uint => bytes32)) public roots;

    constructor() {}

    function receivePackages(Package[] calldata packages) public {
        for (uint i = 0; i < packages.length; i++) {
            Package calldata p = packages[i];
            require(roots[p.fromChainId][p.packageIndex] == bytes32(0), "ReceivePort::receivePackages: package already exist");
            roots[p.fromChainId][p.packageIndex] = p.root;

            emit PackageReceived(p.fromChainId, p.packageIndex, p.root);
        }
    }

    function getRoot(uint fromChainId, uint packageIndex) public view returns (bytes32) {
        return roots[fromChainId][packageIndex];
    }

    function verify(
        uint fromChainId,
        uint packageIndex,
        bytes32[] memory proof,
        bytes32 msgHash,
        address sender
    ) public view returns (bool) {
        bytes32 leaf = keccak256(
            abi.encodePacked(msgHash, sender, block.chainid)
        );
        return _processProof(proof, leaf) == roots[fromChainId][packageIndex];
    }

    function _processProof(bytes32[] memory proof, bytes32 leaf) internal pure returns (bytes32) {
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