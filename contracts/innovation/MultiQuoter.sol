// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol";
import "@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolState.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract MultiQuoter {

    address immutable quoterAddr;
    address immutable poolFactoryAddr;

    struct PoolSlot0 {
        uint160 sqrtPriceX96;
        int24 tick;
        uint16 observationIndex;
        uint16 observationCardinality;
        uint16 observationCardinalityNext;
        uint8 feeProtocol;
        bool unlocked;
    }

    struct PoolState {
        address poolAddr;
        uint128 liquidity;
        PoolSlot0 slot0;
    }

    struct PoolImmutable {
        address tokenA;
        address tokenB;
        uint24 fee;
    }

    constructor(address _quoterAddr, address _poolFactoryAddr) {
        quoterAddr = _quoterAddr;
        poolFactoryAddr = _poolFactoryAddr;
    }

    function aggregate(bytes[] memory callDatas, uint eachGaslimit) public returns (uint[] memory returnDatas) {
        returnDatas = new uint[](callDatas.length);
        for (uint i = 0; i < callDatas.length; i++) {
            uint before = gasleft();
            (bool success, bytes memory ret) = quoterAddr.call{gas: eachGaslimit}(callDatas[i]);
            if (success) {
                console.log("[aggregate] success", uint(bytes32(ret)), "gas used", before - gasleft());
                returnDatas[i] = uint(bytes32(ret));
            } else {
                console.log("[aggregate] fail", 0, "gas used", before - gasleft());
                returnDatas[i] = 0;
            }
        }
    }

    function getPoolStates(PoolImmutable[] memory poolImmutables) public view returns (PoolState[] memory poolStates) {
        poolStates = new PoolState[](poolImmutables.length);
        for (uint i = 0; i < poolImmutables.length; i++) {
            PoolImmutable memory poolImmutable = poolImmutables[i];
            address poolAddr = IUniswapV3Factory(poolFactoryAddr).getPool(poolImmutable.tokenA, poolImmutable.tokenB, poolImmutable.fee);
            console.log("poolAddr", poolAddr);

            if (poolAddr == address(0)) {
                poolStates[i] = PoolState(address(0), 0, PoolSlot0(0, 0, 0, 0, 0, 0, false));

            } else {
                IUniswapV3PoolState pool = IUniswapV3PoolState(poolAddr);
                uint128 liquidity = pool.liquidity();
                if (liquidity == 0) {
                    poolStates[i] = PoolState(address(0), 0, PoolSlot0(0, 0, 0, 0, 0, 0, false));
                } else {
                    (
                        uint160 sqrtPriceX96,
                        int24 tick,
                        uint16 observationIndex,
                        uint16 observationCardinality,
                        uint16 observationCardinalityNext,
                        uint8 feeProtocol,
                        bool unlocked
                    ) = pool.slot0();

                    poolStates[i] = PoolState(
                        poolAddr,
                        liquidity,
                        PoolSlot0(
                            sqrtPriceX96,
                            tick,
                            observationIndex,
                            observationCardinality,
                            observationCardinalityNext,
                            feeProtocol,
                            unlocked
                        )
                    );
                }
            }
        }
    }
}