// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IReceivePort {
    event PackageReceived(uint indexed fromChainId, uint indexed packageIndex, bytes32 root);

    struct Package {
        uint fromChainId;
        uint packageIndex;
        bytes32 root;
    }

    function receivePackages(Package[] calldata packages) external;

    function getRoot(uint fromChainId, uint packageIndex) external view returns (bytes32);

    function verify(
        uint fromChainId,
        uint packageIndex,
        bytes32[] memory proof,
        bytes32 msgHash,
        address sender
    ) external view returns (bool);
}
