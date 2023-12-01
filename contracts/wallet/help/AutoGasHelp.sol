// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract AutoGasHelp {

    constructor() {
    }

    function transferETH(address payable to, uint amount) external {
        if (address(this).balance >= amount) {
            to.transfer(amount);
        } else {
            to.transfer(address(this).balance);
        }
    }
}