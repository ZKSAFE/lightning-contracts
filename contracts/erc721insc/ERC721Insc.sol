// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./IERC721Inscription.sol";

contract ERC721Insc is ERC721Enumerable, IERC721Inscription {
    using Address for address;
    using Strings for uint;

    mapping (string => bytes) public inscInfo;

    constructor(
        string memory p,
        string memory op,
        string memory tick,
        uint64 max,
        uint64 lim
    ) ERC721(p, tick) {
        inscInfo["p"] = abi.encodePacked(p);
        inscInfo["op"] = abi.encodePacked(op);
        inscInfo["tick"] = abi.encodePacked(tick);
        inscInfo["max"] = abi.encodePacked(max);
        inscInfo["lim"] = abi.encodePacked(lim);
        
        inscInfo["mintHash"] = abi.encodePacked(keccak256(
            bytes(string.concat('{"p":"', p, '","op":"mint","tick":"', tick, '","amt":"', uint(lim).toString(), '"}'))
        ));
        inscInfo["transferHash"] = abi.encodePacked(keccak256(
            bytes(string.concat('{"p":"', p, '","op":"transfer","tick":"', tick, '","amt":"', uint(lim).toString(), '"}'))
        )); 

        emit Inscribe(msg.sender, address(this), string.concat('{"p":"', p, '","op":"', op, '","tick":"', tick, '","max":"', uint(max).toString(), '","lim":"', uint(lim).toString(), '"}'));
    }

    function inscribe(address to, bytes calldata data) public {
        if (keccak256(data) == bytes32(inscInfo["mintHash"])) {
            _mint(to, totalSupply() + 1);
            require(totalSupply() <= uint64(bytes8(inscInfo["max"])) / uint64(bytes8(inscInfo["lim"])), "ERC721Insc: exceeded max supply");

        } else if (keccak256(data) == bytes32(inscInfo["transferHash"])) {
            uint tokenId = tokenOfOwnerByIndex(msg.sender, 0);
            transferFrom(msg.sender, to, tokenId);

        } else {
            revert("ERC721Insc: unknow op");
        }

        emit Inscribe(msg.sender, to, string(data));
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721, IERC721Metadata) returns (string memory) {
        require(_exists(tokenId), "ERC721: token not exists");

        string memory svg = string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin meet" viewBox="0 0 350 350"><style>.base{fill:green;font-family:Monospace;font-size:18px;}</style><rect width="100%" height="100%" fill="black"/><text x="60" y="100" class="base">{</text><text x="90" y="130" class="base">"p":"',
            string(inscInfo["p"]), 
            '",</text><text x="90" y="160" class="base">"op":"mint",</text><text x="90" y="190" class="base">"tick":"',
            string(inscInfo["tick"]),
            '",</text><text x="90" y="220" class="base">"amt":"',
            uint(uint64(bytes8(inscInfo["lim"]))).toString(),
            '"</text><text x="60" y="250" class="base">}</text></svg>'
        );
        // return string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(svg)));

        string memory json = Base64.encode(
            bytes(
                string.concat(
                    '{"description":"ERC721Insc is an implement of inscription in EVM, also a protocol standard of assets, between ERC20 and ERC721.","image":"data:image/svg+xml;base64,',
                    Base64.encode(bytes(svg)),
                    '"}'
                )
            )
        );
        return string.concat("data:application/json;base64,", json);
    }

}
