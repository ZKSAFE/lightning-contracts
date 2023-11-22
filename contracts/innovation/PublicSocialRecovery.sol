// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ISmartWallet {
    function proposalAdopted(bytes32 proposal) external;
}

contract PublicSocialRecovery {

    struct Group {
        address[] guardians;
        uint needGuardiansNum;
        address[] doneGuardians;
        bytes32 proposal;
    }

    mapping(address => Group) public groups;

    constructor() {}

    function setGroup(address[] calldata guardians, uint needGuardiansNum) public {
        require(groups[msg.sender].needGuardiansNum == 0, "registerGroup: group already exist");
        require(needGuardiansNum > 0, "registerGroup: needGuardiansNum must > 0");
        
        groups[msg.sender] = Group(guardians, needGuardiansNum, new address[](needGuardiansNum), bytes32(0));
    }

    function propose(address smartWalletAddr, bytes32 proposal) public {
        Group storage group = groups[smartWalletAddr];

        bool isGuardian;
        for (uint j = 0; j < group.guardians.length; ++j) {
            if (group.guardians[j] == msg.sender) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "propose: you're not the Guardian");

        if (group.proposal == proposal) {
            uint insertIndex = 0;
            bool insertIndexOnce;
            for (uint i = 0; i < group.doneGuardians.length; ++i) {
                if (!insertIndexOnce && group.doneGuardians[i] == address(0)) {
                    insertIndex = i;
                    insertIndexOnce = true;
                }
                require(
                    group.doneGuardians[i] != msg.sender,
                    "propose: don't repeat"
                );
            }

            if (insertIndex == group.needGuardiansNum - 1) {
                //fire!
                ISmartWallet(smartWalletAddr).proposalAdopted(proposal);
                group.doneGuardians = new address[](group.needGuardiansNum); //clean
                group.proposal = bytes32(0);
            } else {
                group.doneGuardians[insertIndex] = msg.sender;
            }

        } else {
            if (group.needGuardiansNum == 1) {
                //fire!
                ISmartWallet(smartWalletAddr).proposalAdopted(proposal);
            } else {
                group.doneGuardians[0] = msg.sender;
                group.proposal = proposal;
            }

        }
    }


}