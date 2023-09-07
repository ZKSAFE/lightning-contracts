// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract SocialRecovery is IERC165 {

    event SocialRecoveryUpdated(address[] guardians, uint needGuardiansNum);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    event Cover(
        address indexed guardian,
        address indexed newOwner,
        uint doneNum
    );

    address public owner;
    address private immutable original;

    address[] public guardians;
    uint public needGuardiansNum;
    address[] public doneGuardians;
    address public prepareOwner;

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

    constructor(address _owner) {
        owner = _owner;
        original = address(this);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == this.supportsInterface.selector || // ERC165
            interfaceId == this.getSocialRecovery.selector
                ^ this.setSocialRecovery.selector
                ^ this.quitGuardian.selector
                ^ this.transferOwnership.selector
                ^ this.coverOwnership.selector;
    }

    /**
     * get the guardians info
     */
    function getSocialRecovery()
        public
        view
        returns (
            address[] memory,
            uint,
            address[] memory
        )
    {
        return (guardians, needGuardiansNum, doneGuardians);
    }

    /**
     * guardians multi-sign can change the owner, nothing more
     */
    function setSocialRecovery(
        address[] memory _guardians,
        uint _needGuardiansNum
    ) external onlyOwnerAndOriginal {
        require(needGuardiansNum == 0, "setSocialRecovery: let the guardians quit first");
        require(
            _needGuardiansNum > 0 && _needGuardiansNum <= _guardians.length,
            "setSocialRecovery: _needGuardiansNum error"
        );

        guardians = _guardians;
        needGuardiansNum = _needGuardiansNum;
        doneGuardians = new address[](_needGuardiansNum);
        prepareOwner = address(0);

        emit SocialRecoveryUpdated(guardians, needGuardiansNum);
    }

    /**
     * owner can transfer ownership by himself
     */
    function transferOwnership(address newOwner) external onlyOwnerAndOriginal {
        _transferOwnership(newOwner);
    }

    /**
     * if owner's private key get lost, guardians multi-sign can change the owner
     */
    function coverOwnership(address newOwner) external {
        bool isGuardian;
        for (uint j = 0; j < guardians.length; ++j) {
            if (guardians[j] == msg.sender) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "coverOwnership: you're not the Guardian");
        
        require(
            newOwner != address(0),
            "coverOwnership: newOwner can't be 0x00"
        );

        if (prepareOwner == newOwner) {
            uint insertIndex = 0;
            bool insertIndexOnce;
            for (uint i = 0; i < doneGuardians.length; ++i) {
                if (!insertIndexOnce && doneGuardians[i] == address(0)) {
                    insertIndex = i;
                    insertIndexOnce = true;
                }
                require(
                    doneGuardians[i] != msg.sender,
                    "coverOwnership: don't repeat"
                );
            }

            if (insertIndex == needGuardiansNum - 1) {
                //fire!
                _transferOwnership(newOwner);
                doneGuardians = new address[](needGuardiansNum); //clear doneGuardians
                prepareOwner = address(0);
            } else {
                doneGuardians[insertIndex] = msg.sender;
            }

            emit Cover(msg.sender, newOwner, insertIndex + 1);
        } else {
            if (needGuardiansNum == 1) {
                //fire!
                _transferOwnership(newOwner);
            } else {
                doneGuardians = new address[](needGuardiansNum);
                doneGuardians[0] = msg.sender;
                prepareOwner = newOwner;
            }

            emit Cover(msg.sender, newOwner, 1);
        }
    }

    function _transferOwnership(address newOwner) private {
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /**
     * guardian can quit by itself, then the doneGuardians will be reset
     */
    function quitGuardian() external {
        bool isGuardian;
        for (uint i = 0; i < guardians.length; ++i) {
            if (guardians[i] == msg.sender) {
                isGuardian = true;

                //update guardians
                guardians[i] = guardians[guardians.length - 1];
                guardians.pop();
                if (guardians.length < needGuardiansNum) {
                    --needGuardiansNum;
                }
                doneGuardians = new address[](needGuardiansNum);
                prepareOwner = address(0);

                break;
            }
        }
        require(isGuardian, "quitGuardian: you're not the Guardian");
    }
}