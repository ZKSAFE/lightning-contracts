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
            new address[](needGuardiansNum),
            new address[](guardians.length - needGuardiansNum + 1),
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

            uint8 insertIndex = 0;
            bool insertIndexOnce;
            for (uint8 i = 0; i < group.approvedGuardians.length; ++i) {
                if (!insertIndexOnce && group.approvedGuardians[i] == address(0)) {
                    insertIndex = i;
                    insertIndexOnce = true;
                }
                require(
                    group.approvedGuardians[i] != msg.sender,
                    "propose: don't repeat"
                );
            }

            if (insertIndex == group.needGuardiansNum - 1) {
                //adopt!
                adoptProposal(group, proposal);
                proposalDone(group);
            } else {
                //add approve
                group.approvedGuardians[insertIndex] = msg.sender;
            }

        } else {

            if (group.needGuardiansNum == 1) {
                //adopt!
                adoptProposal(group, proposal);
            } else {
                if (group.proposal == bytes32(0)) {
                    //new proposal
                    group.approvedGuardians[0] = msg.sender;
                    group.proposal = proposal;
                } else {
                    uint8 insertIndex = 0;
                    bool insertIndexOnce;
                    for (uint8 i = 0; i < group.rejectedGuardians.length; ++i) {
                        if (!insertIndexOnce && group.rejectedGuardians[i] == address(0)) {
                            insertIndex = i;
                            insertIndexOnce = true;
                        }
                        require(
                            group.rejectedGuardians[i] != msg.sender,
                            "propose: don't repeat"
                        );
                    }

                    if (insertIndex == group.guardians.length - group.needGuardiansNum - 1) {
                        //reject proposal
                        proposalDone(group);
                    } else {
                        //add reject
                        group.rejectedGuardians[insertIndex] = msg.sender;
                    }
                }
            }
        }
    }

    function findIndexForElement(address[] storage arr, address element) internal view returns(uint8 insertIndex) {
        bool insertIndexOnce;
        for (uint8 i = 0; i < group.rejectedGuardians.length; ++i) {
            if (!insertIndexOnce && group.rejectedGuardians[i] == address(0)) {
                insertIndex = i;
                insertIndexOnce = true;
            }
            require(
                group.rejectedGuardians[i] != msg.sender,
                "propose: don't repeat"
            );
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
        require (group.guardians.length > 1, "removeGuardian: guardians.length must > 1");

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
        group.approvedGuardians = new address[](group.needGuardiansNum); //clean
        group.rejectedGuardians = new address[](group.guardians.length - group.needGuardiansNum + 1); //clean
        group.proposal = bytes32(0);
    }
}
