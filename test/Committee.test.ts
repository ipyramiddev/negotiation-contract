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

  // describe("create committee", async function () {
  //   it("deploy with correct values", async function () {
  //     const contract = await CommitteeContract.deploy(ownerAddr, [userAddr]);
  //     const committeeOwner = await contract.owner();
  //     const isMember = await contract.members(userAddr);
  //     expect(committeeOwner).to.be.equal(ownerAddr);
  //     expect(isMember).to.be.equal(true);
  //   });
  // });

  // describe("setMember", async function () {
  //   it("should add a member to the committee", async function () {
  //     let isMember = await committeeContract.members(anotherUserAddr);
  //     expect(isMember).to.be.equal(false);

  //     let setMemberTx = await committeeContract
  //       .connect(owner)
  //       .setMembers([anotherUserAddr], [true]);

  //     let logs = (await setMemberTx.wait()).events;
  //     expect(logs.length).to.be.equal(1);
  //     expect(logs[0].event).to.be.equal("MemberSet");
  //     expect(logs[0].args._member).to.be.equal(anotherUserAddr);
  //     expect(logs[0].args._value).to.be.equal(true);

  //     isMember = await committeeContract.members(anotherUserAddr);
  //     expect(isMember).to.be.equal(true);

  //     setMemberTx = await committeeContract
  //       .connect(owner)
  //       .setMembers([anotherUserAddr], [false]);
  //     logs = (await setMemberTx.wait()).events;

  //     expect(logs.length).to.be.equal(1);
  //     expect(logs[0].event).to.be.equal("MemberSet");
  //     expect(logs[0].args._member).to.be.equal(anotherUserAddr);
  //     expect(logs[0].args._value).to.be.equal(false);

  //     isMember = await committeeContract.members(anotherUserAddr);
  //     expect(isMember).to.be.equal(false);
  //   });

  //   it("should set members to the committee", async function () {
  //     let isMember = await committeeContract.members(userAddr);
  //     expect(isMember).to.be.equal(true);

  //     isMember = await committeeContract.members(anotherUserAddr);
  //     expect(isMember).to.be.equal(false);

  //     let setMemberTx = await committeeContract
  //       .connect(owner)
  //       .setMembers([userAddr, anotherUserAddr], [false, true]);
  //     let logs = (await setMemberTx.wait()).events;

  //     expect(logs.length).to.be.equal(2);
  //     expect(logs[0].event).to.be.equal("MemberSet");
  //     expect(logs[0].args._member).to.be.equal(userAddr);
  //     expect(logs[0].args._value).to.be.equal(false);

  //     expect(logs[1].event).to.be.equal("MemberSet");
  //     expect(logs[1].args._member).to.be.equal(anotherUserAddr);
  //     expect(logs[1].args._value).to.be.equal(true);

  //     isMember = await committeeContract.members(userAddr);
  //     expect(isMember).to.be.equal(false);

  //     isMember = await committeeContract.members(anotherUserAddr);
  //     expect(isMember).to.be.equal(true);
  //   });

  //   it("reverts when trying to set members with different parameter's length", async function () {
  //     await expectRevert(
  //       committeeContract
  //         .connect(owner)
  //         .setMembers([userAddr, anotherUserAddr], [false]),
  //       "Committee#setMembers: LENGTH_MISMATCH"
  //     );

  //     await expectRevert(
  //       committeeContract.connect(owner).setMembers([userAddr], [false, true]),
  //       "Committee#setMembers: LENGTH_MISMATCH"
  //     );
  //   });

  //   it("reverts when trying to set members by hacker", async function () {
  //     await expectRevert(
  //       committeeContract
  //         .connect(hacker)
  //         .setMembers([userAddr, anotherUserAddr], [false, true]),
  //       "Ownable: caller is not the owner"
  //     );
  //   });
  // });
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

    it("should manage a collection :: Relayed EIP721", async function () {
      let isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);

      // Approve collection
      const setApproveABI = [
        {
          inputs: [
            {
              internalType: "bool",
              name: "_value",
              type: "bool",
            },
          ],
          name: "setApproved",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(setApproveABI);
      const functionSignatureSetApproved = iface.encodeFunctionData(
        "setApproved",
        [true]
      );
      const manageCollectionABI = [
        {
          inputs: [
            {
              internalType: "contract ICollectionManager",
              name: "_collectionManager",
              type: "address",
            },
            {
              internalType: "address",
              name: "_forwarder",
              type: "address",
            },
            {
              internalType: "address",
              name: "_collection",
              type: "address",
            },
            {
              internalType: "bytes[]",
              name: "_data",
              type: "bytes[]",
            },
          ],
          name: "manageCollection",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      iface = new ethers.utils.Interface(manageCollectionABI);
      let functionSignatureManageCollection = iface.encodeFunctionData(
        "manageCollection",
        [
          collectionManagerContract.address,
          forwarderContract.address,
          collectionContract.address,
          [functionSignatureSetApproved],
        ]
      );

      await sendMetaTx(
        committeeContract,
        functionSignatureManageCollection,
        userAddr,
        relayer,
        null,
        "Unicial Collection Committee",
        "1"
      );

      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(true);

      // Reject collection
      const ifaceSetApproved = new ethers.utils.Interface(setApproveABI);
      let functionSignature = iface.encodeFunctionData("manageCollection", [
        collectionManagerContract.address,
        forwarderContract.address,
        collectionContract.address,
        [ifaceSetApproved.encodeFunctionData("setApproved", [false])],
      ]);

      await sendMetaTx(
        committeeContract,
        functionSignature,
        userAddr,
        relayer,
        null,
        "Unicial Collection Committee",
        "1"
      );

      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);
    });
    it("should manage a collection :: multicall : Relayed EIP721", async function () {
      let isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);

      const itemLength = await collectionContract.itemsCount();

      expect(ITEMS.length).to.equal(itemLength);

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

      // Approve & Rescue items
      let approveAbi = [
        {
          inputs: [
            {
              internalType: "bool",
              name: "_value",
              type: "bool",
            },
          ],
          name: "setApproved",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let ifaceApprove = new ethers.utils.Interface(approveAbi);
      let rescueAbi = [
        {
          inputs: [
            {
              internalType: "uint256[]",
              name: "_itemIds",
              type: "uint256[]",
            },
            {
              internalType: "string[]",
              name: "_contentHashes",
              type: "string[]",
            },
            {
              internalType: "string[]",
              name: "_metadatas",
              type: "string[]",
            },
          ],
          name: "rescueItems",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let ifaceRescueAbi = new ethers.utils.Interface(rescueAbi);
      let abi = [
        {
          inputs: [
            {
              internalType: "contract ICollectionManager",
              name: "_collectionManager",
              type: "address",
            },
            {
              internalType: "address",
              name: "_forwarder",
              type: "address",
            },
            {
              internalType: "address",
              name: "_collection",
              type: "address",
            },
            {
              internalType: "bytes[]",
              name: "_data",
              type: "bytes[]",
            },
          ],
          name: "manageCollection",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(abi);
      let functionSignature = iface.encodeFunctionData("manageCollection", [
        collectionManagerContract.address,
        forwarderContract.address,
        collectionContract.address,
        [
          ifaceApprove.encodeFunctionData("setApproved", [true]),
          ifaceRescueAbi.encodeFunctionData("rescueItems", [
            ITEMS.map((_, index) => index),
            ITEMS.map((_, index) => `contenthash${index}`),
            ITEMS.map(() => ""),
          ]),
        ],
      ]);

      await sendMetaTx(
        committeeContract,
        functionSignature,
        userAddr,
        relayer,
        null,
        "Unicial Collection Committee",
        "1"
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

    it("reverts when trying to manage a collection by a committee removed member", async function () {
      let isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);

      let setApprovedAbi = [
        {
          inputs: [
            {
              internalType: "bool",
              name: "_value",
              type: "bool",
            },
          ],
          name: "setApproved",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(setApprovedAbi);
      await committeeContract
        .connect(user)
        .manageCollection(
          collectionManagerContract.address,
          forwarderContract.address,
          collectionContract.address,
          [iface.encodeFunctionData("setApproved", [true])]
        );

      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(true);

      await committeeContract.connect(owner).setMembers([userAddr], [false]);

      await expect(
        committeeContract
          .connect(user)
          .manageCollection(
            collectionManagerContract.address,
            forwarderContract.address,
            collectionContract.address,
            [iface.encodeFunctionData("setApproved", [false])]
          )
      ).to.be.revertedWith("Committee#manageCollection: UNAUTHORIZED_SENDER");

      await committeeContract.connect(owner).setMembers([userAddr], [true]);

      await committeeContract
        .connect(user)
        .manageCollection(
          collectionManagerContract.address,
          forwarderContract.address,
          collectionContract.address,
          [iface.encodeFunctionData("setApproved", [false])]
        );
    });

    it("reverts when trying to manage a collection by calling an authorized method", async function () {
      let abi = [
        {
          inputs: [
            {
              internalType: "bool",
              name: "_value",
              type: "bool",
            },
          ],
          name: "unauthorizedMethod",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(abi);

      await expect(
        committeeContract
          .connect(user)
          .manageCollection(
            collectionManagerContract.address,
            forwarderContract.address,
            collectionContract.address,
            [iface.encodeFunctionData("unauthorizedMethod", [true])]
          )
      ).to.be.revertedWith(
        "CollectionManager#manageCollection: COMMITTEE_METHOD_NOT_ALLOWED"
      );
    });

    it("reverts when trying to manage a collection by not a committee member", async function () {
      let isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);

      let setApprovedAbi = [
        {
          inputs: [
            {
              internalType: "bool",
              name: "_value",
              type: "bool",
            },
          ],
          name: "setApproved",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(setApprovedAbi);
      await expect(
        committeeContract
          .connect(hacker)
          .manageCollection(
            collectionManagerContract.address,
            forwarderContract.address,
            collectionContract.address,
            [iface.encodeFunctionData("setApproved", [true])]
          )
      ).to.be.revertedWith("Committee#manageCollection: UNAUTHORIZED_SENDER");

      // Approve collection
      await expect(
        committeeContract
          .connect(owner)
          .manageCollection(
            collectionManagerContract.address,
            forwarderContract.address,
            collectionContract.address,
            [iface.encodeFunctionData("setApproved", [true])]
          )
      ).to.be.revertedWith("Committee#manageCollection: UNAUTHORIZED_SENDER");
    });
  });
});
