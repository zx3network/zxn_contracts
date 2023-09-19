// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DBXenERC20Mock is ERC20("DBXen Token", "DXN") {

    constructor() {
        _mint(msg.sender, 5000000 * 10 ** decimals()); // 5000,000 DXN
    }

}