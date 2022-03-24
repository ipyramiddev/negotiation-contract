import chai, { expect } from "chai";
import { BigNumber, Contract, Signer } from "ethers";
import { artifacts, ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { getChainId } from "./helper/ChainId";

import {
  ZERO_ADDRESS,
  RESCUE_ITEMS_SELECTOR,
  SET_APPROVE_COLLECTION_SELECTOR,
  SET_EDITABLE_SELECTOR,
  getInitialRarities,
  getRarityNames,
  genRanHex,
  ITEMS,
} from "./helper/Collection";
import { hexlify, zeroPad } from "ethers/lib/utils";

describe("CollectionManager", function () {
  let CollectionImplementation, FactoryContract, RaritiesContract;

  let collectionImplementation: Contract,
    factoryContract: Contract,
    raritiesContract: Contract;

  let deployer: Signer, user: Signer, factoryOwner: Signer, hacker: Signer;

  let deployerAddr: string,
    userAddr: string,
    factoryOwnerAddr: string,
    hackerAddr: string;

  let chainId;

  beforeEach(async function () {
    [deployer, user, factoryOwner, hacker] = await ethers.getSigners();
    [deployerAddr, userAddr, factoryOwnerAddr, hackerAddr] = await Promise.all([
      deployer.getAddress(),
      user.getAddress(),
      factoryOwner.getAddress(),
      hacker.getAddress(),
    ]);

    chainId = getChainId();

    RaritiesContract = await ethers.getContractFactory("Rarities");
    raritiesContract = await RaritiesContract.deploy(
      deployerAddr,
      getInitialRarities()
    );
    CollectionImplementation = await ethers.getContractFactory(
      "ERC721Collection"
    );
    collectionImplementation = await CollectionImplementation.deploy();

    FactoryContract = await ethers.getContractFactory(
      "ERC721CollectionFactory"
    );
    factoryContract = await FactoryContract.deploy(
      factoryOwnerAddr,
      collectionImplementation.address
    );

    // console.log("==============CONTRACTS DEPLOYED================");
    // console.log("UCC Token", uccContract.address);
    // console.log("Committe", committeeContract.address);
    // console.log("Rarities", raritiesContract.address);
    // console.log("Collection Manager", collectionManagerContract.address);
    // console.log("Collection Implementation", collectionImplementation.address);
    // console.log("Forwarder", forwarderContract.address);
    // console.log("Factory", factoryContract.address);
    // console.log("================================================");
  });
});
