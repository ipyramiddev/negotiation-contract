import chai, { expect } from "chai";
import { BigNumber, Contract, Signer, utils } from "ethers";
import { artifacts, ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { getChainId } from "./helper/ChainId";
import { AbiCoder, Interface } from "ethers/lib/utils";
import { sendMetaTx } from "./helper/MetaTx";
const { BN, expectEvent, expectRevert } = require("@openzeppelin/test-helpers");

import {
  ZERO_ADDRESS,
  RESCUE_ITEMS_SELECTOR,
  SET_APPROVE_COLLECTION_SELECTOR,
  SET_EDITABLE_SELECTOR,
  getInitialRarities,
  getRarityNames,
  genRanHex,
  ITEMS,
  RARITIES_OBJECT,
  getRarityDefaulPrices,
  DEFAULT_RARITY_PRICE,
} from "./helper/Collection";

describe("Commitee", function () {
  let UccContract,
    CollectionImplementation,
    FactoryContract,
    CommitteeContract,
    CollectionManagerContract,
    ForwarderContract,
    RaritiesContract;

  let uccContract: Contract,
    collectionImplementation: Contract,
    factoryContract: Contract,
    committeeContract: Contract,
    collectionManagerContract: Contract,
    forwarderContract: Contract,
    raritiesContract: Contract;

  let deployer: Signer,
    user: Signer,
    anotherUser: Signer,
    owner: Signer,
    collector: Signer,
    hacker: Signer,
    relayer: Signer;

  let deployerAddr: string,
    userAddr: string,
    anotherUserAddr: string,
    ownerAddr: string,
    collectorAddr: string,
    hackerAddr: string,
    relayerAddr: string;

  let chainId;

  beforeEach(async function () {
    [deployer, user, anotherUser, owner, collector, hacker, relayer] =
      await ethers.getSigners();
    [
      deployerAddr,
      userAddr,
      anotherUserAddr,
      ownerAddr,
      collectorAddr,
      hackerAddr,
      relayerAddr,
    ] = await Promise.all([
      deployer.getAddress(),
      user.getAddress(),
      anotherUser.getAddress(),
      owner.getAddress(),
      collector.getAddress(),
      hacker.getAddress(),
      relayer.getAddress(),
    ]);

    CommitteeContract = await ethers.getContractFactory("Committee");
    committeeContract = await CommitteeContract.deploy(ownerAddr, [userAddr]);

    chainId = getChainId();
    UccContract = await ethers.getContractFactory("UnicialCashToken");
    uccContract = await UccContract.deploy(chainId);

    RaritiesContract = await ethers.getContractFactory("Rarities");
    raritiesContract = await RaritiesContract.deploy(
      ownerAddr,
      getInitialRarities()
    );

    CollectionManagerContract = await ethers.getContractFactory(
      "CollectionManager"
    );
    collectionManagerContract = await CollectionManagerContract.deploy(
      ownerAddr,
      uccContract.address,
      committeeContract.address,
      collectorAddr,
      raritiesContract.address,
      [
        RESCUE_ITEMS_SELECTOR,
        SET_APPROVE_COLLECTION_SELECTOR,
        SET_EDITABLE_SELECTOR,
      ],
      [true, true, true]
    );

    ForwarderContract = await ethers.getContractFactory("Forwarder");
    forwarderContract = await ForwarderContract.deploy(
      ownerAddr,
      collectionManagerContract.address
    );

    CollectionImplementation = await ethers.getContractFactory(
      "ERC721Collection"
    );
    collectionImplementation = await CollectionImplementation.deploy();

    FactoryContract = await ethers.getContractFactory(
      "ERC721CollectionFactory"
    );
    factoryContract = await FactoryContract.deploy(
      forwarderContract.address,
      collectionImplementation.address
    );
  });

  describe("create committee", async function () {
    it("deploy with correct values", async function () {
      const contract = await CommitteeContract.deploy(ownerAddr, [userAddr]);
      const committeeOwner = await contract.owner();
      const isMember = await contract.members(userAddr);
      expect(committeeOwner).to.be.equal(ownerAddr);
      expect(isMember).to.be.equal(true);
    });
  });

  describe("setMember", async function () {
    it("should add a member to the committee", async function () {
      let isMember = await committeeContract.members(anotherUserAddr);
      expect(isMember).to.be.equal(false);

      let setMemberTx = await committeeContract
        .connect(owner)
        .setMembers([anotherUserAddr], [true]);

      let logs = (await setMemberTx.wait()).events;
      expect(logs.length).to.be.equal(1);
      expect(logs[0].event).to.be.equal("MemberSet");
      expect(logs[0].args._member).to.be.equal(anotherUserAddr);
      expect(logs[0].args._value).to.be.equal(true);

      isMember = await committeeContract.members(anotherUserAddr);
      expect(isMember).to.be.equal(true);

      setMemberTx = await committeeContract
        .connect(owner)
        .setMembers([anotherUserAddr], [false]);
      logs = (await setMemberTx.wait()).events;

      expect(logs.length).to.be.equal(1);
      expect(logs[0].event).to.be.equal("MemberSet");
      expect(logs[0].args._member).to.be.equal(anotherUserAddr);
      expect(logs[0].args._value).to.be.equal(false);

      isMember = await committeeContract.members(anotherUserAddr);
      expect(isMember).to.be.equal(false);
    });

    it("should set members to the committee", async function () {
      let isMember = await committeeContract.members(userAddr);
      expect(isMember).to.be.equal(true);

      isMember = await committeeContract.members(anotherUserAddr);
      expect(isMember).to.be.equal(false);

      let setMemberTx = await committeeContract
        .connect(owner)
        .setMembers([userAddr, anotherUserAddr], [false, true]);
      let logs = (await setMemberTx.wait()).events;

      expect(logs.length).to.be.equal(2);
      expect(logs[0].event).to.be.equal("MemberSet");
      expect(logs[0].args._member).to.be.equal(userAddr);
      expect(logs[0].args._value).to.be.equal(false);

      expect(logs[1].event).to.be.equal("MemberSet");
      expect(logs[1].args._member).to.be.equal(anotherUserAddr);
      expect(logs[1].args._value).to.be.equal(true);

      isMember = await committeeContract.members(userAddr);
      expect(isMember).to.be.equal(false);

      isMember = await committeeContract.members(anotherUserAddr);
      expect(isMember).to.be.equal(true);
    });

    it("reverts when trying to set members with different parameter's length", async function () {
      await expectRevert(
        committeeContract
          .connect(owner)
          .setMembers([userAddr, anotherUserAddr], [false]),
        "Committee#setMembers: LENGTH_MISMATCH"
      );

      await expectRevert(
        committeeContract.connect(owner).setMembers([userAddr], [false, true]),
        "Committee#setMembers: LENGTH_MISMATCH"
      );
    });

    it("reverts when trying to set members by hacker", async function () {
      await expectRevert(
        committeeContract
          .connect(hacker)
          .setMembers([userAddr, anotherUserAddr], [false, true]),
        "Ownable: caller is not the owner"
      );
    });
  });
  describe("manageCollection", async function () {
    const name = "collectionName";
    const symbol = "collectionSymbol";
    const baseURI = "collectionBaseURI";

    let collectionContract;

    beforeEach(async () => {
      const rarities = getInitialRarities();
      await raritiesContract
        .connect(owner)
        .updatePrices(getRarityNames(), Array(rarities.length).fill(0));
      const salt = "0x" + genRanHex(64);
      let createCollectionTx = await collectionManagerContract
        .connect(user)
        .createCollection(
          forwarderContract.address,
          factoryContract.address,
          salt,
          name,
          symbol,
          baseURI,
          userAddr,
          ITEMS
        );
      let logs = (await createCollectionTx.wait()).events;
      const collectionContractAddress = logs[1].address;
      collectionContract = await ethers.getContractAt(
        "ERC721Collection",
        collectionContractAddress
      );
    });

    it("should manage a collection", async function () {
      let isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);
      let ABI = ["function setApproved(bool _value)"];
      let iface = new utils.Interface(ABI);
      const functionSignature = iface.encodeFunctionData("setApproved", [true]);
      // Approve collection
      await committeeContract
        .connect(user)
        .manageCollection(
          collectionManagerContract.address,
          forwarderContract.address,
          collectionContract.address,
          [functionSignature]
        );

      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(true);

      // Approve collection
      await committeeContract
        .connect(user)
        .manageCollection(
          collectionManagerContract.address,
          forwarderContract.address,
          collectionContract.address,
          [iface.encodeFunctionData("setApproved", [false])]
        );

      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);
    });

    it("should manage a collection :: multicall", async function () {
      let isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);

      const itemLength = await collectionContract.itemsCount();

      expect(ITEMS.length).to.be.eq(BigNumber.from(itemLength));

      for (let i = 0; i < itemLength; i++) {
        let item = await collectionContract.items(i);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary.toLowerCase(),
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          ITEMS[i][0],
          RARITIES_OBJECT[ITEMS[i][0].toString()].value.toString(),
          "0",
          ITEMS[i][1].toString(),
          ITEMS[i][2].toString().toLowerCase(),
          ITEMS[i][3],
          "",
        ]);
      }

      // Approve & rescue items
      let setApproveABI = ["function setApproved(bool _value)"];
      let setApproveIface = new utils.Interface(setApproveABI);

      let rescueItemsABI = [
        "function rescueItems( uint256[] calldata _itemIds, string[] calldata _contentHashes, string[] calldata _metadatas)",
      ];
      let rescueItemsIface = new utils.Interface(rescueItemsABI);

      await committeeContract
        .connect(user)
        .manageCollection(
          collectionManagerContract.address,
          forwarderContract.address,
          collectionContract.address,
          [
            setApproveIface.encodeFunctionData("setApproved", [true]),
            rescueItemsIface.encodeFunctionData("rescueItems", [
              ITEMS.map((_, index) => index),
              ITEMS.map((_, index) => `contenthash${index}`),
              ITEMS.map(() => ""),
            ]),
          ]
        );

      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(true);

      for (let i = 0; i < itemLength; i++) {
        let item = await collectionContract.items(i);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary.toLowerCase(),
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          ITEMS[i][0],
          RARITIES_OBJECT[ITEMS[i][0].toString()].value.toString(),
          "0",
          ITEMS[i][1].toString(),
          ITEMS[i][2].toString().toLowerCase(),
          ITEMS[i][3],
          `contenthash${i}`,
        ]);
      }
    });
  });
});
