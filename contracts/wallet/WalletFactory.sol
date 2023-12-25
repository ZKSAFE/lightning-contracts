// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "./SmartWallet.sol"; //createWallet gas used: 2185288
import "./SmartWalletV2.sol"; //createWallet gas used: 1431023
// import "hardhat/console.sol";

contract WalletFactory {

    address immutable public owner; //owner is Bundler contract address

    mapping(address => bool) public wallets;

    event WalletCreated(address indexed wallet, address walletOwner, address bundler);

    modifier onlyOwner() {
        require(
            owner == msg.sender,
            "onlyOwner: caller is not the owner"
        );
        _;
    }

    constructor(address _owner) {
        owner = _owner;
    }

    /**
     * Create SmartWalletV2 with UUID, so that user's SmartWallet address can be the same on other EVM chains
     * @param salt user's UUID
     * @param walletOwner SmartWalletV2's owner, also user's EOA
     * @param bundler Bundler contract address
     */
    function createWallet(bytes32 salt, address walletOwner, address bundler) public onlyOwner returns (address) {
        SmartWalletV2 wallet = new SmartWalletV2{salt: salt}();

        wallet.init(walletOwner, bundler);
        
        wallets[address(wallet)] = true;
        emit WalletCreated(address(wallet), walletOwner, bundler);

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
                            keccak256(type(SmartWalletV2).creationCode)
                        )
                    )
                )
            )
        );

        return predictedAddr;
    }
}
