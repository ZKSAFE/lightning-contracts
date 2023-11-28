// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./SmartWallet.sol";
import "hardhat/console.sol";

contract WalletFactory {

    address[] public stableCoinArr;

    uint immutable public fee;

    mapping(address => bool) public wallets;

    event WalletCreated(address wallet, address owner, address bundler);

    constructor(address[] memory _stableCoinArr, uint _fee) {
        stableCoinArr = _stableCoinArr;
        fee = _fee;
    }

    function createWallet(bytes32 salt, address owner, address bundler) public returns (address) {
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
        
        wallets[address(wallet)] = true;
        emit WalletCreated(address(wallet), owner, bundler);

        return address(wallet);
    }

    function computeWalletAddr(bytes32 salt) public view returns (address) {
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
