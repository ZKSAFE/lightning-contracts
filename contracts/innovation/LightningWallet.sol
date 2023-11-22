// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "hardhat/console.sol";

contract LightningWallet is ReentrancyGuard{
    using ECDSA for bytes32;

    event BundlerChanged(
        address indexed previousBundler,
        address indexed newBundler
    );

    bool internal isInit;

    uint32 public valid = 1; //to make AtomSign invalid

    address private immutable original;
    address public owner;
    address public bundler;

    mapping(bytes32 => bool) public usedMsgHashes;

    modifier onlyBundler() {
        require(
            bundler == msg.sender,
            "onlyBundler: caller is not the bundler"
        );
        _;
    }

    modifier onlyOwnerAndOriginal() {
        require(owner == msg.sender || original == msg.sender, "onlyOwnerAndOriginal: caller is not the owner");
        _;
    }

    modifier onlyOwner() {
        require(owner == msg.sender, "onlyOwner: caller is not the owner");
        _;
    }

    modifier onlyOriginal() {
        require(original == msg.sender, "onlyOriginal: caller is not the original");
        _;
    }

    constructor() {
        original = address(this);
    }

    receive() external payable {}

    function init(address _owner, address _bundler, address to, uint value, bytes calldata data) public {
        require(!isInit, "init() runs only once");
        isInit = true;

        bundler = _bundler;
        owner = _owner;

        if (to != address(0)) {
            (bool success, bytes memory result) = to.call{value: value}(data);
            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }
    }

    /**
     * If you're the owner and also the bundler, you can call by youself
     */
    function atomCall(
        bytes calldata atomCallBytes
    ) public onlyOwner onlyBundler {
        _doAtomCall(atomCallBytes);
    }

    function _doAtomCall(bytes calldata atomCallBytes) private {
        uint i;
        while (i < atomCallBytes.length) {
            address to = address(uint160(bytes20(atomCallBytes[i:i + 20])));
            uint value = uint(bytes32(atomCallBytes[i + 20:i + 52]));
            uint len = uint(bytes32(atomCallBytes[i + 52:i + 84]));

            (bool success, bytes memory result) = to.call{value: value}(
                atomCallBytes[i + 84:i + 84 + len]
            );
            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }

            i += 84 + len;
        }
    }

    /**
     * Multiple operations in one sign, with atomic(all successed or all failed)
     * owner to sign, bundler to call
     */
    function atomSignCall(
        bytes calldata atomCallBytes,
        uint32 deadline,
        bytes calldata signature
    ) external onlyBundler {
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

        _doAtomCall(atomCallBytes);

        usedMsgHashes[msgHash] = true;
    }

    /**
     * if you signed something then regretted, make it invalid
     */
    function makeAtomSignInvalid() public onlyOwnerAndOriginal {
        valid = uint32(uint(blockhash(block.number)));
    }

}
