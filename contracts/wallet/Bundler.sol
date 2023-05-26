// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./SubBundler.sol";
import "hardhat/console.sol";

contract Bundler {
    address public owner;

    SubBundler public subBundler;

    address internal _callTo;

    event Error(uint8 i);

    // struct Operation {
    //     address[] toArr;
    //     uint[] valueArr;
    //     bytes[] dataArr;
    // }

    // struct Flash {
    //     address poolAddr;
    //     uint borrowAmount0;
    //     uint borrowAmount1;
    //     bytes data;
    // }

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
                    address[] memory toArr,
                    uint[] memory valueArr,
                    bytes[] memory dataArr
                ) = abi.decode(bytesArr[i], (address[], uint[], bytes[]));
                try
                    subBundler.executeOp(toArr, valueArr, dataArr) returns (uint ethBefore, uint ethAfter)
                {
                    console.log("bundle: executeOp", ethBefore, ethAfter);
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
                    subBundler.executeFlash(poolAddr, borrowAmount0, borrowAmount1, data) returns (uint ethBefore, uint ethAfter)
                    // (uint ethBefore, uint ethAfter) = subBundler.executeFlash(poolAddr, borrowAmount0, borrowAmount1, data);
                {
                    console.log("bundle: executeFlash", ethBefore, ethAfter);
                } catch {
                    emit Error(i);
                }

            }
        }
    }
}
