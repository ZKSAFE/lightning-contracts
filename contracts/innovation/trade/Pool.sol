// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "./AbstractShare.sol";

contract Pool is AbstractShare {
    using SafeERC20 for IERC20;

    IUniswapV3Pool public v3Pool;

    IERC20 public stableToken;


    constructor(address v3PoolAddr, address stableTokenAddr) AbstractShare(stableTokenAddr) {
        v3Pool = IUniswapV3Pool(v3PoolAddr);
        require(v3Pool.token0() == stableTokenAddr || v3Pool.token1() == stableTokenAddr, "stableTokenAddr error");
        
        stableToken = IERC20(stableTokenAddr);
    }

    function deposit(uint amount) public {
        stableToken.safeTransferFrom(msg.sender, address(this), amount);
        setUser(msg.sender, userInfo[msg.sender].share + amount);
    }

    function withdraw(uint amount) public {
        require(userInfo[msg.sender].share >= amount, "withdraw too much");
        require(stableToken.balanceOf(address(this)) >= amount, "waiting pool got enough token");

        stableToken.safeTransfer(msg.sender, amount);
        setUser(msg.sender, userInfo[msg.sender].share - amount);
    }

}
