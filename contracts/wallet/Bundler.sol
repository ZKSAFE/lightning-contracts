// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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
        address wallet,
        bytes calldata data
    ) public onlyBundlerManager {
        _callTo = wallet;

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


    function executeOperationReturnIncreases(
        address wallet,
        bytes calldata data,
        address[] calldata retTokens
    ) public onlyBundlerManager returns (uint[] memory increases){
        uint[] memory beforeBalances = new uint[](retTokens.length);
        uint8 i;
        for (i = 0; i<retTokens.length; i++) {
            if (retTokens[i] == address(0)) {
                beforeBalances[i] = wallet.balance;
            } else {
                beforeBalances[i] = IERC20(retTokens[i]).balanceOf(wallet);
            }
        }

        executeOperation(wallet, data);

        increases = new uint[](retTokens.length);
        for (i = 0; i<retTokens.length; i++) {
             if (retTokens[i] == address(0)) {
                increases[i] = wallet.balance - beforeBalances[i];
            } else {
                increases[i] = IERC20(retTokens[i]).balanceOf(wallet) - beforeBalances[i];
            }
        }
        return increases;
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
        address pool,
        uint borrowAmount0,
        uint borrowAmount1,
        bytes calldata atomCallbytes
    ) external onlyBundlerManager {
        _callTo = pool;
        // recipient of borrowed amounts
        // amount of token0 requested to borrow
        // amount of token1 requested to borrow
        // need amount 0 and amount1 in callback to pay back pool
        // recipient of flash should be THIS contract
        IUniswapV3Pool(pool).flash(original, borrowAmount0, borrowAmount1, atomCallbytes);
    }


    function uniswapV3FlashCallback(
        uint,
        uint,
        bytes calldata atomCallbytes
    ) external override {
        require(msg.sender == _callTo, "uniswapV3FlashCallback: Only _callTo");

        uint i;
        while(i < atomCallbytes.length) {
            address to = address(uint160(bytes20(atomCallbytes[i:i+20])));
            uint value = uint(bytes32(atomCallbytes[i+20:i+52]));
            uint len = uint(bytes32(atomCallbytes[i+52:i+84]));

            (bool success, bytes memory result) = to.call{value: value}(atomCallbytes[i+84:i+84+len]);
            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }

            i += 84 + len;
        }

        _callTo = address(0);
    }
}
