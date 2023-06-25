// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./SmartWallet.sol";

contract WalletFactory {

    mapping(address => bool) public wallets;

    event WalletCreated(address indexed wallet, address owner, address bundle);

    constructor() {
    }

    function createWallet(address _owner, address _bundler) public returns (address) {
        SmartWallet wallet = new SmartWallet(_owner, _bundler);
        wallets[address(wallet)] = true;
        emit WalletCreated(address(wallet), _owner, _bundler);
        return address(wallet);
    }
}
