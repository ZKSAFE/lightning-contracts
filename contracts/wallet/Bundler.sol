// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Bundler {
    using ECDSA for bytes32;

    address public owner;

    SubBundler public subBundler;

    address internal _callTo;

    struct Operation {
        address[] toArr;
        uint[] valueArr;
        bytes[] dataArr;
    }


    modifier onlyOwner() {
        require(owner == msg.sender, "onlyOwner: caller is not the owner");
        _;
    }


    constructor() {
        owner = msg.sender;
        subBundler = new SubBundler();
    }


    receive() external payable {}


    function bundleOps(Operation[] calldata opArr) public onlyOwner {
        for (uint8 i = 0; i < opArr.length; i++) {
            Operation memory op = opArr[i];
            try subBundler.executeOp(op.toArr, op.valueArr, op.dataArr) {
                
            } catch {
                
            }
        }
    }

}



contract SubBundler {
    using ECDSA for bytes32;

    Bundler public bundler;

    address internal _callTo;

    struct Operation {
        address[] toArr;
        uint[] valueArr;
        bytes[] dataArr;
    }


    modifier onlyOwner() {
        require(address(bundler) == msg.sender || bundler.owner() == msg.sender,
             "onlyOwner: caller is not the owner or bundler");
        _;
    }


    constructor() {
        bundler = Bundler(payable(msg.sender));
    }


    receive() external payable {}


    function executeOp(
        address[] memory toArr,
        uint[] memory valueArr,
        bytes[] memory dataArr
    ) public onlyOwner {
        for (uint8 i = 0; i < toArr.length; i++) {
            _callTo = toArr[i];
            console.log("Bundler::_callTo", _callTo);
            (bool success, bytes memory result) = _callTo.call{
                value: valueArr[i]
            }(dataArr[i]);

            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }
        _callTo = address(0);
    }


    function bundlerCallback(
        address to,
        uint value,
        bytes calldata data
    ) public {
        // console.log("Bundler::bundlerCallback", msg.sender, _callTo);
        require(msg.sender == _callTo, "bundlerCallback: Only _callTo");

        (bool success, bytes memory result) = to.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }
}