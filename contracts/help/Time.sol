// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

contract Time {

    uint _block;

    constructor() {
    }

    function nextBlock() public {
        _block = block.number;
    }

    function currBlockNum() public view returns(uint) {
        return block.number;
    }

}