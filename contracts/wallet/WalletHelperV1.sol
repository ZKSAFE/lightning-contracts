// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "hardhat/console.sol";

contract WalletHelperV1 {

    ISwapRouter public immutable swapRouter;

    uint24 public constant poolFee = 100; // 0.01%

    constructor(ISwapRouter _swapRouter) {
        swapRouter = _swapRouter;
    }

    /**
     * decimals6Total: 1 = 0.000001
     */
    function transferStableCoins(
        address[] calldata tokenAddrs,
        uint decimals6Total,
        address to
    ) external {
        uint decimals6Out;
        for (uint i = 0; i < tokenAddrs.length; i++) {
            IERC20Metadata token = IERC20Metadata(tokenAddrs[i]);
            uint decimals = token.decimals();
            require(
                decimals >= 6 && decimals <= 18,
                "transferStableCoins: token decimals must be in range [6, 18]"
            );

            uint decimals6Balance = token.balanceOf(address(this)) / 10 ** (decimals - 6);
            if (decimals6Balance == 0) {
                continue;
            }

            uint decimals6Left = decimals6Total - decimals6Out;
            if (decimals6Balance < decimals6Left) {
                token.transfer(to, decimals6Balance * 10 ** (decimals - 6));
                decimals6Out += decimals6Balance;
            } else {
                token.transfer(to, decimals6Left * 10 ** (decimals - 6));
                decimals6Out += decimals6Left;
                break;
            }
        }

        require(decimals6Out == decimals6Total, "transferStableCoins: not enough balance");
    }


    /**
     * decimals6Total: 1 = 0.000001
     */
    function swapStableCoins(
        address[] calldata tokenAddrs,
        uint decimals6Total,
        address outTokenAddr
    ) external returns (uint amountOut) {
        uint decimals6In;
        for (uint i = 0; i < tokenAddrs.length; i++) {
            IERC20Metadata token = IERC20Metadata(tokenAddrs[i]);
            uint decimals = token.decimals();
            require(
                decimals >= 6 && decimals <= 18,
                "swapStableCoins: token decimals must be in range [6, 18]"
            );

            uint decimals6Balance = token.balanceOf(address(this)) / 10 ** (decimals - 6);
            if (decimals6Balance == 0) {
                continue;
            }

            uint decimals6Left = decimals6Total - decimals6In;
            if (address(token) == outTokenAddr) {

                if (decimals6Balance < decimals6Left) {
                    decimals6In += decimals6Balance;
                    amountOut += decimals6Balance;
                } else {
                    decimals6In += decimals6Left;
                    amountOut += decimals6Left;
                    break;
                }

            } else {

                 if (decimals6Balance < decimals6Left) {
                    decimals6In += decimals6Balance;
                    amountOut += swapExactInputSingle(address(token), decimals6Balance * 10 ** (decimals - 6), outTokenAddr);
                } else {
                    decimals6In += decimals6Left;
                    amountOut += swapExactInputSingle(address(token), decimals6Left * 10 ** (decimals - 6), outTokenAddr);
                    break;
                }

            }
        }

        require(decimals6In == decimals6Total, "swapStableCoins: not enough balance");
    }


    function swapExactInputSingle(address inTokenAddr, uint amountIn, address outTokenAddr) internal returns (uint256 amountOut) {
        // msg.sender must approve this contract

        // Approve the router to spend DAI.
        TransferHelper.safeApprove(inTokenAddr, address(swapRouter), amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: inTokenAddr,
                tokenOut: outTokenAddr,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }

}