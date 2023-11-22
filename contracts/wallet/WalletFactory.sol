// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SmartWallet.sol";
import "hardhat/console.sol";

contract WalletFactory {

    address[] public stableCoinArr;

    uint public fee;

    mapping(address => uint32) public nonceOf;

    mapping(address => bool) public wallets;

    event WalletCreated(address wallet, address owner, address bundler, uint32 nonce);

    constructor(address[] memory _stableCoinArr, uint _fee) {
        stableCoinArr = _stableCoinArr;
        fee = _fee;
    }

    function createWallet(address owner, address bundler) public returns (address) {
        uint32 nonce = nonceOf[owner];
        nonce++;
        bytes32 salt = keccak256(abi.encodePacked(owner, nonce));
        SmartWallet wallet = new SmartWallet{salt: salt}();

        bool isInit;
        for (uint i = 0; i < stableCoinArr.length; i++) {
            address stableCoinAddr = stableCoinArr[i];
            uint feeAmount = fee * 10 ** uint(IERC20Metadata(stableCoinAddr).decimals());
            if (IERC20(stableCoinAddr).balanceOf(address(wallet)) >= feeAmount) {
                wallet.init(owner, bundler, stableCoinAddr, 0, abi.encodeCall(IERC20.transfer, (bundler, feeAmount)));
                isInit = true;
                break;
            }
        }
        require(isInit, "createWallet: need $fee in SmartWallet");
        
        nonceOf[owner] = nonce;
        wallets[address(wallet)] = true;
        emit WalletCreated(address(wallet), owner, bundler, nonce);

        return address(wallet);
    }

    function computeWalletAddr(address owner, uint32 nonce) public view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(owner, nonce));
        address predictedAddr = address(
            uint160(
                uint(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            address(this),
                            salt,
                            keccak256(type(SmartWallet).creationCode)
                        )
                    )
                )
            )
        );

        return predictedAddr;
    }

}
