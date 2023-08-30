// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ISendPort {
    event MsgHashAdded(bytes32 msgHash, uint toChainId, address sender);

    event Packed(uint indexed index, uint indexed packedTime, bytes32 root);

    struct Package {
        uint index;
        bytes32 root;
        bytes32[] leaves;
        uint[] toChainIds;
        uint initTime;
        uint packedTime;
    }

    function addMsgHash(bytes32 msgHash, uint toChainId) external;

    function pack() external;

    function getPackedPackage(uint index) external view returns (Package memory);

    function getPendingPackage() external view returns (Package memory);
}
