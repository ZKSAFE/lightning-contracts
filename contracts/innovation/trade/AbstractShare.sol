// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

//用于分红的合约，把ERC20代币打给本合约，各个股东通过harvest获取分红
abstract contract AbstractShare {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 rewardDebt;
        uint256 share; //股份
    }

    mapping (address => UserInfo) public userInfo;

    uint256 public totalShare; //总股份 = 所有股东的share股份相加

    uint256 internal totalReleased;

    uint256 internal lastTotal;

    IERC20 public rewardToken;

    uint256 internal accPerShare;

    event SetUser(address indexed wallet, uint256 share);
    event Harvest(address indexed wallet, uint256 amount, address indexed to);


    constructor(address _rewardAddress) {
        rewardToken = IERC20(_rewardAddress);
    }

    //股东管理
    function setUser(address _wallet, uint256 _share) internal {
        UserInfo storage user = userInfo[_wallet];

        if (_share == 0) { //移除
            _harvest(_wallet, _wallet);
            totalShare = totalShare - user.share;
            delete userInfo[_wallet];
            emit SetUser(_wallet, _share);
            return;
        }

        if (user.share == 0) { //新增
            update();
            totalShare = totalShare + _share;
            uint256 myRewardDebt = _share * accPerShare / 1e12;
            userInfo[_wallet] = UserInfo(myRewardDebt, _share);
            emit SetUser(_wallet, _share);
            return;
        }

        _harvest(_wallet, _wallet);
        totalShare = totalShare + _share - user.share;
        user.share = _share;
        user.rewardDebt = _share * accPerShare / 1e12;
        emit SetUser(_wallet, _share);
    }


    function update() internal {
        if (totalShare == 0) {
            return;
        }
        uint256 balance = rewardToken.balanceOf(address(this));
        uint256 reward = totalReleased + balance - lastTotal;
        accPerShare = accPerShare + reward * 1e12 / totalShare;
        lastTotal = totalReleased + balance;
    }


    function harvest(address _to) public {
        _harvest(msg.sender, _to);
    }


    function _harvest(address _wallet, address _to) internal {
        UserInfo storage user = userInfo[_wallet];
        if (user.share == 0) {
            return;
        }

        update();

        uint256 pending = pendingReward(_wallet);

        if (pending > 0) {
            // user.rewardDebt = user.rewardDebt.add(pending);
            user.rewardDebt = user.share * accPerShare / 1e12;
            totalReleased = totalReleased + pending;
            rewardToken.safeTransfer(_to, pending);
            emit Harvest(_wallet, pending, _to);
        }
    }


    function pendingReward(address _wallet) public view returns (uint256) {
        UserInfo memory user = userInfo[_wallet];

        uint256 balance = rewardToken.balanceOf(address(this));
        uint256 reward = totalReleased + balance - lastTotal;
        uint256 acc = accPerShare + reward * 1e12 / totalShare;
        return user.share * acc / 1e12 - user.rewardDebt;
    }
}
