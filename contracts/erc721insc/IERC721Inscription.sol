// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.7.0) (token/ERC721/IERC721.sol)

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
interface IERC721Inscription is IERC721Metadata, IERC721Enumerable {

    event Inscribe(address indexed from, address indexed to, string data);

    /**
     * @dev Returns the information of inscription
     */
    function inscInfo(string memory key) external view returns (bytes memory value);

    /**
     * @dev mint or transfer
     */
    function inscribe(address to, bytes calldata data) external;

}
