// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.8.4 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./libs/PhatRollupAnchor.sol";

contract BookadotLens is PhatRollupAnchor, Ownable {
    uint8 constant TYPE_RESPONSE = 0;
    uint8 constant TYPE_ERROR = 2;

    address bookadotFactory;
    uint256 nextRequest = 1;
    mapping(uint256 => address) internal _requesters;
    mapping(uint => string) requests;

    event RequestSent(address indexed user, uint256 id, string profileId);
    event ResponseReceived(address indexed user, uint256 id, string profileId);
    event ErrorReceived(address indexed user, uint256 id, string profileId);

    constructor(address phatAttestor) Ownable() {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function setAttestor(address phatAttestor) public {
        _grantRole(PhatRollupAnchor.ATTESTOR_ROLE, phatAttestor);
    }

    function request(string calldata profileId) public {
        // assemble the request
        uint id = nextRequest;
        _requesters[id] = msg.sender;
        requests[id] = profileId;
        _pushMessage(abi.encode(id, profileId));
        nextRequest += 1;
        emit RequestSent(msg.sender, id, profileId);
    }

    function _onMessageReceived(bytes calldata action) internal override {
        require(action.length >= 32 * 3, "cannot parse action");
        (uint256 resType, uint256 id, bytes memory data) = abi.decode(action, (uint256, uint256, bytes));
        emit ResponseReceived(_requesters[id], id, requests[id]);

        if (resType == TYPE_RESPONSE) {
            delete requests[id];
            delete _requesters[id];
            (bool success, ) = bookadotFactory.call(data);
            require(success == true, "Lens: bookadot factory call failed");
        } else if (resType == TYPE_ERROR) {
            emit ErrorReceived(_requesters[id], id, requests[id]);
            delete requests[id];
            delete _requesters[id];
        }
    }

    function setBookadotFactoryAddress(address _bookadot) external onlyOwner {
        require(_bookadot != address(0), "Lens: bookadot address is zero address");
        bookadotFactory = _bookadot;
    }
}
