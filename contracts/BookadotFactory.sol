// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.4 <0.9.0;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IBookadotConfig } from "./interfaces/IBookadotConfig.sol";
import { BookadotProperty } from "./BookadotProperty.sol";
import { BookadotEIP712 } from "./BookadotEIP712.sol";
import {IBookadotTicketFactory} from "./interfaces/IBookadotTicketFactory.sol";
import "./BookadotStructs.sol";

contract BookadotFactory is Ownable {
    address public configContract;
    IBookadotTicketFactory ticketFactory;
    mapping(address => bool) private propertyMapping;

    event PropertyCreated(uint256[] ids, address[] properties, address host);
    event Book(address property, string bookingId, uint256 bookedTimestamp);
    event CancelByGuest(
        address property,
        string bookingId,
        uint256 guestAmount,
        uint256 hostAmount,
        uint256 treasuryAmount,
        uint256 cancelTimestamp
    );
    event CancelByHost(address property, string bookingId, uint256 guestAmount, uint256 cancelTimestamp);
    event Payout(
        address property,
        string bookingId,
        uint256 hostAmount,
        uint256 treasuryAmount,
        uint256 payoutTimestamp,
        uint8 payoutType // 1: full payout, 2: partial payout
    );

    constructor(address _config, address _ticketFactory) {
        configContract = _config;
        ticketFactory = IBookadotTicketFactory(_ticketFactory);
    }

    modifier onlyMatchingProperty() {
        require(propertyMapping[msg.sender] == true, "Factory: Property not found");
        _;
    }

    modifier onlyOwnerOrbookadotOperator() {
        IBookadotConfig config = IBookadotConfig(configContract);
        require(
            (owner() == _msgSender()) || (config.bookadotOperator(_msgSender()) == true),
            "Factory: caller is not the owner or operator"
        );
        _;
    }

    function deployProperty(
        uint256[] calldata _ids,
        address _host,
        bytes memory _ticketData
    )
        external
        onlyOwnerOrbookadotOperator 
    {
        require(_ids.length > 0, "Factory: Invalid property ids");
        require(_host != address(0), "Factory: Host address is invalid");
        address[] memory properties = new address[](_ids.length);
        for (uint256 i = 0; i < _ids.length; i++) {
            address ticketAddr = ticketFactory.deployTicket(_ids[i], _ticketData);

            BookadotProperty property = new BookadotProperty(
                _ids[i],
                configContract,
                address(this),
                _host,
                ticketAddr
            );
            propertyMapping[address(property)] = true;
            properties[i] = address(property);
        }
        emit PropertyCreated(_ids, properties, _host);
    }

    function verifyBookingData(
        BookingParameters calldata _params,
        address _authorizedSigner,
        bytes calldata _signature
    ) external view onlyMatchingProperty returns (bool) {
        IBookadotConfig config = IBookadotConfig(configContract);
        require(config.bookadotOperator(_authorizedSigner) == true, "Factory: Invalid signer");
        return BookadotEIP712.verify(_params, msg.sender, _authorizedSigner, _signature);
    }

    function book(string calldata _bookingId) external onlyMatchingProperty {
        emit Book(msg.sender, _bookingId, block.timestamp);
    }

    function cancelByGuest(
        string memory _bookingId,
        uint256 _guestAmount,
        uint256 _hostAmount,
        uint256 _treasuryAmount,
        uint256 _cancelTimestamp
    ) external onlyMatchingProperty {
        emit CancelByGuest(msg.sender, _bookingId, _guestAmount, _hostAmount, _treasuryAmount, _cancelTimestamp);
    }

    function cancelByHost(
        string memory _bookingId,
        uint256 _guestAmount,
        uint256 _cancelTimestamp
    ) external onlyMatchingProperty {
        emit CancelByHost(msg.sender, _bookingId, _guestAmount, _cancelTimestamp);
    }

    function payout(
        string memory _bookingId,
        uint256 _hostAmount,
        uint256 _treasuryAmount,
        uint256 _payoutTimestamp,
        uint8 _payoutType
    ) external onlyMatchingProperty {
        emit Payout(msg.sender, _bookingId, _hostAmount, _treasuryAmount, _payoutTimestamp, _payoutType);
    }
}
