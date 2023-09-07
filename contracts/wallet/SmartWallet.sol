// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./SocialRecovery.sol";
import "hardhat/console.sol";

contract SmartWallet is ReentrancyGuard, SocialRecovery, IERC1271 {
    using ECDSA for bytes32;

    event BundlerChanged(
        address indexed previousBundler,
        address indexed newBundler
    );

    uint32 public valid = 1; //to make AtomSign invalid

    address public bundler;

    mapping(bytes32 => bool) public usedMsgHashes;

    modifier onlyBundler() {
        require(
            bundler == msg.sender,
            "onlyBundler: caller is not the bundler"
        );
        _;
    }

    constructor(address _owner, address _bundler) SocialRecovery(_owner) {
        bundler = _bundler;
    }

    receive() external payable {}

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            super.supportsInterface(interfaceId) ||
            interfaceId ==
            this.atomCall.selector ^
                this.atomSignCall.selector ^
                this.makeAtomSignInvalid.selector;
    }

    /**
     * @notice Verifies that the signer is the owner of the signing contract.
     */
    function isValidSignature(
        bytes32 _hash,
        bytes calldata _signature
    ) external view override returns (bytes4) {
        // Validate signatures
        if (_hash.toEthSignedMessageHash().recover(_signature) == owner) {
            return 0x1626ba7e;
        } else {
            return 0xffffffff;
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

    /**
     * only owner can change bundler, before that, guardians need to be empty
     */
    function changeBundler(address newBundler) external onlyOwnerAndOriginal {
        require(
            needGuardiansNum == 0,
            "changeBundler: let the guardians quit first"
        );

        address oldBundler = bundler;
        bundler = newBundler;

        makeAtomSignInvalid(); //makeAtomSignInvalid

        emit BundlerChanged(oldBundler, newBundler);
    }

    /**
     * Multiple operations in one sign, with atomic(all successed or all failed)
     * owner to sign, bundler to call
     */
    function atomSignCallWithUnsignedData(
        bytes calldata atomCallBytes,
        uint32 deadline,
        bytes calldata signature,
        bytes calldata unsignedData
    ) external onlyBundler {
        require(deadline >= block.timestamp, "atomSignCallWithUnsignedData: Expired");
        bytes32 msgHash = keccak256(
            bytes.concat(
                msg.data[:msg.data.length - signature.length - unsignedData.length - 72],
                bytes32(block.chainid),
                bytes20(address(this)),
                bytes4(valid)
            )
        );
        require(!usedMsgHashes[msgHash], "atomSignCallWithUnsignedData: Used msgHash");
        require(
            owner == msgHash.toEthSignedMessageHash().recover(signature),
            "atomSignCallWithUnsignedData: Invalid Signature"
        );
        
        uint i;
        while (i < atomCallBytes.length) {
            address to = address(uint160(bytes20(atomCallBytes[i:i + 20])));
            uint value = uint(bytes32(atomCallBytes[i + 20:i + 52]));
            uint len = uint(bytes32(atomCallBytes[i + 52:i + 84]));

            bytes calldata data = atomCallBytes[i + 84:i + 84 + len];
            console.logBytes(data);
            // if (data == ) {
            // data = unsignedData;
            // }
            (bool success, bytes memory result) = to.call{value: value}(data);
            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }

            i += 84 + len;
        }

        usedMsgHashes[msgHash] = true;
    }


    function delegateCall(address to, bytes calldata data) public onlyOriginal {
        (bool success, bytes memory result) = to.delegatecall(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    
}
