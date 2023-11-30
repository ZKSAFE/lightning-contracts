// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ISmartWallet {
    function adoptProposal(bytes32 proposal) external;
}

contract PublicSocialRecovery {
    struct Group {
        address smartWalletAddr;
        address[] guardians;
        uint8 needGuardiansNum;
        address[] approvedGuardians;
        address[] rejectedGuardians;
        bytes32 proposal;
    }

    mapping(address => Group) public groups;

    constructor() {}

    function setGroup(
        address[] calldata guardians,
        uint8 needGuardiansNum
    ) external {
        require(
            groups[msg.sender].needGuardiansNum == 0,
            "setGroup: group already exist"
        );
        require(
            needGuardiansNum > 0 && needGuardiansNum <= guardians.length,
            "setGroup: needGuardiansNum error"
        );

        groups[msg.sender] = Group(
            msg.sender,
            guardians,
            needGuardiansNum,
            new address[](0),
            new address[](0),
            bytes32(0)
        );
    }

    function getGroup(
        address smartWalletAddr
    ) external view returns (Group memory) {
        return groups[smartWalletAddr];
    }

    function propose(address smartWalletAddr, bytes32 proposal) external {
        Group storage group = groups[smartWalletAddr];

        bool isGuardian;
        for (uint8 j = 0; j < group.guardians.length; ++j) {
            if (group.guardians[j] == msg.sender) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "propose: you're not the Guardian");

        if (group.proposal == proposal) {
            if (group.approvedGuardians.length == group.needGuardiansNum - 1) {
                //adopt!
                adoptProposal(group, proposal);
                proposalDone(group);
            } else {
                //add approve
                group.approvedGuardians.push(msg.sender);
            }
        } else {
            if (group.needGuardiansNum == 1) {
                //adopt!
                adoptProposal(group, proposal);
            } else {
                if (group.proposal == bytes32(0)) {
                    //new proposal
                    group.approvedGuardians.push(msg.sender);
                    group.proposal = proposal;
                } else {
                    if (group.rejectedGuardians.length == group.guardians.length - group.needGuardiansNum - 1) {
                        //reject proposal
                        proposalDone(group);
                    } else {
                        //add reject
                        group.rejectedGuardians.push(msg.sender);
                    }
                }
            }
        }
    }

    function adoptProposal(Group storage group, bytes32 proposal) internal {
        if (uint96(bytes12(proposal)) == 1) {
            addGuardian(group, address(uint160(uint(proposal))));
        } else if (uint96(bytes12(proposal)) == 2) {
            removeGuardian(group, address(uint160(uint(proposal))));
        } else if (uint96(bytes12(proposal)) == 3) {
            updateNeedGuardiansNum(group, uint8(uint(proposal)));
        } else {
            ISmartWallet(group.smartWalletAddr).adoptProposal(proposal);
        }
    }

    function addGuardian(Group storage group, address newGuardian) internal {
        uint8 i;
        for (i = 0; i < group.guardians.length; ++i) {
            if (group.guardians[i] == newGuardian) {
                break;
            }
        }

        if (i == group.guardians.length) {
            group.guardians.push(newGuardian);
        } else {
            revert("addGuardian: already exist");
        }
    }

    function removeGuardian(
        Group storage group,
        address removedGuardian
    ) internal {
        require(
            group.guardians.length > 1,
            "removeGuardian: guardians.length must > 1"
        );

        uint8 i;
        for (i = 0; i < group.guardians.length; ++i) {
            if (group.guardians[i] == removedGuardian) {
                break;
            }
        }

        if (i < group.guardians.length) {
            group.guardians[i] = group.guardians[group.guardians.length - 1];
            group.guardians.pop();

            if (group.guardians.length < group.needGuardiansNum) {
                group.needGuardiansNum = uint8(group.guardians.length);
            }
        } else {
            revert("removeGuardian: not exist");
        }
    }

    function updateNeedGuardiansNum(Group storage group, uint8 num) internal {
        if (num > 0 && num <= group.guardians.length) {
            group.needGuardiansNum = num;
        } else {
            revert("updateNeedGuardiansNum: num error");
        }
    }

    function proposalDone(Group storage group) internal {
        if (group.approvedGuardians.length > 0) {
            group.approvedGuardians = new address[](0);
        }
        if (group.rejectedGuardians.length > 0) {
            group.rejectedGuardians = new address[](0);
        }
        group.proposal = bytes32(0);
    }
}
