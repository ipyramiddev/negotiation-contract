// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IERC721CollectionFactory {
    function createCollection(bytes32 _salt, bytes memory _data)
        external
        returns (address addr);

    function transferOwnership(address newOwner) external;

    function isCollectionFromFactory(address _collection)
        external
        view
        returns (bool);
}
