// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "hardhat/console.sol";

/**
 * Similar to Bundler.executeSandwich(), but less gas cost
 * executeSandwich gas cost: 560747
 * UnsignedHelper  gas cost: 297300
 */
contract UnsignedHelper {

    //keccak256(abi.encodeCall(Bundler.bundlerCallback2, bytes.concat()));
    bytes32 constant bundlerCallback2Hash = 0x3040d74aefb16bffade2625c6a7587044f8f4537c95cf5b0dd3dea04013898fb; 

    constructor() {
    }

    /**
     * Call in SmartWallet.delegateCallWithUnsignedData()
     */
    function atomSignCallWithUnsignedData(
        bytes calldata atomCallBytes,
        bytes calldata unsignedData
    ) external {

        uint i;
        while (i < atomCallBytes.length) {
            address to = address(uint160(bytes20(atomCallBytes[i:i + 20])));
            uint value = uint(bytes32(atomCallBytes[i + 20:i + 52]));
            uint len = uint(bytes32(atomCallBytes[i + 52:i + 84]));

            bool success;
            bytes memory result;

            bytes calldata data = atomCallBytes[i + 84:i + 84 + len];
            if (keccak256(data) == bundlerCallback2Hash) {
                (success, result) = to.call{value: value}(
                    abi.encodeCall(Bundler.bundlerCallback2, unsignedData)
                );
            } else {
                (success, result) = to.call{value: value}(data);
            }

            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }

            i += 84 + len;
        }
    }

}