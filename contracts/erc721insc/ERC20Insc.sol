// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IERC721Inscription.sol";

contract ERC20Insc is ERC20 {

    IERC721Inscription public insc;

    constructor(IERC721Inscription insc_) ERC20(insc_.name(), insc_.symbol()) {
        insc = insc_;
    }

    function mint(uint tokenId) public {
        insc.transferFrom(msg.sender, address(this), tokenId);
        _mint(msg.sender, uint(uint64(bytes8(insc.deployInfo("lim")))) * 10 ** decimals());
    }

    function burn(uint amount) public virtual {
        uint lim = uint(uint64(bytes8(insc.deployInfo("lim"))) * 10 ** uint(decimals()));
        require(amount % lim == 0 && amount >= lim, "ERC20Insc: amount must be divisible by lim");

        _burn(msg.sender, amount);

        uint num = amount / lim;
        for (uint i = 0; i < num; i++) {
            uint tokenId = insc.tokenOfOwnerByIndex(address(this), 0);
            insc.transferFrom(address(this), msg.sender, tokenId);
        }
    }

    function decimals() public pure override returns (uint8) {
        return 2;
    }
}