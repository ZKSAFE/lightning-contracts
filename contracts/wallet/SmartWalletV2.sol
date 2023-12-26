// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./IPublicSocialRecovery.sol";
// import "hardhat/console.sol";

contract SmartWalletV2 {
    using ECDSA for bytes32;

    event OwnerChanged(address oldOwner, address newOwner);
    event PendingBundler(address oldBundler, address pendingBundler);
    event BundlerReset(address oldBundler, address newBundler);

    bool internal isInit;

    uint32 public valid = 1; //to make AtomSign invalid

    address private immutable original;
    address public owner;
    address public bundler;
    address public pendingBundler; //change bundler needs pending
    address public publicSocialRecovery;

    uint public pendingBundlerStartTime;

    mapping(bytes32 => bool) public usedMsgHashes;

    modifier onlyBundler() {
        require(
            bundler == msg.sender,
            "onlyBundler: caller is not the bundler"
        );
        _;
    }

    modifier onlyPendingBundler() {
        require(
            pendingBundler == msg.sender,
            "onlyPendingBundler: caller is not the pendingBundler"
        );
        _;
    }

    modifier onlyOwnerAndOriginal() {
        require(
            owner == msg.sender || original == msg.sender,
            "onlyOwnerAndOriginal: caller is not the owner"
        );
        _;
    }

    modifier onlyOriginal() {
        require(
            original == msg.sender,
            "onlyOriginal: caller is not the original"
        );
        _;
    }

    modifier onlyPublicSocialRecovery() {
        require(
            publicSocialRecovery == msg.sender,
            "onlyPublicSocialRecovery: caller is not the onlyPublicSocialRecovery"
        );
        _;
    }

    constructor() {
        original = address(this);
    }

    receive() external payable {}

    function init(
        address _owner,
        address _bundler
    ) public {
        require(!isInit, "init() runs only once");
        isInit = true;

        bundler = _bundler;
        owner = _owner;
    }

    /**
     * If you're the owner and also the bundler, you can call by youself
     */
    function atomCall(
        bytes calldata atomCallBytes
    ) public onlyOwnerAndOriginal onlyBundler {
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
     * Supported delegatecall, call within atomCall & atomSignCall
     */
    function delegateCall(address to, bytes calldata data) public onlyOriginal {
        (bool success, bytes memory result) = to.delegatecall(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }


    ////////////////////////////
    ////   SocialRecovery   ////
    ////////////////////////////

    function initSocialRecovery(
        address _publicSocialRecovery,
        address[] calldata guardians,
        uint8 needGuardiansNum
    ) external onlyOwnerAndOriginal {
        require(publicSocialRecovery == address(0), "initSocialRecovery: already exist");

        publicSocialRecovery = _publicSocialRecovery;
        IPublicSocialRecovery(publicSocialRecovery).setGroup(
            guardians,
            needGuardiansNum
        );
    }

    function adoptProposal(bytes32 proposal) external onlyPublicSocialRecovery {
        if (uint96(bytes12(proposal)) == 4) {
            _doChangeOwner(address(uint160(uint(proposal))));
        } else {
            revert("adoptProposal: unsupported");
        }
    }

    function changeOwner(address newOwner) external onlyOwnerAndOriginal {
        _doChangeOwner(newOwner);
    }

    function _doChangeOwner(address newOwner) internal {
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    function changeBundler(address newBundler) external onlyOwnerAndOriginal {
        makeAtomSignInvalid();
        pendingBundler = newBundler;
        if (newBundler == address(0)) {
            pendingBundlerStartTime = 0;
            emit BundlerReset(bundler, bundler);
        } else {
            pendingBundlerStartTime = block.timestamp;
            emit PendingBundler(bundler, pendingBundler);
        }
    }

    function resetBundler() external onlyPendingBundler {
        require(block.timestamp > pendingBundlerStartTime + 3600 * 24 * 7, "resetBundler: needs 7 days pending");
        // require(block.timestamp > pendingBundlerStartTime + 3, "resetBundler: needs 3 secs pending [only for testing]");
        
        bundler = pendingBundler;
        pendingBundler = address(0);
        pendingBundlerStartTime = 0;
        emit BundlerReset(bundler, pendingBundler);
    }
}