// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "./SocialRecovery.sol";
import "hardhat/console.sol";

contract SmartWallet is ReentrancyGuard, SocialRecovery {
    using ECDSA for bytes32;

    event BundlerChanged(address indexed previousBundler, address indexed newBundler);

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

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            super.supportsInterface(interfaceId) ||
            interfaceId == this.batchCall.selector
                ^ this.atomSignCall.selector
                ^ this.makeAtomSignInvalid.selector;
    }

    /**
     * if you're the owner and also the bundler, you can call by youself
     */
    function batchCall(
        address[] calldata toArr,
        uint[] calldata valueArr,
        bytes[] calldata dataArr
    ) public onlyOwnerAndOrignal onlyBundler {
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

    /**
     * multiple operations in a sign, with atomic(all successed or all failed)
     * owner to sign, bundler to call
     */
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

        console.log("atomSignCall: check pass");

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
    
    /**
     * if you signed something then regretted, make it invalid
     */
    function makeAtomSignInvalid() public onlyOwnerAndOrignal {
        valid++;
    }

    /**
     * only owner can change bundler, before that, guardians need to be empty
     */
    function changeBundler(address newBundler) external onlyOwnerAndOrignal {
        require(needGuardiansNum == 0, "changeBundler: let the guardians quit first");
        
        address oldBundler = bundler;
        bundler = newBundler;

        emit BundlerChanged(oldBundler, newBundler);
    }

}
