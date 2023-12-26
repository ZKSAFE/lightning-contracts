// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface ISmartWallet {
    function adoptProposal(bytes32 proposal) external;
}

contract PublicSocialRecovery {

    event NewProposal(address indexed smartWallet, address proposer, bytes32 proposal);
    event AddApprove(address indexed smartWallet, address approver, bytes32 proposal);
    event AddReject(address indexed smartWallet, address rejecter, bytes32 proposal);
    event AdoptProposal(address indexed smartWallet, address executor, bytes32 proposal);
    event RejectProposal(address indexed smartWallet, address executor, bytes32 proposal);
    event AddGuardian(address indexed smartWallet, address guardian, bytes32 proposal);
    event RemoveGuardian(address indexed smartWallet, address guardian, bytes32 proposal);
    event UpdateNeedGuardiansNum(address indexed smartWallet, uint8 num, bytes32 proposal);

    struct Group {
        address smartWallet;
        address[] guardians;
        uint8 needGuardiansNum;
        address[] approvedGuardians;
        address[] rejectedGuardians;
        bytes32 proposal;
        bool exist;
    }

    mapping(address => Group) public groups;

    constructor() {}

    //msg.sender MUST be ISmartWallet
    function setGroup(
        address[] calldata guardians,
        uint8 needGuardiansNum
    ) external {
        require(!groups[msg.sender].exist, "setGroup: group already exist");
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
            bytes32(0),
            true
        );
    }

    function getGroup(
        address smartWallet
    ) external view returns (Group memory) {
        return groups[smartWallet];
    }

    function propose(address smartWallet, bytes32 proposal) external {
        Group storage group = groups[smartWallet];

        bool isGuardian;
        for (uint8 j = 0; j < group.guardians.length; ++j) {
            if (group.guardians[j] == msg.sender) {
                isGuardian = true;
                break;
            }
        }
        require(isGuardian, "propose: you're not the Guardian");

        uint8 i;
        for (i = 0; i < group.approvedGuardians.length; ++i) {
            if (group.approvedGuardians[i] == msg.sender) {
                revert("propose: don't repeat");
            }
        }
        for (i = 0; i < group.rejectedGuardians.length; ++i) {
            if (group.rejectedGuardians[i] == msg.sender) {
                revert("propose: don't repeat");
            }
        }

        if (proposal == bytes32(0) && group.proposal == bytes32(0)) {
            revert("propose: new proposal cannot be empty");
        }

        if (group.needGuardiansNum == 1) {
            //new proposal & adopt!
            group.proposal = proposal;
            adoptProposal(group);
            emit NewProposal(smartWallet, msg.sender, proposal);
            
        } else if (group.proposal == bytes32(0) && proposal != bytes32(0)) {
            //new proposal
            group.approvedGuardians.push(msg.sender);
            group.proposal = proposal;
            emit NewProposal(smartWallet, msg.sender, proposal);

        } else if (group.proposal == proposal && group.approvedGuardians.length + 1 < group.needGuardiansNum) {
            //add approve
            group.approvedGuardians.push(msg.sender);
            emit AddApprove(smartWallet, msg.sender, proposal);


        } else if (group.proposal == proposal && group.approvedGuardians.length + 1 >= group.needGuardiansNum) {
            //adopt!
            adoptProposal(group);

        } else if (group.proposal != proposal && group.rejectedGuardians.length + 1 <= group.guardians.length - group.needGuardiansNum) {
            //add reject
            group.rejectedGuardians.push(msg.sender);
            emit AddReject(smartWallet, msg.sender, proposal);

        } else if (group.proposal != proposal && group.rejectedGuardians.length + 1 > group.guardians.length - group.needGuardiansNum) {
            //reject proposal
            cleanProposal(group);
            emit RejectProposal(smartWallet, msg.sender, proposal);

        } else {
            revert("propose: something wrong");
        }
    }

    function adoptProposal(Group storage group) internal {
        bytes32 proposal = group.proposal;
        cleanProposal(group);

        if (uint96(bytes12(proposal)) == 1) {
            addGuardian(group, address(uint160(uint(proposal))));
            cleanProposal(group);
            emit AddGuardian(group.smartWallet, address(uint160(uint(proposal))), proposal);

        } else if (uint96(bytes12(proposal)) == 2) {
            removeGuardian(group, address(uint160(uint(proposal))));
            cleanProposal(group);
            emit RemoveGuardian(group.smartWallet, address(uint160(uint(proposal))), proposal);

        } else if (uint96(bytes12(proposal)) == 3) {
            updateNeedGuardiansNum(group, uint8(uint(proposal)));
            cleanProposal(group);
            emit UpdateNeedGuardiansNum(group.smartWallet, uint8(uint(proposal)), proposal);

        } else {
            ISmartWallet(group.smartWallet).adoptProposal(proposal);
            emit AdoptProposal(group.smartWallet, msg.sender, proposal);
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

    function cleanProposal(Group storage group) internal {
        if (group.approvedGuardians.length > 0) {
            group.approvedGuardians = new address[](0);
        }
        if (group.rejectedGuardians.length > 0) {
            group.rejectedGuardians = new address[](0);
        }
        group.proposal = bytes32(0);
    }
}
