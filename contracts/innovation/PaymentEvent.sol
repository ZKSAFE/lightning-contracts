// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract PaymentEvent {

    event Payment(address from, address to, address tokenAddr, uint amount, uint fee, uint memo);

    function emitPayment(address from, address to, address tokenAddr, uint amount, uint fee, uint memo) external {
        emit Payment(from, to, tokenAddr, amount, fee, memo);
    }
}