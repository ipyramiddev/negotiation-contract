import chai, { expect } from "chai";
import { BigNumber, Contract, Signer } from "ethers";
import { artifacts, ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { getChainId } from "./helper/ChainId";
import { Interface } from "ethers/lib/utils";
import { sendMetaTx } from "./helper/MetaTx";

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
  MAX_UINT256,
} from "./helper/Collection";
import { hexlify, zeroPad } from "ethers/lib/utils";
import { balanceSnap } from "./helper/BalanceSnap";
import { ERC721Collection } from "../typechain";

describe("CollectionManager", function () {
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

    chainId = getChainId();
    UccContract = await ethers.getContractFactory("UnicialCashToken");
    uccContract = await UccContract.deploy(chainId);

    CommitteeContract = await ethers.getContractFactory("Committee");
    committeeContract = await CommitteeContract.deploy(ownerAddr, [userAddr]);

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
    CollectionImplementation = await ethers.getContractFactory(
      "ERC721Collection"
    );
    collectionImplementation = await CollectionImplementation.deploy();

    ForwarderContract = await ethers.getContractFactory("Forwarder");
    forwarderContract = await ForwarderContract.deploy(
      ownerAddr,
      collectionManagerContract.address
    );

    FactoryContract = await ethers.getContractFactory(
      "ERC721CollectionFactory"
    );
    factoryContract = await FactoryContract.deploy(
      forwarderContract.address,
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
  describe("create collection manager", function () {
    it("deploy with correct values", async function () {
      const contract = await CollectionManagerContract.deploy(
        ownerAddr,
        uccContract.address,
        committeeContract.address,
        collectorAddr,
        raritiesContract.address,
        [SET_APPROVE_COLLECTION_SELECTOR],
        [true]
      );

      const collectionManagerOwner = await contract.owner();
      const ucc = await contract.acceptedToken();
      const committee = await contract.committee();
      const isAllowed = await contract.allowedCommitteeMethods(
        SET_APPROVE_COLLECTION_SELECTOR
      );
      const feesCollector = await contract.feesCollector();
      const rarities = await contract.rarities();

      expect(collectionManagerOwner).to.equal(ownerAddr);
      expect(ucc).to.equal(uccContract.address);
      expect(committee).to.equal(committeeContract.address);
      expect(isAllowed).to.equal(true);
      expect(feesCollector).to.equal(collectorAddr);
      expect(rarities).to.equal(raritiesContract.address);
    });
  });
  describe("setAcceptedToken", async function () {
    it("should set acceptedToken", async function () {
      let acceptedToken = await collectionManagerContract.acceptedToken();
      expect(acceptedToken).to.equal(uccContract.address);

      await expect(
        collectionManagerContract.connect(owner).setAcceptedToken(userAddr)
      )
        .to.emit(collectionManagerContract, "AcceptedTokenSet")
        .withArgs(uccContract.address, userAddr);

      expect(await collectionManagerContract.acceptedToken()).to.eq(userAddr);

      await expect(
        collectionManagerContract
          .connect(owner)
          .setAcceptedToken(uccContract.address)
      )
        .to.emit(collectionManagerContract, "AcceptedTokenSet")
        .withArgs(userAddr, uccContract.address);

      expect(await collectionManagerContract.acceptedToken()).to.eq(
        uccContract.address
      );
    });

    it("reverts when trying to set the ZERO_ADDRESS as the acceptedToken", async function () {
      await expect(
        collectionManagerContract.connect(owner).setAcceptedToken(ZERO_ADDRESS)
      ).to.be.reverted;
    });

    it("reverts when trying to set a acceptedToken by hacker", async function () {
      await expect(
        collectionManagerContract.connect(hacker).setAcceptedToken(userAddr)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("setCommittee", async function () {
    it("should set committee", async function () {
      let committee = await collectionManagerContract.committee();
      expect(committee).to.equal(committeeContract.address);
      await expect(
        collectionManagerContract.connect(owner).setCommittee(userAddr)
      )
        .to.emit(collectionManagerContract, "CommitteeSet")
        .withArgs(committeeContract.address, userAddr);
      committee = await collectionManagerContract.committee();
      expect(committee).to.equal(userAddr);
      await expect(
        collectionManagerContract
          .connect(owner)
          .setCommittee(committeeContract.address)
      )
        .to.emit(collectionManagerContract, "CommitteeSet")
        .withArgs(userAddr, committeeContract.address);
      committee = await collectionManagerContract.committee();
      expect(committee).to.equal(committeeContract.address);
    });

    it("reverts when trying to set the ZERO_ADDRESS as the committee", async function () {
      await expect(
        collectionManagerContract.connect(owner).setCommittee(ZERO_ADDRESS)
      ).to.be.revertedWith("CollectionManager#setCommittee: INVALID_COMMITTEE");
    });

    it("reverts when trying to set a committee by hacker", async function () {
      await expect(
        collectionManagerContract.connect(hacker).setCommittee(ZERO_ADDRESS)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("setCommitteeMethods", async function () {
    const methodSelector1 = "0x12345678";
    const methodSelector2 = "0x12345679";

    it("should set committee methods", async function () {
      let isAllowd = await collectionManagerContract.allowedCommitteeMethods(
        methodSelector1
      );
      expect(isAllowd).to.equal(false);
      isAllowd = await collectionManagerContract.allowedCommitteeMethods(
        methodSelector2
      );
      expect(isAllowd).to.equal(false);

      await expect(
        collectionManagerContract
          .connect(owner)
          .setCommitteeMethods([methodSelector1, methodSelector2], [true, true])
      )
        .to.emit(collectionManagerContract, "CommitteeMethodSet")
        .withArgs(methodSelector1, true)
        .to.emit(collectionManagerContract, "CommitteeMethodSet")
        .withArgs(methodSelector2, true);

      isAllowd = await collectionManagerContract.allowedCommitteeMethods(
        methodSelector1
      );
      expect(isAllowd).to.equal(true);
      isAllowd = await collectionManagerContract.allowedCommitteeMethods(
        methodSelector2
      );
      expect(isAllowd).to.equal(true);
      await expect(
        collectionManagerContract
          .connect(owner)
          .setCommitteeMethods([methodSelector2], [false])
      )
        .to.emit(collectionManagerContract, "CommitteeMethodSet")
        .withArgs(methodSelector2, false);
    });

    it("reverts when trying to set methods with invalid length", async function () {
      await expect(
        collectionManagerContract
          .connect(owner)
          .setCommitteeMethods([methodSelector1], [true, false])
      ).to.be.revertedWith(
        "CollectionManager#setCommitteeMethods: EMPTY_METHODS"
      );
      await expect(
        collectionManagerContract
          .connect(owner)
          .setCommitteeMethods([methodSelector1, methodSelector2], [true])
      ).to.be.revertedWith(
        "CollectionManager#setCommitteeMethods: EMPTY_METHODS"
      );
      await expect(
        collectionManagerContract.connect(owner).setCommitteeMethods([], [])
      ).to.be.revertedWith(
        "CollectionManager#setCommitteeMethods: EMPTY_METHODS"
      );
    });

    it("reverts when trying to set a committee by hacker", async function () {
      await expect(
        collectionManagerContract
          .connect(hacker)
          .setCommitteeMethods([methodSelector2], [true])
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("setFeesCollector", async function () {
    it("should set feesCollector", async function () {
      let feesCollector = await collectionManagerContract.feesCollector();
      expect(feesCollector).to.equal(collectorAddr);
      await expect(
        collectionManagerContract.connect(owner).setFeesCollector(userAddr)
      )
        .to.emit(collectionManagerContract, "FeesCollectorSet")
        .withArgs(collectorAddr, userAddr);
      feesCollector = await collectionManagerContract.feesCollector();
      expect(feesCollector).to.equal(userAddr);
      await expect(
        collectionManagerContract.connect(owner).setFeesCollector(collectorAddr)
      )
        .to.emit(collectionManagerContract, "FeesCollectorSet")
        .withArgs(userAddr, collectorAddr);
      feesCollector = await collectionManagerContract.feesCollector();
      expect(feesCollector).to.equal(collectorAddr);
    });

    it("reverts when trying to set the ZERO_ADDRESS as the feesCollector", async function () {
      await expect(
        collectionManagerContract.connect(owner).setFeesCollector(ZERO_ADDRESS)
      ).to.be.revertedWith(
        "CollectionManager#setFeesCollector: INVALID_FEES_COLLECTOR"
      );
    });

    it("reverts when trying to set a feesCollector by hacker", async function () {
      await expect(
        collectionManagerContract.connect(hacker).setFeesCollector(userAddr)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("setRarities", async function () {
    it("should set rarities", async function () {
      let rarities = await collectionManagerContract.rarities();
      expect(rarities).to.equal(raritiesContract.address);
      await expect(
        collectionManagerContract.connect(owner).setRarities(userAddr)
      )
        .to.emit(collectionManagerContract, "RaritiesSet")
        .withArgs(raritiesContract.address, userAddr);
      rarities = await collectionManagerContract.rarities();
      expect(rarities).to.equal(userAddr);
      await expect(
        collectionManagerContract
          .connect(owner)
          .setRarities(raritiesContract.address)
      )
        .to.emit(collectionManagerContract, "RaritiesSet")
        .withArgs(userAddr, raritiesContract.address);
      rarities = await collectionManagerContract.rarities();
      expect(rarities).to.equal(raritiesContract.address);
    });

    it("reverts when trying to set the ZERO_ADDRESS as the rarities", async function () {
      await expect(
        collectionManagerContract.connect(owner).setRarities(ZERO_ADDRESS)
      ).to.be.revertedWith("CollectionManager#setRarities: INVALID_RARITIES");
    });

    it("reverts when trying to set a rarities by hacker", async function () {
      await expect(
        collectionManagerContract.connect(hacker).setRarities(userAddr)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  describe("createCollection", async function () {
    const name = "collectionName";
    const symbol = "collectionSymbol";
    const baseURI = "collectionBaseURI";

    let collectionContract;

    beforeEach(async () => {
      const rarities = getInitialRarities();

      await raritiesContract
        .connect(owner)
        .updatePrices(getRarityNames(), Array(rarities.length).fill(0));
    });

    it("should create a collection", async function () {
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
      expect(await collectionContract.name()).to.equal(name);
      expect(await collectionContract.symbol()).to.equal(symbol);
      expect(await collectionContract.baseURI()).to.equal(baseURI);
      expect(await collectionContract.creator()).to.equal(userAddr);
      expect(await collectionContract.isApproved()).to.equal(false);
      expect(await collectionContract.isCompleted()).to.equal(true);
      expect(await collectionContract.rarities()).to.equal(
        raritiesContract.address
      );
      expect(await collectionContract.itemsCount()).to.equal(ITEMS.length);

      for (let i = 0; i < ITEMS.length; i++) {
        const {
          rarity,
          maxSupply,
          totalSupply,
          price,
          beneficiary,
          metadata,
          contentHash,
        } = await collectionContract.items(i);

        expect(rarity).to.equal(ITEMS[i][0]);
        expect(maxSupply).to.eq(RARITIES_OBJECT[ITEMS[i][0].toString()].value);
        expect(totalSupply).to.eq(0);
        expect(price).to.eq(ITEMS[i][1]);
        expect(beneficiary.toLowerCase()).to.eq(
          ITEMS[i][2].toString().toLowerCase()
        );
        expect(metadata).to.equal(ITEMS[i][3]);
        expect(contentHash).to.equal("");
      }
    });

    it("should create a collection :: Relayed EIP721", async function () {
      const salt = "0x" + genRanHex(64);
      const createCollectionABI = [
        {
          inputs: [
            {
              internalType: "contract IForwarder",
              name: "_forwarder",
              type: "address",
            },
            {
              internalType: "contract IERC721CollectionFactory",
              name: "_factory",
              type: "address",
            },
            {
              internalType: "bytes32",
              name: "_salt",
              type: "bytes32",
            },
            {
              internalType: "string",
              name: "_name",
              type: "string",
            },
            {
              internalType: "string",
              name: "_symbol",
              type: "string",
            },
            {
              internalType: "string",
              name: "_baseURI",
              type: "string",
            },
            {
              internalType: "address",
              name: "_creator",
              type: "address",
            },
            {
              components: [
                {
                  internalType: "string",
                  name: "rarity",
                  type: "string",
                },
                {
                  internalType: "uint256",
                  name: "price",
                  type: "uint256",
                },
                {
                  internalType: "address",
                  name: "beneficiary",
                  type: "address",
                },
                {
                  internalType: "string",
                  name: "metadata",
                  type: "string",
                },
              ],
              internalType: "struct IERC721Collection.ItemParam[]",
              name: "_items",
              type: "tuple[]",
            },
          ],
          name: "createCollection",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(createCollectionABI);
      const functionSignature = iface.encodeFunctionData("createCollection", [
        forwarderContract.address,
        factoryContract.address,
        salt,
        name,
        symbol,
        baseURI,
        userAddr,
        ITEMS,
      ]);
      let createCollectionTx = await sendMetaTx(
        collectionManagerContract,
        functionSignature,
        userAddr,
        relayer,
        null,
        "Unicial Collection Manager",
        "1"
      );
      let logs = (await createCollectionTx.wait()).events;
      const collectionContractAddress = logs[2].address;
      collectionContract = await ethers.getContractAt(
        "ERC721Collection",
        collectionContractAddress
      );
      expect(await collectionContract.name()).to.equal(name);
      expect(await collectionContract.symbol()).to.equal(symbol);
      expect(await collectionContract.baseURI()).to.equal(baseURI);
      expect(await collectionContract.creator()).to.equal(userAddr);
      expect(await collectionContract.isApproved()).to.equal(false);
      expect(await collectionContract.isCompleted()).to.equal(true);
      expect(await collectionContract.rarities()).to.equal(
        raritiesContract.address
      );
      expect(await collectionContract.itemsCount()).to.equal(ITEMS.length);

      for (let i = 0; i < ITEMS.length; i++) {
        const {
          rarity,
          maxSupply,
          totalSupply,
          price,
          beneficiary,
          metadata,
          contentHash,
        } = await collectionContract.items(i);

        expect(rarity).to.equal(ITEMS[i][0]);
        expect(maxSupply).to.eq(RARITIES_OBJECT[ITEMS[i][0].toString()].value);
        expect(totalSupply).to.eq(0);
        expect(price).to.eq(ITEMS[i][1]);
        expect(beneficiary.toLowerCase()).to.eq(
          ITEMS[i][2].toString().toLowerCase()
        );
        expect(metadata).to.equal(ITEMS[i][3]);
        expect(contentHash).to.equal("");
      }
    });

    it("should create a collection by paying the fees in acceptedToken", async function () {
      await raritiesContract
        .connect(owner)
        .updatePrices(getRarityNames(), getRarityDefaulPrices());

      const fee = DEFAULT_RARITY_PRICE.mul(BigNumber.from(ITEMS.length));

      await uccContract
        .connect(user)
        .approve(collectionManagerContract.address, fee);
      await uccContract.mint(userAddr, fee);
      expect(await uccContract.balanceOf(userAddr)).to.equal(fee);

      const creatorBalance = await balanceSnap(
        uccContract,
        userAddr,
        "creator"
      );
      const feeCollectorBalance = await balanceSnap(
        uccContract,
        collectorAddr,
        "feeCollector"
      );

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
          anotherUserAddr,
          ITEMS
        );
      let logs = (await createCollectionTx.wait()).events;
      const collectionContractAddress = logs[3].address;
      collectionContract = await ethers.getContractAt(
        "ERC721Collection",
        collectionContractAddress
      );
      expect(logs[3].address).to.not.be.equal(ZERO_ADDRESS);
      expect(await collectionContract.name()).to.equal(name);
      expect(await collectionContract.symbol()).to.equal(symbol);
      expect(await collectionContract.baseURI()).to.equal(baseURI);
      expect(await collectionContract.creator()).to.equal(anotherUserAddr);
      expect(await collectionContract.isApproved()).to.equal(false);
      expect(await collectionContract.isCompleted()).to.equal(true);
      expect(await collectionContract.rarities()).to.equal(
        raritiesContract.address
      );
      expect(await collectionContract.itemsCount()).to.equal(ITEMS.length);

      for (let i = 0; i < ITEMS.length; i++) {
        const {
          rarity,
          maxSupply,
          totalSupply,
          price,
          beneficiary,
          metadata,
          contentHash,
        } = await collectionContract.items(i);

        expect(rarity).to.equal(ITEMS[i][0]);
        expect(maxSupply).to.eq(RARITIES_OBJECT[ITEMS[i][0].toString()].value);
        expect(totalSupply).to.eq(0);
        expect(price).to.eq(ITEMS[i][1]);
        expect(beneficiary.toLowerCase()).to.eq(
          ITEMS[i][2].toString().toLowerCase()
        );
        expect(metadata).to.equal(ITEMS[i][3]);
        expect(contentHash).to.equal("");
      }

      await creatorBalance.requireDecrease(fee);
      await feeCollectorBalance.requireIncrease(fee);
    });

    it("should create a collection by paying the fees in acceptedToken :: Relayed EIP721", async function () {
      await raritiesContract
        .connect(owner)
        .updatePrices(getRarityNames(), getRarityDefaulPrices());

      const fee = DEFAULT_RARITY_PRICE.mul(BigNumber.from(ITEMS.length));

      await uccContract
        .connect(user)
        .approve(collectionManagerContract.address, fee);
      await uccContract.mint(userAddr, fee);
      expect(await uccContract.balanceOf(userAddr)).to.equal(fee);

      const creatorBalance = await balanceSnap(
        uccContract,
        userAddr,
        "creator"
      );
      const feeCollectorBalance = await balanceSnap(
        uccContract,
        collectorAddr,
        "feeCollector"
      );

      const salt = "0x" + genRanHex(64);
      const createCollectionABI = [
        {
          inputs: [
            {
              internalType: "contract IForwarder",
              name: "_forwarder",
              type: "address",
            },
            {
              internalType: "contract IERC721CollectionFactory",
              name: "_factory",
              type: "address",
            },
            {
              internalType: "bytes32",
              name: "_salt",
              type: "bytes32",
            },
            {
              internalType: "string",
              name: "_name",
              type: "string",
            },
            {
              internalType: "string",
              name: "_symbol",
              type: "string",
            },
            {
              internalType: "string",
              name: "_baseURI",
              type: "string",
            },
            {
              internalType: "address",
              name: "_creator",
              type: "address",
            },
            {
              components: [
                {
                  internalType: "string",
                  name: "rarity",
                  type: "string",
                },
                {
                  internalType: "uint256",
                  name: "price",
                  type: "uint256",
                },
                {
                  internalType: "address",
                  name: "beneficiary",
                  type: "address",
                },
                {
                  internalType: "string",
                  name: "metadata",
                  type: "string",
                },
              ],
              internalType: "struct IERC721Collection.ItemParam[]",
              name: "_items",
              type: "tuple[]",
            },
          ],
          name: "createCollection",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(createCollectionABI);
      const functionSignature = iface.encodeFunctionData("createCollection", [
        forwarderContract.address,
        factoryContract.address,
        salt,
        name,
        symbol,
        baseURI,
        userAddr,
        ITEMS,
      ]);
      let createCollectionTx = await sendMetaTx(
        collectionManagerContract,
        functionSignature,
        userAddr,
        relayer,
        null,
        "Unicial Collection Manager",
        "1"
      );
      let logs = (await createCollectionTx.wait()).events;
      const collectionContractAddress = logs[4].address;
      collectionContract = await ethers.getContractAt(
        "ERC721Collection",
        collectionContractAddress
      );

      expect(logs[4].address).to.not.be.equal(ZERO_ADDRESS);
      expect(await collectionContract.name()).to.equal(name);
      expect(await collectionContract.symbol()).to.equal(symbol);
      expect(await collectionContract.baseURI()).to.equal(baseURI);
      expect(await collectionContract.creator()).to.equal(userAddr);
      expect(await collectionContract.isApproved()).to.equal(false);
      expect(await collectionContract.isCompleted()).to.equal(true);
      expect(await collectionContract.rarities()).to.equal(
        raritiesContract.address
      );
      expect(await collectionContract.itemsCount()).to.equal(ITEMS.length);

      for (let i = 0; i < ITEMS.length; i++) {
        const {
          rarity,
          maxSupply,
          totalSupply,
          price,
          beneficiary,
          metadata,
          contentHash,
        } = await collectionContract.items(i);

        expect(rarity).to.equal(ITEMS[i][0]);
        expect(maxSupply).to.eq(RARITIES_OBJECT[ITEMS[i][0].toString()].value);
        expect(totalSupply).to.eq(0);
        expect(price).to.eq(ITEMS[i][1]);
        expect(beneficiary.toLowerCase()).to.eq(
          ITEMS[i][2].toString().toLowerCase()
        );
        expect(metadata).to.equal(ITEMS[i][3]);
        expect(contentHash).to.equal("");
      }

      await creatorBalance.requireDecrease(fee);
      await feeCollectorBalance.requireIncrease(fee);
    });

    it("should create a collection by paying the fees in acceptedToken :: Relayed EIP721 :: Gas estimation", async function () {
      this.timeout(100000);
      await raritiesContract.connect(owner).updatePrices(
        getRarityNames(),
        getRarityDefaulPrices().map((_) => 1)
      );
      const itemsInTheSameTx = 55;
      const items = [];
      await uccContract
        .connect(user)
        .approve(collectionManagerContract.address, MAX_UINT256);
      const fee = DEFAULT_RARITY_PRICE.mul(BigNumber.from(itemsInTheSameTx));
      await uccContract.mint(userAddr, fee);

      for (let i = 0; i < itemsInTheSameTx; i++) {
        items.push(ITEMS[i % ITEMS.length]);
      }

      const salt = "0x" + genRanHex(64);
      const createCollectionABI = [
        {
          inputs: [
            {
              internalType: "contract IForwarder",
              name: "_forwarder",
              type: "address",
            },
            {
              internalType: "contract IERC721CollectionFactory",
              name: "_factory",
              type: "address",
            },
            {
              internalType: "bytes32",
              name: "_salt",
              type: "bytes32",
            },
            {
              internalType: "string",
              name: "_name",
              type: "string",
            },
            {
              internalType: "string",
              name: "_symbol",
              type: "string",
            },
            {
              internalType: "string",
              name: "_baseURI",
              type: "string",
            },
            {
              internalType: "address",
              name: "_creator",
              type: "address",
            },
            {
              components: [
                {
                  internalType: "string",
                  name: "rarity",
                  type: "string",
                },
                {
                  internalType: "uint256",
                  name: "price",
                  type: "uint256",
                },
                {
                  internalType: "address",
                  name: "beneficiary",
                  type: "address",
                },
                {
                  internalType: "string",
                  name: "metadata",
                  type: "string",
                },
              ],
              internalType: "struct IERC721Collection.ItemParam[]",
              name: "_items",
              type: "tuple[]",
            },
          ],
          name: "createCollection",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(createCollectionABI);
      const functionSignature = iface.encodeFunctionData("createCollection", [
        forwarderContract.address,
        factoryContract.address,
        salt,
        name,
        symbol,
        baseURI,
        userAddr,
        ITEMS,
      ]);
      let createCollectionTx = await sendMetaTx(
        collectionManagerContract,
        functionSignature,
        userAddr,
        relayer,
        null,
        "Unicial Collection Manager",
        "1"
      );
      let res = await createCollectionTx.wait();
      console.log(
        `Deploy a collection with ${itemsInTheSameTx} items -> Gas Used: ${res.gasUsed}`
      );
    });

    it("reverts when creating a collection without paying the fees in acceptedToken", async function () {
      await raritiesContract
        .connect(owner)
        .updatePrices(getRarityNames(), getRarityDefaulPrices());

      const salt = "0x" + genRanHex(64);

      await expect(
        collectionManagerContract
          .connect(owner)
          .createCollection(
            forwarderContract.address,
            factoryContract.address,
            salt,
            name,
            symbol,
            baseURI,
            user,
            ITEMS
          )
      ).to.be.reverted;

      const fee = DEFAULT_RARITY_PRICE.mul(BigNumber.from(ITEMS.length));
      await uccContract.mint(userAddr, fee);

      await uccContract
        .connect(user)
        .approve(collectionManagerContract.address, fee.sub(1));

      await expect(
        collectionManagerContract
          .connect(owner)
          .createCollection(
            forwarderContract.address,
            factoryContract.address,
            salt,
            name,
            symbol,
            baseURI,
            user,
            ITEMS
          )
      ).to.be.reverted;
    });

    it("reverts when forwarder is the contract", async function () {
      const salt = "0x" + genRanHex(64);

      await expect(
        collectionManagerContract
          .connect(user)
          .createCollection(
            collectionManagerContract.address,
            factoryContract.address,
            salt,
            name,
            symbol,
            baseURI,
            anotherUserAddr,
            ITEMS
          )
      ).to.be.revertedWith(
        "CollectionManager#createCollection: FORWARDER_CANT_BE_THIS"
      );
    });
  });
  describe("manageCollection", async function () {
    const name = "collectionName";
    const symbol = "collectionSymbol";
    const baseURI = "collectionBaseURI";

    let collectionContract: Contract;

    beforeEach(async () => {
      const rarities = getInitialRarities();

      await raritiesContract
        .connect(owner)
        .updatePrices(getRarityNames(), Array(rarities.length).fill(0));

      const salt = "0x" + genRanHex(64);
      const createCollectionTx = await collectionManagerContract
        .connect(owner)
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
      await collectionManagerContract.connect(owner).setCommittee(userAddr);
    });
    it("should manage a collection", async function () {
      let isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);
      // Approve collection
      let iface = new ethers.utils.Interface([
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
      ]);
      let functionSignature = iface.encodeFunctionData("setApproved", [true]);
      await collectionManagerContract
        .connect(user)
        .manageCollection(
          forwarderContract.address,
          collectionContract.address,
          functionSignature
        );
      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.equal(true);
      // Approve collection
      iface = new ethers.utils.Interface([
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
      ]);
      functionSignature = iface.encodeFunctionData("setApproved", [false]);
      await collectionManagerContract
        .connect(user)
        .manageCollection(
          forwarderContract.address,
          collectionContract.address,
          functionSignature
        );
      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.equal(false);
      // Rescue collection
      const hash = genRanHex(64);
      const metadata = "saraza";
      iface = new ethers.utils.Interface([
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
      ]);
      functionSignature = iface.encodeFunctionData("rescueItems", [
        [0],
        [hash],
        [metadata],
      ]);
      await collectionManagerContract
        .connect(user)
        .manageCollection(
          forwarderContract.address,
          collectionContract.address,
          functionSignature
        );
      const item = await collectionContract.items(0);
      expect([item.metadata, item.contentHash]).to.be.eql([metadata, hash]);
      iface = new ethers.utils.Interface([
        {
          inputs: [
            {
              internalType: "bool",
              name: "_value",
              type: "bool",
            },
          ],
          name: "setEditable",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ]);
      functionSignature = iface.encodeFunctionData("setEditable", [false]);
      await collectionManagerContract
        .connect(user)
        .manageCollection(
          forwarderContract.address,
          collectionContract.address,
          functionSignature
        );

      const isEditable = await collectionContract.isEditable();
      expect(isEditable).to.equal(false);
    });
    it("should manage a collection :: Relayed EIP721", async function () {
      let isApproved = await collectionContract.isApproved();
      expect(isApproved).to.be.equal(false);
      // Approve collection
      let iface = new ethers.utils.Interface([
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
      ]);
      let functionSignatureSetApproved = iface.encodeFunctionData(
        "setApproved",
        [true]
      );
      iface = new ethers.utils.Interface([
        {
          inputs: [
            {
              internalType: "contract IForwarder",
              name: "_forwarder",
              type: "address",
            },
            {
              internalType: "address",
              name: "_collection",
              type: "address",
            },
            {
              internalType: "bytes",
              name: "_data",
              type: "bytes",
            },
          ],
          name: "manageCollection",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ]);
      let functionSignature = iface.encodeFunctionData("manageCollection", [
        forwarderContract.address,
        collectionContract.address,
        functionSignatureSetApproved,
      ]);
      await sendMetaTx(
        collectionManagerContract,
        functionSignature,
        userAddr,
        relayer,
        null,
        "Unicial Collection Manager",
        "1"
      );
      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.equal(true);
      // Approve collection
      iface = new ethers.utils.Interface([
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
      ]);
      functionSignatureSetApproved = iface.encodeFunctionData("setApproved", [
        false,
      ]);
      iface = new ethers.utils.Interface([
        {
          inputs: [
            {
              internalType: "contract IForwarder",
              name: "_forwarder",
              type: "address",
            },
            {
              internalType: "address",
              name: "_collection",
              type: "address",
            },
            {
              internalType: "bytes",
              name: "_data",
              type: "bytes",
            },
          ],
          name: "manageCollection",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ]);
      functionSignature = iface.encodeFunctionData("manageCollection", [
        forwarderContract.address,
        collectionContract.address,
        functionSignatureSetApproved,
      ]);
      await sendMetaTx(
        collectionManagerContract,
        functionSignature,
        userAddr,
        relayer,
        null,
        "Unicial Collection Manager",
        "1"
      );
      isApproved = await collectionContract.isApproved();
      expect(isApproved).to.equal(false);
    });
    it("reverts when trying to manage not a collection", async function () {
      let iface = new ethers.utils.Interface([
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
      ]);
      let functionSignature = iface.encodeFunctionData("setApproved", [[true]]);
      await expect(
        collectionManagerContract
          .connect(user)
          .manageCollection(
            forwarderContract.address,
            collectionManagerContract.address,
            functionSignature
          )
      ).to.be.revertedWith(
        "CollectionManager#manageCollection: INVALID_COLLECTION"
      );
    });
    it("reverts when trying to manage a collection by not the committee", async function () {
      let iface = new ethers.utils.Interface([
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
      ]);
      let functionSignature = iface.encodeFunctionData("setApproved", [[true]]);
      await expect(
        collectionManagerContract
          .connect(hacker)
          .manageCollection(
            forwarderContract.address,
            collectionContract.address,
            functionSignature
          )
      ).to.be.revertedWith(
        "CollectionManager#manageCollection: UNAUTHORIZED_SENDER"
      );
      await expect(
        collectionManagerContract
          .connect(owner)
          .manageCollection(
            forwarderContract.address,
            collectionContract.address,
            functionSignature
          )
      ).to.be.revertedWith(
        "CollectionManager#manageCollection: UNAUTHORIZED_SENDER"
      );
    });
    it("reverts when forwarder is the contract", async function () {
      let iface = new ethers.utils.Interface([
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
      ]);
      const functionSignature = iface.encodeFunctionData("setApproved", [true]);
      await expect(
        collectionManagerContract
          .connect(user)
          .manageCollection(
            collectionManagerContract.address,
            collectionContract.address,
            functionSignature
          )
      ).to.be.revertedWith(
        "CollectionManager#manageCollection: FORWARDER_CANT_BE_THIS"
      );
    });
    it("reverts when forwarder is the contract", async function () {
      let iface = new ethers.utils.Interface([
        {
          inputs: [
            {
              internalType: "bool",
              name: "_value",
              type: "bool",
            },
          ],
          name: "transferOwnership",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ]);
      const functionSignature = iface.encodeFunctionData("transferOwnership", [
        true,
      ]);
      await expect(
        collectionManagerContract
          .connect(user)
          .manageCollection(
            forwarderContract.address,
            collectionContract.address,
            functionSignature
          )
      ).to.be.revertedWith(
        "CollectionManager#manageCollection: COMMITTEE_METHOD_NOT_ALLOWED"
      );
    });
  });
});
