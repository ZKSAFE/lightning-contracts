// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract SmartWallet is ReentrancyGuard {
    using ECDSA for bytes32;

    uint32 public valid = 1; //to avoid Double Spent

    address public owner;

    address public bundler;

    mapping(bytes32 => bool) public usedMsgHashes;

    modifier onlyOwner() {
        require(owner == msg.sender, "onlyOwner: caller is not the owner");
        _;
    }

    modifier onlyBundler() {
        require(
            bundler == msg.sender,
            "onlyBundler: caller is not the bundler"
        );
        _;
    }


    constructor(address _owner, address _bundler) {
        owner = _owner;
        bundler = _bundler;
    }


    receive() external payable {}


    function batchCall(
        address[] calldata toArr,
        uint[] calldata valueArr,
        bytes[] calldata dataArr
    ) public onlyOwner onlyBundler {
        for (uint i = 0; i < toArr.length; i++) {
            (bool success, bytes memory result) = toArr[i].call{
                value: valueArr[i]
            }(dataArr[i]);

            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }
    }


    function atomSignCall(
        address[] calldata toArr,
        uint[] calldata valueArr,
        bytes[] calldata dataArr,
        uint32 deadline,
        bytes calldata signature
    ) external nonReentrant onlyBundler {
        require(deadline >= block.timestamp, "atomSignCall: Expired");
        bytes32 msgHash = keccak256(
            bytes.concat(
                msg.data[:msg.data.length - signature.length - 32],
                bytes32(block.chainid),
                bytes20(address(this)),
                bytes4(valid)
            )
        );
        require(!usedMsgHashes[msgHash], "atomSignCall: Used msgHash");
        require(
            owner == msgHash.toEthSignedMessageHash().recover(signature),
            "atomSignCall: Invalid Signature"
        );

        for (uint8 i = 0; i < toArr.length; i++) {
            (bool success, bytes memory result) = toArr[i].call{
                value: valueArr[i]
            }(dataArr[i]);

            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }

        usedMsgHashes[msgHash] = true;
    }
    

    function makeAtomSignInvalid() public onlyOwner {
        valid++;
    }
}
