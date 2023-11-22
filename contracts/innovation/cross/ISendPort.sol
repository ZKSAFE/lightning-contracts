// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ISendPort {
    event MsgHashAdded(uint indexed packageIndex, address sender, bytes32 msgHash, uint toChainId, bytes32 leaf);

    event Packed(uint indexed packageIndex, uint indexed packTime, bytes32 root);

    struct Package {
        uint packageIndex;
        bytes32 root;
        bytes32[] leaves;
        uint createTime;
        uint packTime;
    }

    function addMsgHash(bytes32 msgHash, uint toChainId) external;

    function pack() external;

    function getPackage(uint packageIndex) external view returns (Package memory);

    function getPendingPackage() external view returns (Package memory);
}
