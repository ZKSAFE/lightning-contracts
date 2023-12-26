// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

interface IPublicSocialRecovery {
    function setGroup(
        address[] calldata guardians,
        uint8 needGuardiansNum
    ) external;
}