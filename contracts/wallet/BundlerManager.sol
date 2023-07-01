// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./SocialRecovery.sol";
import "./Bundler.sol";

contract BundlerManager is SocialRecovery {

    address public bundler;

    event Error(uint8 i);

    constructor() SocialRecovery(msg.sender) {
        bundler = address(new Bundler());
    }

    function bundle(bytes[] calldata dataArr) public onlyOwner {
        for (uint8 i = 0; i < dataArr.length; i++) {
            (bool success, ) = bundler.call{value: 0}(dataArr[i]);
            if (!success) {
                emit Error(i);
            }
        }
    }
}
