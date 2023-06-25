// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./SubBundler.sol";
import "hardhat/console.sol";

contract Bundler {
    address public owner;

    SubBundler public subBundler;

    event Error(uint8 i);

    modifier onlyOwner() {
        require(owner == msg.sender, "onlyOwner: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        subBundler = new SubBundler();
    }

    function bundle(
        bool[] calldata typeArr,
        bytes[] calldata bytesArr
    ) public onlyOwner {
        for (uint8 i = 0; i < bytesArr.length; i++) {
            if (typeArr[i]) {

                (
                    address toWallet,
                    bytes memory data
                ) = abi.decode(bytesArr[i], (address, bytes));
                try
                    subBundler.executeOp(toWallet, data)
                {
                    
                } catch {
                    emit Error(i);
                }

            } else {

                (
                    address poolAddr,
                    uint borrowAmount0,
                    uint borrowAmount1,
                    bytes memory data
                ) = abi.decode(bytesArr[i], (address, uint, uint, bytes));
                try
                    subBundler.executeFlash(poolAddr, borrowAmount0, borrowAmount1, data)
                {
                    
                } catch {
                    emit Error(i);
                }

            }
        }
    }
}
