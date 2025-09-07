// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyLINK is ERC20 {
    constructor() ERC20("Dummy LINK", "dLINK") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }
}
