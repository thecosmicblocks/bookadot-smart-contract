// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.4 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract BookadotTicket is ERC721Enumerable {
    uint32 private nftId = 0;
    string private baseUri;
    address private owner;

    mapping(address => bool) private minters;
    mapping(address => bool) private transferables;

    event ChangedBaseURI(string oldBaseUri, string newBaseUri);

    constructor(
        string memory _nftName,
        string memory _nftSymbol,
        string memory _baseUri,
        address _minter,
        address _owner,
        address _transferable
    ) ERC721(_nftName, _nftSymbol) {
        baseUri = _baseUri;
        minters[_minter] = true;
        owner = _owner;
        transferables[_transferable] = true;
    }

    function setBaseUri(string memory _baseUri) external onlyOwner {
        require(bytes(_baseUri).length > 0, "Base URI is required");
        string memory oldBaseUri = baseUri;
        baseUri = _baseUri;
        emit ChangedBaseURI(oldBaseUri, _baseUri);
    }

    function updateMinter(address _minter, bool _persmission) external onlyOwner {
        require(_minter != address(0), "Minter must not be zero address");
        require(minters[_minter] != _persmission, "Minter already added");
        minters[_minter] = _persmission;
    }

    function setTransferable(address _transferable, bool _persmission) external onlyOwner {
        require(transferables[_transferable] != _persmission, "Value unchanged");
        transferables[_transferable] = _persmission;
    }

    function mint(address _receiver) public onlyMinter {
        unchecked {
            nftId++;
        }
        _safeMint(_receiver, nftId);
    }

    function mintBatch(address _receiver, uint256 _amount) external onlyMinter {
        require(_receiver != address(0), "Receiver can not be zero address");
        uint256[] memory ids = new uint256[](_amount);
        for (uint256 i = 0; i < ids.length; i++) {
            mint(_receiver);
        }
    }

    function burn(uint256 _id) external onlyMinter {
        require(_isApprovedOrOwner(_msgSender(), _id), "ERC721: caller is not approved or owner");
        _burn(_id);
    }

    function burnBatch(uint256[] calldata _ids) external onlyMinter {
        for (uint256 i = 0; i < _ids.length; i++) {
            require(_isApprovedOrOwner(_msgSender(), _ids[i]), "ERC721: caller is not approved or owner");
            _burn(_ids[i]);
        }
    }

    function getTokenOf(address _address) external view returns (uint256[] memory _tokens) {
        require(_address != address(0), "Address can not be zero address");
        uint256 arrayLength = balanceOf(_address);
        _tokens = new uint256[](arrayLength);

        for (uint256 index = 0; index < arrayLength; index++) {
            uint256 _nftId = tokenOfOwnerByIndex(_address, index);
            if (_nftId == 0) {
                continue;
            }
            _tokens[index] = _nftId;
        }
    }

    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(baseUri, Strings.toString(_tokenId)));
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721) {
        require(transferables[from] || transferables[to], "disabled");
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not approved or owner");
        _transfer(from, to, tokenId);
    }

    /**
     * @dev See {IERC721-safeTransferFrom}.
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) public override(ERC721) {
        require(transferables[from] || transferables[to], "disabled");
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: caller is not approved or owner");
        _safeTransfer(from, to, tokenId, _data);
    }

    modifier onlyMinter() {
        require(minters[_msgSender()], "Caller is not minter");
        _;
    }

    modifier onlyOwner() {
        require(_msgSender() == owner, "Caller is not owner");
        _;
    }
}
