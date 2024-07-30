// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.4 <0.9.0;

interface IBookadotTicket {
    function mint(address _receiver) external;
    function mintBatch(address _receiver, uint256 _amount) external;
}
