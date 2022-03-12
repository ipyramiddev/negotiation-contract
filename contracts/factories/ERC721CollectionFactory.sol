// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract ERC721CollectionFactory is Ownable {
    using Clones for address;

    address[] public collections;
    address public implementation;
    mapping(address => bool) public isCollectionFromFactory;

    event CollectionCreated(address indexed _address, bytes32 _salt);

    /**
     * @notice Create the contract
     * @param _owner - contract owner
     * @param _implementation - contract implementation
     */
    constructor(address _owner, address _implementation) {
        implementation = _implementation;
        transferOwnership(_owner);
    }

    /**
     * @notice Create a collection
     * @param _salt - arbitrary 32 bytes hexa
     * @return addr - address of the contract created
     */
    function createCollection(bytes32 _salt)
        external
        onlyOwner
        returns (address addr)
    {
        // Deploy a new collection
        implementation.cloneDeterministic(_salt);
        emit CollectionCreated(implementation, _salt);

        // Transfer ownership to the owner after deployment
        Ownable(addr).transferOwnership(owner());

        // Set variables for handle data faster
        // This use storage and therefore make deployments expensive.
        collections.push(addr);
        isCollectionFromFactory[addr] = true;
    }

    /**
     * @notice Get collection address
     * @param _salt - arbitrary 32 bytes hexa
     */
    function getCollectionAddress(bytes32 _salt)
        external
        view
        returns (address)
    {
        require(implementation != address(0), "implementation must be set");
        return implementation.predictDeterministicAddress(_salt);
    }

    /**
     * @notice Get the amount of collections deployed
     * @return amount of collections deployed
     */
    function collectionsSize() external view returns (uint256) {
        return collections.length;
    }
}
