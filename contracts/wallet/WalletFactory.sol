// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "./SmartWallet.sol"; //createWallet gas used: 2185288
import "./SmartWalletV2.sol"; //createWallet gas used: 1431023
import "hardhat/console.sol";

contract WalletFactory {

    address[] public stableCoinArr;
    uint immutable public fee;
    address immutable public owner; //owner is Bundler contract address

    mapping(address => bool) public wallets;

    event WalletCreated(address wallet, address walletOwner, address bundler);

    modifier onlyOwner() {
        require(
            owner == msg.sender,
            "onlyOwner: caller is not the owner"
        );
        _;
    }

    constructor(address[] memory _stableCoinArr, uint _fee, address _owner) {
        stableCoinArr = _stableCoinArr;
        fee = _fee;
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

        bool isInit;
        if (stableCoinArr.length == 0) {
            wallet.init(walletOwner, bundler, address(0), 0, bytes(""));
            isInit = true;

        } else {
            for (uint i = 0; i < stableCoinArr.length; i++) {
                address stableCoinAddr = stableCoinArr[i];
                uint feeAmount = fee * 10 ** uint(IERC20Metadata(stableCoinAddr).decimals());
                if (IERC20(stableCoinAddr).balanceOf(address(wallet)) >= feeAmount) {
                    wallet.init(walletOwner, bundler, stableCoinAddr, 0, abi.encodeCall(IERC20.transfer, (bundler, feeAmount)));
                    isInit = true;
                    break;
                }
            }
        }
        require(isInit, "createWallet: need $fee in SmartWallet");
        
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
