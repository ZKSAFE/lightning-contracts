// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

interface IOwner {
    function owner() external view returns (address);
}

contract Bundler is IUniswapV3FlashCallback {

    address private immutable original;

    address public immutable bundlerManager;

    address internal _callTo;

    modifier onlyBundlerManager() {
        require(
            bundlerManager == msg.sender || IOwner(bundlerManager).owner() == msg.sender,
            "onlyBundlerManager: caller is not the BundlerManager or its owner"
        );
        _;
    }

    constructor() {
        bundlerManager = msg.sender;
        original = address(this);
    }


    receive() external payable {}


    function executeOperation(
        address toWallet,
        bytes calldata data
    ) public onlyBundlerManager {
        _callTo = toWallet;

        (bool success, bytes memory result) = _callTo.call{
            value: 0
        }(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }

        _callTo = address(0);
    }


    function bundlerCallback(
        address to,
        uint value,
        bytes calldata data
    ) external {
        require(msg.sender == _callTo, "bundlerCallback: Only _callTo");

        (bool success, bytes memory result) = to.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }


    function executeFlash(
        address poolAddr,
        uint borrowAmount0,
        uint borrowAmount1,
        bytes calldata data
    ) external onlyBundlerManager {
        IUniswapV3Pool pool = IUniswapV3Pool(poolAddr);
        _callTo = poolAddr;
        // recipient of borrowed amounts
        // amount of token0 requested to borrow
        // amount of token1 requested to borrow
        // need amount 0 and amount1 in callback to pay back pool
        // recipient of flash should be THIS contract
        pool.flash(original, borrowAmount0, borrowAmount1, data);
    }


    function uniswapV3FlashCallback(
        uint,
        uint,
        bytes calldata data
    ) external override {
        require(msg.sender == _callTo, "uniswapV3FlashCallback: Only _callTo");

        (
            address[] memory toArr,
            uint[] memory valueArr,
            bytes[] memory dataArr
        ) = abi.decode(data, (address[], uint[], bytes[]));

        for (uint8 i = 0; i < toArr.length; i++) {
            _callTo = toArr[i];

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
}
