// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "hardhat/console.sol";

/**
 * With unsignedData has security risk, use Bundler.executeSandwich() instead
 */
contract UnsignedHelp {

    uint32 public valid = 1; //to make AtomSign invalid

    address public bundler;

    mapping(bytes32 => bool) public usedMsgHashes;

    constructor() {
        
    }

    /**
     * Multiple operations in one sign, with atomic(all successed or all failed)
     * owner to sign, bundler to call
     */
    // function atomSignCallWithUnsignedData(
    //     bytes calldata atomCallBytes,
    //     uint32 deadline,
    //     bytes calldata signature,
    //     bytes calldata unsignedData
    // ) external {
    //     require(deadline >= block.timestamp, "atomSignCallWithUnsignedData: Expired");
    //     bytes32 msgHash = keccak256(
    //         bytes.concat(
    //             msg.data[:msg.data.length - signature.length - unsignedData.length - 72],
    //             bytes32(block.chainid),
    //             bytes20(address(this)),
    //             bytes4(valid)
    //         )
    //     );
    //     require(!usedMsgHashes[msgHash], "atomSignCallWithUnsignedData: Used msgHash");
    //     require(
    //         owner == msgHash.toEthSignedMessageHash().recover(signature),
    //         "atomSignCallWithUnsignedData: Invalid Signature"
    //     );
        
    //     uint i;
    //     while (i < atomCallBytes.length) {
    //         address to = address(uint160(bytes20(atomCallBytes[i:i + 20])));
    //         uint value = uint(bytes32(atomCallBytes[i + 20:i + 52]));
    //         uint len = uint(bytes32(atomCallBytes[i + 52:i + 84]));

    //         bytes calldata data = atomCallBytes[i + 84:i + 84 + len];
    //         console.logBytes(data);
    //         // if (data == ) {
    //         // data = unsignedData;
    //         // }
    //         (bool success, bytes memory result) = to.call{value: value}(data);
    //         if (!success) {
    //             assembly {
    //                 revert(add(result, 32), mload(result))
    //             }
    //         }

    //         i += 84 + len;
    //     }

    //     usedMsgHashes[msgHash] = true;
    // }

}