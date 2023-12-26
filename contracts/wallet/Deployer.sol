// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./PublicSocialRecovery.sol";
import "./BundlerManager.sol";
import "./WalletFactory.sol";
// import "./help/QuoterV3.sol";
import "./help/Multicall.sol";

contract Deployer {
    address public immutable publicSocialRecoveryAddr;
    address public immutable bundlerManagerAddr;
    address public immutable bundlerAddr;
    address public immutable walletFactoryAddr;
    address public immutable multicallAddr;

    constructor(
        address[] memory guardians,
        uint8 needGuardiansNum
    ) {
        publicSocialRecoveryAddr = address(new PublicSocialRecovery());

        BundlerManager bundlerManager = new BundlerManager();
        bundlerManagerAddr = address(bundlerManager);
        bundlerManager.initSocialRecovery(
            publicSocialRecoveryAddr,
            guardians,
            needGuardiansNum
        );
        bundlerManager.changeOwner(msg.sender);

        bundlerAddr = bundlerManager.bundler();

        walletFactoryAddr = address(new WalletFactory(bundlerAddr));

        multicallAddr = address(new Multicall());
    }
}
