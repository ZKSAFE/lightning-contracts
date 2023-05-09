// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract AssetsCheck {

    mapping (address => uint) public snappedETH;

    mapping (address => mapping (address => uint)) public snappedToken;

    mapping (address => mapping (uint => mapping (address => uint))) public snappedNFT1155Balance;

    modifier checkSnapETH(address wallet) {
        require(snappedETH[wallet] > 0, "haven't snapped");
        _;
        snappedETH[wallet] = 0;
    }

    modifier checkSnapToken(address wallet, address tokenAddr) {
        require(snappedToken[tokenAddr][wallet] > 0, "haven't snapped");
        _;
        snappedToken[tokenAddr][wallet] = 0;
    }

    constructor() {}

    //ETH
    function checkETHEqualTo(address wallet, uint value) public view {
        require(wallet.balance == value, "checkETHEqualTo fail");
    }

    function checkETHGreaterEqualTo(address wallet, uint value) public view {
        require(wallet.balance >= value, "checkETHGreaterEqualTo fail");
    }

    function checkETHLessEqualTo(address wallet, uint value) public view {
        require(wallet.balance <= value, "checkETHLessEqualTo fail");
    }

    function snapETH(address wallet) public {
        snappedETH[wallet] = wallet.balance;
    }

    function checkETHIncreaseEqualTo(address wallet, uint value) public checkSnapETH(wallet) {
        require(wallet.balance == snappedETH[wallet] + value, "checkETHIncreaseEqualTo fail");
    }

    function checkETHIncreaseGreaterEqualTo(address wallet, uint value) public checkSnapETH(wallet) {
        require(wallet.balance >= snappedETH[wallet] + value, "checkETHIncreaseGreaterEqualTo fail");
    }

    function checkETHIncreaseLessEqualTo(address wallet, uint value) public checkSnapETH(wallet) {
        require(wallet.balance <= snappedETH[wallet] + value, "checkETHIncreaseLessEqualTo fail");
    }

    function checkETHDecreaseEqualTo(address wallet, uint value) public checkSnapETH(wallet) {
        require(wallet.balance == snappedETH[wallet] - value, "checkETHDecreaseEqualTo fail");
    }

    function checkETHDecreaseLessEqualTo(address wallet, uint value) public checkSnapETH(wallet) {
        require(wallet.balance + value >= snappedETH[wallet], "checkETHDecreaseLessEqualTo fail");
    }

    function checkETHDecreaseGreaterEqualTo(address wallet, uint value) public checkSnapETH(wallet) {
        require(wallet.balance + value <= snappedETH[wallet], "checkETHDecreaseGreaterEqualTo fail");
    }

    //ERC20
    function checkTokenEqualTo(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) == value, "checkTokenEqualTo fail");
    }

    function checkTokenGreaterEqualTo(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) >= value, "checkTokenGreaterEqualTo fail");
    }

    function checkTokenLessEqualTo(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) <= value, "checkTokenLessEqualTo fail");
    }

    function snapToken(address wallet, address tokenAddr) public {
        snappedToken[tokenAddr][wallet] = IERC20(tokenAddr).balanceOf(wallet);
    }

    function checkTokenIncreaseEqualTo(address wallet, address tokenAddr, uint value) public checkSnapToken(wallet, tokenAddr) {
        require(IERC20(tokenAddr).balanceOf(wallet) == snappedToken[tokenAddr][wallet] + value, "checkTokenIncreaseEqualTo fail");
    }

    function checkTokenIncreaseGreaterEqualTo(address wallet, address tokenAddr, uint value) public checkSnapToken(wallet, tokenAddr) {
        require(IERC20(tokenAddr).balanceOf(wallet) >= snappedToken[tokenAddr][wallet] + value, "checkTokenIncreaseGreaterEqualTo fail");
    }

    function checkTokenIncreaseLessEqualTo(address wallet, address tokenAddr, uint value) public checkSnapToken(wallet, tokenAddr) {
        require(IERC20(tokenAddr).balanceOf(wallet) <= snappedToken[tokenAddr][wallet] + value, "checkTokenIncreaseLessEqualTo fail");
    }

    function checkTokenDecreaseEqualTo(address wallet, address tokenAddr, uint value) public checkSnapToken(wallet, tokenAddr) {
        require(IERC20(tokenAddr).balanceOf(wallet) + value == snappedToken[tokenAddr][wallet], "checkTokenDecreaseEqualTo fail");
    }

    function checkTokenDecreaseGreaterEqualTo(address wallet, address tokenAddr, uint value) public checkSnapToken(wallet, tokenAddr) {
        require(IERC20(tokenAddr).balanceOf(wallet) + value <= snappedToken[tokenAddr][wallet], "checkTokenDecreaseGreaterEqualTo fail");
    }

    function checkTokenDecreaseLessEqualTo(address wallet, address tokenAddr, uint value) public checkSnapToken(wallet, tokenAddr) {
        require(IERC20(tokenAddr).balanceOf(wallet) + value >= snappedToken[tokenAddr][wallet], "checkTokenDecreaseLessEqualTo fail");
    }

    //ERC721
    function checkOwnNFT(address wallet, address nftAddr, uint tokenId) public view {
        require(IERC721(nftAddr).ownerOf(tokenId) == wallet, "checkOwnNFT fail");
    }

    function checkNotOwnNFT(address wallet, address nftAddr, uint tokenId) public view {
        require(IERC721(nftAddr).ownerOf(tokenId) != wallet, "checkNotOwnNFT fail");
    }
    

}
