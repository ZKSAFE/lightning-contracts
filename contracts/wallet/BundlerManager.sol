// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./Bundler.sol";
import "./IPublicSocialRecovery.sol";

contract BundlerManager {

    address public owner;
    address public immutable bundler;
    address public publicSocialRecovery;

    event OwnerChanged(address oldOwner, address newOwner);
    event Error(uint8 i);

    modifier onlyOwner() {
        require(
            owner == msg.sender,
            "onlyOwner: caller is not the owner"
        );
        _;
    }

    modifier onlyPublicSocialRecovery() {
        require(
            publicSocialRecovery == msg.sender,
            "onlyOriginal: caller is not the original"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        bundler = address(new Bundler());
    }

    function bundle(bytes[] calldata dataArr) public onlyOwner returns(uint8 doneCount) {
        for (uint8 i = 0; i < dataArr.length; i++) {
            (bool success, ) = bundler.call{value: 0}(dataArr[i]);
            if (!success) {
                emit Error(i);
            } else {
                doneCount++;
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
    ) external onlyOwner {
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

    function changeOwner(address newOwner) external onlyOwner {
        _doChangeOwner(newOwner);
    }

    function _doChangeOwner(address newOwner) internal {
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }
}
