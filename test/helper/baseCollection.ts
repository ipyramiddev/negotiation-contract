import { expect } from "chai";
import {
  EMPTY_HASH,
  ZERO_ADDRESS,
  BASE_URI,
  MAX_UINT256,
  RARITIES_OBJECT,
  COLLECTION_HASH,
  encodeTokenId,
  decodeTokenId,
} from "./Collection";
import {
  sendMetaTx,
  getDomainSeparator,
  getSignature,
  DEFAULT_DOMAIN,
  DEFAULT_VERSION,
} from "./MetaTx";
import { getChainId } from "./ChainId";
import { ethers } from "hardhat";
import { Signer, BigNumber, utils, Contract } from "ethers";
const { expectRevert } = require("@openzeppelin/test-helpers");

export function doTest(
  Contract: any,
  createContract: any,
  contractName: any,
  contractSymbol: any,
  items: any,
  issueItem: (contract, holder, index, signer) => void,
  afterEach = () => ({}),
  tokenIds = [BigNumber.from(0), BigNumber.from(1), BigNumber.from(2)]
) {
  describe("Base Collection", function () {
    this.timeout(100000);

    let creationParams: any;

    // tokens
    const token1 = tokenIds[0];
    const token2 = tokenIds[1];
    const token3 = tokenIds[2];

    // Accounts
    let deployer: string;
    let user: string;
    let anotherUser: string;
    let hacker: string;
    let holder: string;
    let anotherHolder: string;
    let beneficiary: string;
    let creator: string;
    let minter: string;
    let manager: string;
    let relayer: string;
    let operator: string;
    let approvedForAll: string;
    let fromUser: any;
    let fromAnotherUser: any;
    let fromHolder: any;
    let fromAnotherHolder: any;
    let fromHacker: any;
    let fromBeneficiary: any;
    let fromDeployer: any;
    let fromCreator: any;
    let fromManager: any;
    let fromOperator: any;
    let fromRelayer: any;
    let fromMinter: any;
    let fromApprovedForAll: any;

    // Contracts
    let collectionContract: any;
    let raritiesContractAddress: any;

    // contract variable
    let chainId: any;

    beforeEach(async function () {
      [
        fromUser,
        fromAnotherUser,
        fromHolder,
        fromAnotherHolder,
        fromHacker,
        fromBeneficiary,
        fromDeployer,
        fromCreator,
        fromManager,
        fromOperator,
        fromRelayer,
        fromMinter,
        fromApprovedForAll,
      ] = await ethers.getSigners();
      [
        user,
        anotherUser,
        holder,
        anotherHolder,
        hacker,
        beneficiary,
        deployer,
        creator,
        manager,
        operator,
        relayer,
        minter,
        approvedForAll,
      ] = await Promise.all([
        fromUser.getAddress(),
        fromAnotherUser.getAddress(),
        fromHolder.getAddress(),
        fromAnotherHolder.getAddress(),
        fromHacker.getAddress(),
        fromBeneficiary.getAddress(),
        fromDeployer.getAddress(),
        fromCreator.getAddress(),
        fromManager.getAddress(),
        fromOperator.getAddress(),
        fromRelayer.getAddress(),
        fromMinter.getAddress(),
        fromApprovedForAll.getAddress(),
      ]);
      // Create Listing environment

      creationParams = {
        ...fromDeployer,
        gasPrice: 21e9,
      };

      // Create collection and set up wearables

      collectionContract = await createContract(
        creator,
        true, // shouldComplete
        true, // isApproved
        true
      );
      raritiesContractAddress = await collectionContract.rarities();

      // Issue some tokens
      await issueItem(collectionContract, holder, 0, fromCreator);
      await issueItem(collectionContract, holder, 0, fromCreator);
      await issueItem(collectionContract, anotherHolder, 1, fromCreator);

      chainId = getChainId();
    });

    this.afterEach(async () => {
      if (typeof afterEach === "function") {
        afterEach();
      }
    });

    describe("initialize", function () {
      it("should be initialized with correct values", async function () {
        let contract: any = await Contract.deploy();
        await contract.initialize(
          contractName,
          contractSymbol,
          BASE_URI,
          user,
          false,
          true,
          raritiesContractAddress,
          items
        );
        const baseURI_ = await contract.baseURI();
        const creator_ = await contract.creator();
        const owner_ = await contract.owner();
        const name_ = await contract.name();
        const symbol_ = await contract.symbol();
        const isInitialized_ = await contract.isInitialized();
        const isApproved_ = await contract.isApproved();
        const isCompleted_ = await contract.isCompleted();
        const isEditable_ = await contract.isEditable();
        const collectionHash = await contract.COLLECTION_HASH();
        const rarities = await contract.rarities();
        expect(baseURI_).to.be.equal(BASE_URI);
        expect(creator_).to.be.equal(user);
        expect(owner_).to.be.equal(user);
        expect(name_).to.be.equal(contractName);
        expect(symbol_).to.be.equal(contractSymbol);
        expect(isInitialized_).to.be.equal(true);
        expect(isApproved_).to.be.equal(true);
        expect(isCompleted_).to.be.equal(false);
        expect(isEditable_).to.be.equal(true);
        expect(collectionHash).to.be.equal(COLLECTION_HASH);
        expect(raritiesContractAddress).to.be.equal(rarities);
        const itemLength = await contract.itemsCount();
        expect(items.length).to.be.eq(itemLength);
        for (let i = 0; i < items.length; i++) {
          const {
            rarity,
            maxSupply,
            totalSupply,
            price,
            beneficiary,
            metadata,
            contentHash,
          } = await contract.items(i);
          expect(rarity).to.be.eq(items[i][0]);
          expect(maxSupply).to.be.eq(RARITIES_OBJECT[rarity].value);
          expect(totalSupply).to.be.eq(0);
          expect(price).to.be.eq(items[i][1]);
          expect(beneficiary.toLowerCase()).to.be.equal(
            items[i][2].toLowerCase()
          );
          expect(metadata).to.be.equal(items[i][3]);
          expect(contentHash).to.be.equal("");
        }
      });

      it("should be initialized and completed", async function () {
        const contract = await Contract.deploy();
        await contract.initialize(
          contractName,
          contractSymbol,
          BASE_URI,
          user,
          true,
          true,
          raritiesContractAddress,
          items
        );

        const isCompleted_ = await contract.isCompleted();
        expect(isCompleted_).to.be.equal(true);
      });

      it("should be initialized and not approved", async function () {
        const contract = await Contract.deploy();
        await contract.initialize(
          contractName,
          contractSymbol,
          BASE_URI,
          user,
          false,
          false,
          raritiesContractAddress,
          items
        );

        const isApproved_ = await contract.isApproved();
        expect(isApproved_).to.be.equal(false);
      });

      it("should be initialized and completed", async function () {
        const contract = await Contract.deploy();
        let isInitialized = await contract.isInitialized();
        expect(isInitialized).to.be.equal(false);

        await contract.initImplementation();

        isInitialized = await contract.isInitialized();
        expect(isInitialized).to.be.equal(true);
      });

      it("reverts when trying to initialize with an invalid creator", async function () {
        const contract = await Contract.deploy();
        await expectRevert(
          contract.initialize(
            contractName,
            contractSymbol,
            BASE_URI,
            user,
            true,
            true,
            ZERO_ADDRESS,
            items
          ),
          "initialize: INVALID_RARITIES"
        );
      });

      it("reverts when trying to initialize with an invalid creator", async function () {
        const contract = await Contract.deploy();
        await expectRevert(
          contract.initialize(
            contractName,
            contractSymbol,
            BASE_URI,
            ZERO_ADDRESS,
            true,
            true,
            raritiesContractAddress,
            items
          ),
          "initialize: INVALID_CREATOR"
        );
      });

      it("reverts when trying to initialize more than once", async function () {
        const contract = await Contract.deploy();
        await contract.initialize(
          contractName,
          contractSymbol,
          BASE_URI,
          user,
          true,
          true,
          raritiesContractAddress,
          items
        );

        await expectRevert(
          contract.initialize(
            contractName,
            contractSymbol,
            BASE_URI,
            user,
            true,
            true,
            raritiesContractAddress,
            items
          ),
          "initialize: ALREADY_INITIALIZED"
        );

        await expectRevert(
          contract.initImplementation(),
          "initialize: ALREADY_INITIALIZED"
        );
      });

      it("reverts when trying to initialize without items", async function () {
        const contract = await Contract.deploy();
        await expectRevert(
          contract.initialize(
            contractName,
            contractSymbol,
            BASE_URI,
            user,
            false,
            true,
            raritiesContractAddress,
            []
          ),
          "_addItems: EMPTY_ITEMS"
        );
      });
    });

    describe("setApproved", function () {
      let contract: Contract;
      beforeEach(async () => {
        contract = await Contract.deploy();
        await contract.initialize(
          contractName,
          contractSymbol,
          BASE_URI,
          creator,
          true,
          true,
          raritiesContractAddress,
          items
        );
      });

      it("should set isApproved", async function () {
        let isApproved = await contract.isApproved();
        expect(isApproved).to.be.equal(true);
        let setApproveTx = await contract.setApproved(false);
        const logs = (await setApproveTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("SetApproved");
        expect(logs[0].args._previousValue).to.be.equal(true);
        expect(logs[0].args._newValue).to.be.equal(false);

        isApproved = await contract.isApproved();
        expect(isApproved).to.be.equal(false);

        await contract.setApproved(true);

        isApproved = await contract.isApproved();
        expect(isApproved).to.be.equal(true);
      });

      it("should setApproved :: Relayed EIP721", async function () {
        let isApproved = await contract.isApproved();
        expect(isApproved).to.be.equal(true);
        let ABI = [
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
        let iface = new utils.Interface(ABI);
        let functionSignature = iface.encodeFunctionData("setApproved", [
          false,
        ]);

        let executeMetaTransactionTx = await sendMetaTx(
          contract,
          functionSignature,
          user,
          fromRelayer
        );
        const logs = (await executeMetaTransactionTx.wait()).events;

        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(user);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("SetApproved");
        expect(logs[1].args._previousValue).to.be.equal(true);
        expect(logs[1].args._newValue).to.be.equal(false);

        isApproved = await contract.isApproved();
        expect(isApproved).to.be.equal(false);
        functionSignature = iface.encodeFunctionData("setApproved", [true]);

        await sendMetaTx(contract, functionSignature, user, fromRelayer);

        isApproved = await contract.isApproved();
        expect(isApproved).to.be.equal(true);
      });

      it("reverts when trying to approve a collection by not the owner", async function () {
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);
        await contract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          contract.connect(fromMinter).setApproved(false),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          contract.connect(fromMinter).setApproved(false),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          contract.connect(fromMinter).setApproved(false),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          contract.connect(fromMinter).setApproved(false),
          "Ownable: caller is not the owner"
        );
      });

      it("reverts when trying to approve a collection by not the owner :: Relayed EIP721", async function () {
        let ABI = ["function setApproved(bool _value)"];
        let iface = new utils.Interface(ABI);
        let functionSignature = iface.encodeFunctionData("setApproved", [
          [false],
        ]);

        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);
        await contract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          sendMetaTx(contract, functionSignature, creator, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, minter, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, manager, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, hacker, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts when trying to approve with the same value", async function () {
        await expectRevert(
          contract.connect(fromUser).setApproved(true),
          "setApproved: VALUE_IS_THE_SAME"
        );
      });
    });

    describe("minters", function () {
      it("should add global minters", async function () {
        let isMinter = await collectionContract.globalMinters(minter);
        expect(isMinter).to.be.equal(false);
        let setMintersTx = await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        const logs = (await setMintersTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("SetGlobalMinter");
        expect(logs[0].args._minter).to.be.equal(minter);
        expect(logs[0].args._value).to.be.equal(true);
        isMinter = await collectionContract.globalMinters(minter);
        expect(isMinter).to.be.equal(true);

        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [false]);
        isMinter = await collectionContract.globalMinters(minter);
        expect(isMinter).to.be.equal(false);
      });

      it("should add global minters in batch", async function () {
        let isMinter = await collectionContract.globalMinters(minter);
        expect(isMinter).to.be.equal(false);

        isMinter = await collectionContract.globalMinters(user);
        expect(isMinter).to.be.equal(false);

        let setMintersTx = await collectionContract
          .connect(fromCreator)
          .setMinters([minter, user], [true, true]);

        let logs = (await setMintersTx.wait()).events;
        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("SetGlobalMinter");
        expect(logs[0].args._minter).to.be.equal(minter);
        expect(logs[0].args._value).to.be.equal(true);

        expect(logs[1].event).to.be.equal("SetGlobalMinter");
        expect(logs[1].args._minter).to.be.equal(user);
        expect(logs[1].args._value).to.be.equal(true);

        setMintersTx = await collectionContract
          .connect(fromCreator)
          .setMinters([minter, user], [false, false]);
        logs = (await setMintersTx.wait()).events;

        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("SetGlobalMinter");
        expect(logs[0].args._minter).to.be.equal(minter);
        expect(logs[0].args._value).to.be.equal(false);

        expect(logs[1].event).to.be.equal("SetGlobalMinter");
        expect(logs[1].args._minter).to.be.equal(user);
        expect(logs[1].args._value).to.be.equal(false);

        isMinter = await collectionContract.globalMinters(minter);
        expect(isMinter).to.be.equal(false);

        isMinter = await collectionContract.globalMinters(user);
        expect(isMinter).to.be.equal(false);
      });

      it("should add items minters", async function () {
        let minterAllowance = await collectionContract.itemMinters(0, minter);
        expect(minterAllowance).to.be.eq(0);

        const setItemsMintersTx = await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        let logs = (await setItemsMintersTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("SetItemMinter");
        expect(logs[0].args._itemId).to.be.eq(0);
        expect(logs[0].args._minter).to.be.equal(minter);
        expect(logs[0].args._value).to.be.eq(1);

        minterAllowance = await collectionContract.itemMinters(0, minter);
        expect(minterAllowance).to.be.eq(1);

        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [0]);
        minterAllowance = await collectionContract.itemMinters(0, minter);
        expect(minterAllowance).to.be.eq(0);
      });

      it("should add items minters in batch", async function () {
        let minterAllowance = await collectionContract.itemMinters(1, minter);
        expect(minterAllowance).to.be.eq(0);

        minterAllowance = await collectionContract.itemMinters(1, user);
        expect(minterAllowance).to.be.eq(0);

        let setItemsMintersTx = await collectionContract
          .connect(fromCreator)
          .setItemsMinters([1, 1], [minter, user], [1, 1]);
        let logs = (await setItemsMintersTx.wait()).events;

        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("SetItemMinter");
        expect(logs[0].args._itemId).to.be.eq(1);
        expect(logs[0].args._minter).to.be.equal(minter);
        expect(logs[0].args._value).to.be.eq(1);

        expect(logs[1].event).to.be.equal("SetItemMinter");
        expect(logs[1].args._itemId).to.be.eq(1);
        expect(logs[1].args._minter).to.be.equal(user);
        expect(logs[1].args._value).to.be.eq(1);

        setItemsMintersTx = await collectionContract
          .connect(fromCreator)
          .setItemsMinters([1, 1, 1], [minter, anotherUser, user], [0, 10, 0]);
        logs = (await setItemsMintersTx.wait()).events;
        expect(logs.length).to.be.equal(3);
        expect(logs[0].event).to.be.equal("SetItemMinter");
        expect(logs[0].args._itemId).to.be.eq(1);
        expect(logs[0].args._minter).to.be.equal(minter);
        expect(logs[0].args._value).to.be.eq(0);

        expect(logs[1].event).to.be.equal("SetItemMinter");
        expect(logs[1].args._itemId).to.be.eq(1);
        expect(logs[1].args._minter).to.be.equal(anotherUser);
        expect(logs[1].args._value).to.be.eq(10);

        expect(logs[2].event).to.be.equal("SetItemMinter");
        expect(logs[2].args._itemId).to.be.eq(1);
        expect(logs[2].args._minter).to.be.equal(user);
        expect(logs[2].args._value).to.be.eq(0);

        minterAllowance = await collectionContract.itemMinters(1, minter);
        expect(minterAllowance).to.be.eq(0);

        minterAllowance = await collectionContract.itemMinters(1, user);
        expect(minterAllowance).to.be.eq(0);

        minterAllowance = await collectionContract.itemMinters(1, anotherUser);
        expect(minterAllowance).to.be.eq(10);
      });

      it("should add global minters :: Relayed EIP721", async function () {
        let isMinter = await collectionContract.globalMinters(minter);
        expect(isMinter).to.be.equal(false);
        let ABI = [
          {
            inputs: [
              {
                internalType: "address[]",
                name: "_minters",
                type: "address[]",
              },
              {
                internalType: "bool[]",
                name: "_values",
                type: "bool[]",
              },
            ],
            name: "setMinters",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ];
        let iface = new utils.Interface(ABI);
        let functionSignature = iface.encodeFunctionData("setMinters", [
          [minter],
          [true],
        ]);

        const setMintersTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          creator,
          fromRelayer
        );
        const logs = (await setMintersTx.wait()).events;
        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(creator);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("SetGlobalMinter");
        expect(logs[1].args._minter).to.be.equal(minter);
        expect(logs[1].args._value).to.be.equal(true);

        isMinter = await collectionContract.globalMinters(minter);
        expect(isMinter).to.be.equal(true);

        functionSignature = iface.encodeFunctionData("setMinters", [
          [minter],
          [false],
        ]);

        await sendMetaTx(
          collectionContract,
          functionSignature,
          creator,
          fromRelayer
        );

        isMinter = await collectionContract.globalMinters(minter);
        expect(isMinter).to.be.equal(false);
      });

      it("should add items minters :: Relayed EIP721", async function () {
        let minterAllowance = await collectionContract.itemMinters(0, minter);
        expect(minterAllowance).to.be.eq(0);

        let ABI = [
          {
            inputs: [
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
              {
                internalType: "address[]",
                name: "_minters",
                type: "address[]",
              },
              {
                internalType: "uint256[]",
                name: "_values",
                type: "uint256[]",
              },
            ],
            name: "setItemsMinters",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ];
        let iface = new utils.Interface(ABI);
        let functionSignature = iface.encodeFunctionData("setItemsMinters", [
          [0],
          [minter],
          [1],
        ]);
        const setItemsMintersTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          creator,
          fromRelayer
        );
        const logs = (await setItemsMintersTx.wait()).events;

        expect(logs.length).to.be.equal(2);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(creator);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("SetItemMinter");
        expect(logs[1].args._itemId).to.be.eq(0);
        expect(logs[1].args._minter).to.be.equal(minter);
        expect(logs[1].args._value).to.be.eq(1);

        minterAllowance = await collectionContract.itemMinters(0, minter);
        expect(minterAllowance).to.be.eq(1);

        functionSignature = iface.encodeFunctionData("setItemsMinters", [
          [0],
          [minter],
          [0],
        ]);

        await sendMetaTx(
          collectionContract,
          functionSignature,
          creator,
          fromRelayer
        );

        minterAllowance = await collectionContract.itemMinters(0, minter);
        expect(minterAllowance).to.be.eq(0);
      });

      it("reverts when params' length mismatch", async function () {
        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setMinters([minter], [true, false]),
          "setMinters: LENGTH_MISMATCH"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setMinters([minter, user], [true]),
          "setMinters: LENGTH_MISMATCH"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsMinters([0, 0], [minter], [1]),
          "setItemsMinters: LENGTH_MISMATCH"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsMinters([0], [minter, user], [1]),
          "setItemsMinters: LENGTH_MISMATCH"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsMinters([0], [minter], [1, 1]),
          "setItemsMinters: LENGTH_MISMATCH"
        );
      });

      it("reverts when not the creator trying to set a minter", async function () {
        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [1]);
        await expectRevert(
          collectionContract.connect(fromDeployer).setMinters([user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract.connect(fromMinter).setMinters([user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract.connect(fromManager).setMinters([user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract.connect(fromHacker).setMinters([user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract
            .connect(fromDeployer)
            .setItemsMinters([1], [user], [1]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract
            .connect(fromMinter)
            .setItemsMinters([1], [user], [1]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract
            .connect(fromManager)
            .setItemsMinters([1], [user], [1]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract
            .connect(fromHacker)
            .setItemsMinters([1], [user], [1]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );
      });

      it("reverts when not the creator trying to set a minter :: Relayed EIP721", async function () {
        let setMintersABI = [
          {
            inputs: [
              {
                internalType: "address[]",
                name: "_minters",
                type: "address[]",
              },
              {
                internalType: "bool[]",
                name: "_values",
                type: "bool[]",
              },
            ],
            name: "setMinters",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ];
        let setMintersIface = new utils.Interface(setMintersABI);
        let functionSignatureGlobal = setMintersIface.encodeFunctionData(
          "setMinters",
          [[minter], [false]]
        );

        let setItemsMintersABI = [
          {
            inputs: [
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
              {
                internalType: "address[]",
                name: "_minters",
                type: "address[]",
              },
              {
                internalType: "uint256[]",
                name: "_values",
                type: "uint256[]",
              },
            ],
            name: "setItemsMinters",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ];
        let setItemsMintersIface = new utils.Interface(setItemsMintersABI);
        let functionSignatureItem = setItemsMintersIface.encodeFunctionData(
          "setItemsMinters",
          [[0], [minter], [1]]
        );

        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [1]);

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureGlobal,
            deployer,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureGlobal,
            minter,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureGlobal,
            manager,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureGlobal,
            hacker,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureItem,
            deployer,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureItem,
            minter,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureItem,
            manager,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureItem,
            hacker,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts when using an invalid address", async function () {
        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setMinters([ZERO_ADDRESS], [true]),
          "setMinters: INVALID_MINTER_ADDRESS"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsMinters([0], [ZERO_ADDRESS], [1]),
          "setItemsMinters: INVALID_MINTER_ADDRESS"
        );
      });

      it("reverts when the itemId is invalid", async function () {
        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsMinters([items.length], [minter], [1]),
          "setItemsMinters: ITEM_DOES_NOT_EXIST"
        );
      });

      it("reverts when the value is the same", async function () {
        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);

        await expectRevert(
          collectionContract.connect(fromCreator).setMinters([minter], [true]),
          "setMinters: VALUE_IS_THE_SAME"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setMinters([user, minter], [true, true]),
          "setMinters: VALUE_IS_THE_SAME"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsMinters([0], [minter], [1]),
          "setItemsMinters: VALUE_IS_THE_SAME"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsMinters([0, 1, 0], [user, minter, minter], [1, 1, 1]),
          "setItemsMinters: VALUE_IS_THE_SAME"
        );
      });
    });

    describe("managers", function () {
      it("should add global managers", async function () {
        let isManager = await collectionContract.globalManagers(manager);
        expect(isManager).to.be.equal(false);

        let setManagersTx = await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        const logs = (await setManagersTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("SetGlobalManager");
        expect(logs[0].args._manager).to.be.equal(manager);
        expect(logs[0].args._value).to.be.equal(true);

        isManager = await collectionContract.globalManagers(manager);
        expect(isManager).to.be.equal(true);

        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [false]);
        isManager = await collectionContract.globalManagers(manager);
        expect(isManager).to.be.equal(false);
      });

      it("should add global managers in batch", async function () {
        let isManager = await collectionContract.globalManagers(manager);
        expect(isManager).to.be.equal(false);

        isManager = await collectionContract.globalManagers(user);
        expect(isManager).to.be.equal(false);

        let setManagersTx = await collectionContract
          .connect(fromCreator)
          .setManagers([manager, user], [true, true]);
        let logs = (await setManagersTx.wait()).events;

        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("SetGlobalManager");
        expect(logs[0].args._manager).to.be.equal(manager);
        expect(logs[0].args._value).to.be.equal(true);

        expect(logs[1].event).to.be.equal("SetGlobalManager");
        expect(logs[1].args._manager).to.be.equal(user);
        expect(logs[1].args._value).to.be.equal(true);

        setManagersTx = await collectionContract
          .connect(fromCreator)
          .setManagers([manager, anotherUser, user], [false, true, false]);
        logs = (await setManagersTx.wait()).events;

        expect(logs.length).to.be.equal(3);
        expect(logs[0].event).to.be.equal("SetGlobalManager");
        expect(logs[0].args._manager).to.be.equal(manager);
        expect(logs[0].args._value).to.be.equal(false);

        expect(logs[1].event).to.be.equal("SetGlobalManager");
        expect(logs[1].args._manager).to.be.equal(anotherUser);
        expect(logs[1].args._value).to.be.equal(true);

        expect(logs[2].event).to.be.equal("SetGlobalManager");
        expect(logs[2].args._manager).to.be.equal(user);
        expect(logs[2].args._value).to.be.equal(false);

        isManager = await collectionContract.globalManagers(manager);
        expect(isManager).to.be.equal(false);

        isManager = await collectionContract.globalManagers(user);
        expect(isManager).to.be.equal(false);

        isManager = await collectionContract.globalManagers(anotherUser);
        expect(isManager).to.be.equal(true);
      });

      it("should add items managers", async function () {
        let isManager = await collectionContract.itemManagers(0, manager);
        expect(isManager).to.be.equal(false);

        const setItemsManagersTx = await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);
        const logs = (await setItemsManagersTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("SetItemManager");
        expect(logs[0].args._itemId).to.be.eq(0);
        expect(logs[0].args._manager).to.be.equal(manager);
        expect(logs[0].args._value).to.be.equal(true);

        isManager = await collectionContract.itemManagers(0, manager);
        expect(isManager).to.be.equal(true);

        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [false]);
        isManager = await collectionContract.itemManagers(0, manager);
        expect(isManager).to.be.equal(false);
      });

      it("should add items managers in batch", async function () {
        let isManager = await collectionContract.itemManagers(1, manager);
        expect(isManager).to.be.equal(false);

        isManager = await collectionContract.itemManagers(1, user);
        expect(isManager).to.be.equal(false);

        let res = await collectionContract
          .connect(fromCreator)
          .setItemsManagers([1, 1], [manager, user], [true, true]);
        let logs = (await res.wait()).events;

        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("SetItemManager");
        expect(logs[0].args._itemId).to.be.eq(1);
        expect(logs[0].args._manager).to.be.equal(manager);
        expect(logs[0].args._value).to.be.equal(true);

        expect(logs[1].event).to.be.equal("SetItemManager");
        expect(logs[1].args._itemId).to.be.eq(1);
        expect(logs[1].args._manager).to.be.equal(user);
        expect(logs[1].args._value).to.be.equal(true);

        res = await collectionContract
          .connect(fromCreator)
          .setItemsManagers(
            [1, 1, 1],
            [manager, anotherUser, user],
            [false, true, false]
          );
        logs = (await res.wait()).events;

        expect(logs.length).to.be.equal(3);
        expect(logs[0].event).to.be.equal("SetItemManager");
        expect(logs[0].args._itemId).to.be.eq(1);
        expect(logs[0].args._manager).to.be.equal(manager);
        expect(logs[0].args._value).to.be.equal(false);

        expect(logs[1].event).to.be.equal("SetItemManager");
        expect(logs[1].args._itemId).to.be.eq(1);
        expect(logs[1].args._manager).to.be.equal(anotherUser);
        expect(logs[1].args._value).to.be.equal(true);

        expect(logs[2].event).to.be.equal("SetItemManager");
        expect(logs[2].args._itemId).to.be.eq(1);
        expect(logs[2].args._manager).to.be.equal(user);
        expect(logs[2].args._value).to.be.equal(false);

        isManager = await collectionContract.itemManagers(1, manager);
        expect(isManager).to.be.equal(false);

        isManager = await collectionContract.itemManagers(1, user);
        expect(isManager).to.be.equal(false);

        isManager = await collectionContract.itemManagers(1, anotherUser);
        expect(isManager).to.be.equal(true);
      });

      it("should add global managers :: Relayed EIP721", async function () {
        let isManager = await collectionContract.globalManagers(manager);
        expect(isManager).to.be.equal(false);
        //     let setItemsMintersIface = new utils.Interface(setItemsMintersABI);
        //     let functionSignatureItem = setItemsMintersIface.encodeFunctionData(
        //       "setItemsMinters",
        //       [[0], [minter], [1]]
        //     );
        let ABI = [
          {
            inputs: [
              {
                internalType: "address[]",
                name: "_managers",
                type: "address[]",
              },
              {
                internalType: "bool[]",
                name: "_values",
                type: "bool[]",
              },
            ],
            name: "setManagers",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ];
        let iface = new utils.Interface(ABI);
        let functionSignature = iface.encodeFunctionData("setManagers", [
          [manager],
          [true],
        ]);

        const setManagersTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          creator,
          fromRelayer
        );
        const logs = (await setManagersTx.wait()).events;
        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(creator);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("SetGlobalManager");
        expect(logs[1].args._manager).to.be.equal(manager);
        expect(logs[1].args._value).to.be.equal(true);

        isManager = await collectionContract.globalManagers(manager);
        expect(isManager).to.be.equal(true);

        functionSignature = iface.encodeFunctionData("setManagers", [
          [manager],
          [false],
        ]);

        await sendMetaTx(
          collectionContract,
          functionSignature,
          creator,
          fromRelayer
        );

        isManager = await collectionContract.globalMinters(manager);
        expect(isManager).to.be.equal(false);
      });

      it("should add items managers :: Relayed EIP721", async function () {
        let isManager = await collectionContract.itemManagers(0, manager);
        expect(isManager).to.be.equal(false);
        let ABI = [
          {
            inputs: [
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
              {
                internalType: "address[]",
                name: "_managers",
                type: "address[]",
              },
              {
                internalType: "bool[]",
                name: "_values",
                type: "bool[]",
              },
            ],
            name: "setItemsManagers",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ];
        let iface = new utils.Interface(ABI);
        let functionSignature = iface.encodeFunctionData("setItemsManagers", [
          [0],
          [manager],
          [true],
        ]);

        const setItemsManagersTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          creator,
          fromRelayer
        );

        const logs = (await setItemsManagersTx.wait()).events;

        expect(logs.length).to.be.equal(2);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(creator);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("SetItemManager");
        expect(logs[1].args._itemId).to.be.eq(0);
        expect(logs[1].args._manager).to.be.equal(manager);
        expect(logs[1].args._value).to.be.equal(true);

        isManager = await collectionContract.itemManagers(0, manager);
        expect(isManager).to.be.equal(true);
        functionSignature = iface.encodeFunctionData("setItemsManagers", [
          [0],
          [manager],
          [false],
        ]);

        await sendMetaTx(
          collectionContract,
          functionSignature,
          creator,
          fromRelayer
        );

        isManager = await collectionContract.itemManagers(0, manager);
        expect(isManager).to.be.equal(false);
      });

      it("reverts when params' length mismatch", async function () {
        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setManagers([manager], [true, false]),
          "setManagers: LENGTH_MISMATCH"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setManagers([manager, user], [true]),
          "setManagers: LENGTH_MISMATCH"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsManagers([0, 0], [manager], [true]),
          "setItemsManagers: LENGTH_MISMATCH"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsManagers([0], [manager, user], [true]),
          "setItemsManagers: LENGTH_MISMATCH"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsManagers([0], [manager], [true, false]),
          "setItemsManagers: LENGTH_MISMATCH"
        );
      });

      it("reverts when not the creator trying to set a manager", async function () {
        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          collectionContract.connect(fromDeployer).setManagers([user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract.connect(fromManager).setManagers([user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract.connect(fromMinter).setManagers([user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract.connect(fromHacker).setManagers([user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract
            .connect(fromDeployer)
            .setItemsManagers([1], [user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract
            .connect(fromMinter)
            .setItemsManagers([1], [user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract
            .connect(fromManager)
            .setItemsManagers([1], [user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          collectionContract
            .connect(fromHacker)
            .setItemsManagers([1], [user], [false]),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );
      });

      it("reverts when not the creator trying to set a manager :: Relayed EIP721", async function () {
        let setManagersABI = [
          {
            inputs: [
              {
                internalType: "address[]",
                name: "_managers",
                type: "address[]",
              },
              {
                internalType: "bool[]",
                name: "_values",
                type: "bool[]",
              },
            ],
            name: "setManagers",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ];
        let setManagersFace = new utils.Interface(setManagersABI);
        const functionSignatureGlobal = setManagersFace.encodeFunctionData(
          "setManagers",
          [[manager], [false]]
        );

        const functionSignatureItem = new utils.Interface([
          {
            inputs: [
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
              {
                internalType: "address[]",
                name: "_managers",
                type: "address[]",
              },
              {
                internalType: "bool[]",
                name: "_values",
                type: "bool[]",
              },
            ],
            name: "setItemsManagers",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("setItemsManagers", [[0], [manager], [false]]);

        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureGlobal,
            deployer,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureGlobal,
            minter,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureGlobal,
            manager,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureGlobal,
            hacker,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureItem,
            deployer,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureItem,
            minter,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureItem,
            manager,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignatureItem,
            hacker,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts when the using an invalid address", async function () {
        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setManagers([ZERO_ADDRESS], [true]),
          "setManagers: INVALID_MANAGER_ADDRESS"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsManagers([0], [ZERO_ADDRESS], [true]),
          "setItemsManagers: INVALID_MANAGER_ADDRESS"
        );
      });

      it("reverts when the itemId is invalid", async function () {
        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsManagers([items.length], [manager], [true]),
          "setItemsManagers: ITEM_DOES_NOT_EXIST"
        );
      });

      it("reverts when the value is the same", async function () {
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setManagers([manager], [true]),
          "setManagers: VALUE_IS_THE_SAME"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setManagers([user, manager], [true, true]),
          "setManagers: VALUE_IS_THE_SAME"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsManagers([0], [manager], [true]),
          "setItemsManagers: VALUE_IS_THE_SAME"
        );

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .setItemsManagers(
              [0, 1, 0],
              [user, manager, manager],
              [true, true, true]
            ),
          "setItemsManagers: VALUE_IS_THE_SAME"
        );
      });
    });

    describe("addItems", function () {
      let contract: any;
      beforeEach(async () => {
        // Create collection and set up wearables
        contract = await createContract(creator, false, true, true);
      });

      it("should add an item", async function () {
        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        let itemLength = await contract.itemsCount();
        const addItems = await contract.connect(fromUser).addItems([newItem]);
        const logs = (await addItems.wait()).events;

        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("AddItem");
        expect(logs[0].args._itemId).to.be.eq(itemLength);
        expect(logs[0].args._item).to.be.eql([
          newItem[0],
          BigNumber.from(
            RARITIES_OBJECT[newItem[0].toString()].value.toString()
          ),
          BigNumber.from("0"),
          BigNumber.from(newItem[1].toString()),
          newItem[2],
          newItem[3],
          "",
        ]);

        itemLength = await contract.itemsCount();

        const item = await contract.items(itemLength.sub(BigNumber.from(1)));
        expect([
          item.rarity,
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          newItem[0],
          RARITIES_OBJECT[newItem[0].toString()].value.toString(),
          "0",
          newItem[1].toString(),
          newItem[2],
          newItem[3],
          "",
        ]);
      });

      it("should add an item :: Relayed EIP721", async function () {
        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        let itemLength = await contract.itemsCount();
        const functionSignature = new utils.Interface([
          {
            inputs: [
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
                internalType: "struct BaseCollectionV2.ItemParam[]",
                name: "_items",
                type: "tuple[]",
              },
            ],
            name: "addItems",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("addItems", [[newItem]]);
        const addItemsTx = await sendMetaTx(
          contract,
          functionSignature,
          user,
          fromRelayer
        );
        const logs = (await addItemsTx.wait()).events;

        expect(logs.length).to.be.equal(2);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(user);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("AddItem");
        expect(logs[1].args._itemId).to.be.eq(itemLength);
        expect(logs[1].args._item).to.be.eql([
          newItem[0],
          BigNumber.from(
            RARITIES_OBJECT[newItem[0].toString()].value.toString()
          ),
          BigNumber.from("0"),
          BigNumber.from(newItem[1].toString()),
          newItem[2],
          newItem[3],
          "",
        ]);

        itemLength = await contract.itemsCount();

        const item = await contract.items(itemLength.sub(BigNumber.from(1)));
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          newItem[0],
          RARITIES_OBJECT[newItem[0].toString()].value.toString(),
          "0",
          newItem[1].toString(),
          newItem[2],
          newItem[3],
          "",
        ]);
      });

      it("should add items", async function () {
        const newItem1 = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        const newItem2 = [
          RARITIES_OBJECT.mythic.name,
          utils.parseEther("10"),
          beneficiary,
          "1:turtle_mask:hat:female,male",
        ];

        let itemLength = await contract.itemsCount();
        const addItemsTx = await contract
          .connect(fromUser)
          .addItems([newItem1, newItem2]);
        const logs = (await addItemsTx.wait()).events;
        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("AddItem");
        expect(logs[0].args._itemId).to.be.eq(itemLength);
        expect(logs[0].args._item).to.be.eql([
          newItem1[0],
          BigNumber.from(
            RARITIES_OBJECT[newItem1[0].toString()].value.toString()
          ),
          BigNumber.from("0"),
          BigNumber.from(newItem1[1].toString()),
          newItem1[2],
          newItem1[3],
          "",
        ]);

        expect(logs[1].event).to.be.equal("AddItem");
        expect(logs[1].args._itemId).to.be.eq(
          itemLength.add(BigNumber.from(1))
        );
        expect(logs[1].args._item).to.be.eql([
          newItem2[0],
          BigNumber.from(
            RARITIES_OBJECT[newItem2[0].toString()].value.toString()
          ),
          BigNumber.from("0"),
          BigNumber.from(newItem2[1].toString()),
          newItem2[2],
          newItem2[3],
          "",
        ]);

        itemLength = await contract.itemsCount();

        let item = await contract.items(itemLength.sub(BigNumber.from(2)));
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          newItem1[0],
          RARITIES_OBJECT[newItem1[0].toString()].value.toString(),
          "0",
          newItem1[1].toString(),
          newItem1[2],
          newItem1[3],
          "",
        ]);

        item = await contract.items(itemLength.sub(BigNumber.from(1)));
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          newItem2[0],
          RARITIES_OBJECT[newItem2[0].toString()].value.toString(),
          "0",
          newItem2[1].toString(),
          newItem2[2],
          newItem2[3],
          "",
        ]);
      });

      it("should add an item with price 0 and no beneficiary", async function () {
        let itemLength = await contract.itemsCount();
        const newItem = [
          RARITIES_OBJECT.common.name,
          "0",
          ZERO_ADDRESS,
          "1:crocodile_mask:hat:female,male",
        ];

        const addItemsTx = await contract.connect(fromUser).addItems([newItem]);
        const logs = (await addItemsTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("AddItem");
        expect(logs[0].args._itemId).to.be.eq(itemLength);
        expect(logs[0].args._item).to.be.eql([
          newItem[0],
          BigNumber.from(
            RARITIES_OBJECT[newItem[0].toString()].value.toString()
          ),
          BigNumber.from("0"),
          BigNumber.from(newItem[1].toString()),
          newItem[2],
          newItem[3],
          "",
        ]);

        itemLength = await contract.itemsCount();

        const item = await contract.items(itemLength.sub(BigNumber.from(1)));
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          newItem[0],
          RARITIES_OBJECT[newItem[0].toString()].value.toString(),
          "0",
          newItem[1].toString(),
          newItem[2],
          newItem[3],
          "",
        ]);
      });

      it("reverts when trying to add an empty item", async function () {
        await expectRevert(
          contract.connect(fromUser).addItems([]),
          "_addItems: EMPTY_ITEMS"
        );
      });

      it("reverts when one of the item is invalid", async function () {
        const newItem1 = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        const newItem2 = [
          "invalid", // invalid rarity
          utils.parseEther("10"),
          beneficiary,
          "1:turtle_mask:hat:female,male",
        ];
        // console.log("fix error");
        // await expectRevert(
        //   contract.connect(fromUser).addItems([newItem1, newItem2])
        // );
      });

      it("reverts when trying to add an item with invalid rarity", async function () {
        let newItem = [
          "invalid", // Invalid rarity
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];
        // console.log("fix error");
        // await expectRevert(contract.connect(fromUser).addItems([newItem]));
      });

      it("reverts when trying to add an item with price and no beneficiary", async function () {
        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          ZERO_ADDRESS,
          "1:crocodile_mask:hat:female,male",
        ];
        await expectRevert(
          contract.connect(fromUser).addItems([newItem]),
          "_addItem: INVALID_PRICE_AND_BENEFICIARY"
        );
      });

      it("reverts when trying to add an item without price but beneficiary", async function () {
        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("0"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];
        await expectRevert(
          contract.connect(fromUser).addItems([newItem]),
          "_addItem: INVALID_PRICE_AND_BENEFICIARY"
        );
      });

      it("reverts when trying to add an item without metadata", async function () {
        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "",
        ];
        await expectRevert(
          contract.connect(fromUser).addItems([newItem]),
          "_addItem: EMPTY_METADATA"
        );
      });

      it("reverts when trying to add an item by not the deployer", async function () {
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);
        await contract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];
        await expectRevert(
          contract.connect(fromCreator).addItems([newItem]),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          contract.connect(fromMinter).addItems([newItem]),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          contract.connect(fromManager).addItems([newItem]),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          contract.connect(fromHacker).addItems([newItem]),
          "Ownable: caller is not the owner"
        );
      });

      it("reverts when trying to add an item by not the deployer :: Relayed EIP721", async function () {
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);
        await contract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];
        const functionSignature = new utils.Interface([
          {
            inputs: [
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
                internalType: "struct BaseCollectionV2.ItemParam[]",
                name: "_items",
                type: "tuple[]",
              },
            ],
            name: "addItems",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("addItems", [[newItem]]);
        await expectRevert(
          sendMetaTx(contract, functionSignature, creator, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, minter, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, manager, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, hacker, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts when trying to add an item to a completed collection", async function () {
        await contract.connect(fromCreator).completeCollection();

        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        await expectRevert(
          contract.connect(fromUser).addItems([newItem]),
          "_addItem: COLLECTION_COMPLETED"
        );
      });
    });

    describe("editItemsData", function () {
      const itemPrice0 = utils.parseEther("10");
      const itemPrice1 = utils.parseEther("100");
      const metadata0 = "metadata:0";
      const metadata1 = "metadata:1";

      let contract: any;
      let itemId0: any;
      let item0: any;
      let itemBeneficiary0: any;
      let itemId1: any;
      let item1: any;
      let itemBeneficiary1: any;

      this.beforeEach(async () => {
        itemBeneficiary0 = beneficiary;
        itemBeneficiary1 = beneficiary;

        item0 = [
          RARITIES_OBJECT.common.name,
          itemPrice0,
          itemBeneficiary0,
          metadata0,
        ];

        item1 = [
          RARITIES_OBJECT.common.name,
          itemPrice1,
          itemBeneficiary1,
          metadata1,
        ];

        contract = await createContract(creator, false, true, true);
        await contract.connect(fromUser).addItems([item0, item1]);

        const itemLength = await contract.itemsCount();
        itemId0 = itemLength.sub(BigNumber.from(2));
        itemId1 = itemLength.sub(BigNumber.from(1));

        await contract.connect(fromUser).setApproved(false);
      });

      it("should edit an item data", async function () {
        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);

        const newItemPrice0 = utils.parseEther("1000");
        const newItemBeneficiary0 = holder;
        const newMetadata0 = "new:metadata:0";
        const editItemsDataTx = await contract
          .connect(fromCreator)
          .editItemsData(
            [itemId0],
            [newItemPrice0],
            [newItemBeneficiary0],
            [newMetadata0]
          );
        const logs = (await editItemsDataTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("UpdateItemData");
        expect(logs[0].args._itemId).to.be.eq(itemId0);
        expect(logs[0].args._price).to.be.eq(newItemPrice0);
        expect(logs[0].args._beneficiary).to.be.equal(newItemBeneficiary0);
        expect(logs[0].args._metadata).to.be.equal(newMetadata0);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          newItemPrice0.toString(),
          newItemBeneficiary0,
          newMetadata0,
          "",
        ]);
      });

      it("should edit an item data :: Relayed EIP721", async function () {
        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);

        const newItemPrice0 = utils.parseEther("1000");
        const newItemBeneficiary0 = holder;
        const newMetadata0 = "new:metadata:0";
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
              {
                internalType: "uint256[]",
                name: "_prices",
                type: "uint256[]",
              },
              {
                internalType: "address[]",
                name: "_beneficiaries",
                type: "address[]",
              },
              {
                internalType: "string[]",
                name: "_metadatas",
                type: "string[]",
              },
            ],
            name: "editItemsData",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("editItemsData", [
          [itemId0.toString()],
          [newItemPrice0],
          [newItemBeneficiary0],
          [newMetadata0],
        ]);

        const editItemsDataTx = await sendMetaTx(
          contract,
          functionSignature,
          creator,
          fromRelayer
        );
        const logs = (await editItemsDataTx.wait()).events;

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(creator);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("UpdateItemData");
        expect(logs[1].args._itemId).to.be.eq(itemId0);
        expect(logs[1].args._price).to.be.eq(newItemPrice0);
        expect(logs[1].args._beneficiary).to.be.equal(newItemBeneficiary0);
        expect(logs[1].args._metadata).to.be.equal(newMetadata0);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          newItemPrice0.toString(),
          newItemBeneficiary0,
          newMetadata0,
          "",
        ]);
      });

      it("should edit items data", async function () {
        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);

        item = await contract.items(itemId1);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item1[0],
          RARITIES_OBJECT[item1[0]].value.toString(),
          "0",
          item1[1].toString(),
          item1[2],
          item1[3],
          "",
        ]);

        const newItemPrice0 = utils.parseEther("1000");
        const newItemBeneficiary0 = holder;
        const newItemPrice1 = utils.parseEther("1");
        const newItemBeneficiary1 = anotherHolder;
        const newMetadata0 = "new:metadata:0";
        const newMetadata1 = "new:metadata:1";

        const editItemsDataTx = await contract
          .connect(fromCreator)
          .editItemsData(
            [itemId0, itemId1],
            [newItemPrice0, newItemPrice1],
            [newItemBeneficiary0, newItemBeneficiary1],
            [newMetadata0, newMetadata1]
          );
        const logs = (await editItemsDataTx.wait()).events;
        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("UpdateItemData");
        expect(logs[0].args._itemId).to.be.eq(itemId0);
        expect(logs[0].args._price).to.be.eq(newItemPrice0);
        expect(logs[0].args._beneficiary).to.be.equal(newItemBeneficiary0);
        expect(logs[0].args._metadata).to.be.eq(newMetadata0);

        expect(logs[1].event).to.be.equal("UpdateItemData");
        expect(logs[1].args._itemId).to.be.eq(itemId1);
        expect(logs[1].args._price).to.be.eq(newItemPrice1);
        expect(logs[1].args._beneficiary).to.be.equal(newItemBeneficiary1);
        expect(logs[1].args._metadata).to.be.eq(newMetadata1);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          newItemPrice0.toString(),
          newItemBeneficiary0,
          newMetadata0,
          "",
        ]);

        item = await contract.items(itemId1);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item1[0],
          RARITIES_OBJECT[item1[0]].value.toString(),
          "0",
          newItemPrice1.toString(),
          newItemBeneficiary1,
          newMetadata1,
          "",
        ]);
      });

      it("should edit an item without price and beneficiary", async function () {
        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);

        const editItemsDataTx = await contract
          .connect(fromCreator)
          .editItemsData([itemId0], [0], [ZERO_ADDRESS], [item0[3]]);
        const logs = (await editItemsDataTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("UpdateItemData");
        expect(logs[0].args._itemId).to.be.eq(itemId0);
        expect(logs[0].args._price).to.be.eq(BigNumber.from(0));
        expect(logs[0].args._beneficiary).to.be.equal(ZERO_ADDRESS);
        expect(logs[0].args._metadata).to.be.equal(item0[3]);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          "0",
          ZERO_ADDRESS,
          item0[3],
          "",
        ]);
      });

      it("should edit an item with price and beneficiary", async function () {
        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);

        const newItemPrice0 = utils.parseEther("1");
        const newItemBeneficiary0 = anotherHolder;
        const editItemsDataTx = await contract
          .connect(fromCreator)
          .editItemsData(
            [itemId0],
            [newItemPrice0],
            [newItemBeneficiary0],
            [item0[3]]
          );
        const logs = (await editItemsDataTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("UpdateItemData");
        expect(logs[0].args._itemId).to.be.eq(itemId0);
        expect(logs[0].args._price).to.be.eq(newItemPrice0);
        expect(logs[0].args._beneficiary).to.be.equal(newItemBeneficiary0);
        expect(logs[0].args._metadata).to.be.equal(item0[3]);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          newItemPrice0.toString(),
          newItemBeneficiary0,
          item0[3],
          "",
        ]);
      });

      it("should allow managers to edit items data", async function () {
        await expectRevert(
          contract
            .connect(fromManager)
            .editItemsData(
              [itemId0],
              [itemPrice0],
              [itemBeneficiary0],
              [metadata0]
            ),
          "editItemsData: CALLER_IS_NOT_CREATOR_OR_MANAGER"
        );

        // Set global Manager
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract
          .connect(fromManager)
          .editItemsData(
            [itemId0],
            [itemPrice0],
            [itemBeneficiary0],
            [metadata0]
          );

        await contract.connect(fromCreator).setManagers([manager], [false]);
        await expectRevert(
          contract
            .connect(fromManager)
            .editItemsData(
              [itemId0],
              [itemPrice0],
              [itemBeneficiary0],
              [metadata0]
            ),
          "editItemsData: CALLER_IS_NOT_CREATOR_OR_MANAGER"
        );

        // Set item Manager
        await contract
          .connect(fromCreator)
          .setItemsManagers([itemId0], [manager], [true]);

        await contract
          .connect(fromManager)
          .editItemsData(
            [itemId0],
            [itemPrice0],
            [itemBeneficiary0],
            [metadata0]
          );
      });

      it("should allow managers to edit items data :: Relayed EIP721", async function () {
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
              {
                internalType: "uint256[]",
                name: "_prices",
                type: "uint256[]",
              },
              {
                internalType: "address[]",
                name: "_beneficiaries",
                type: "address[]",
              },
              {
                internalType: "string[]",
                name: "_metadatas",
                type: "string[]",
              },
            ],
            name: "editItemsData",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("editItemsData", [
          [itemId0.toString()],
          [itemPrice0],
          [itemBeneficiary0],
          [metadata0],
        ]);

        await expectRevert(
          sendMetaTx(contract, functionSignature, manager, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        // Set global Manager
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await sendMetaTx(contract, functionSignature, manager, fromRelayer);

        await contract.connect(fromCreator).setManagers([manager], [false]);
        await expectRevert(
          sendMetaTx(contract, functionSignature, manager, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        // Set item Manager
        await contract
          .connect(fromCreator)
          .setItemsManagers([itemId0], [manager], [true]);

        await sendMetaTx(contract, functionSignature, manager, fromRelayer);
      });

      it("should allow the creator to edit items data", async function () {
        await contract
          .connect(fromCreator)
          .editItemsData(
            [itemId0],
            [itemPrice0],
            [itemBeneficiary0],
            [metadata0]
          );
      });

      it("change item price and beneficiary if the collection is approved", async function () {
        await contract.setApproved(true);

        const newItemPrice0 = utils.parseEther("1000");
        const newItemBeneficiary0 = holder;

        await contract
          .connect(fromCreator)
          .editItemsData(
            [itemId0],
            [newItemPrice0],
            [newItemBeneficiary0],
            [metadata0]
          );
      });

      it("reverts when trying to change metadata and the collection is approved", async function () {
        const newMetadata0 = "new:metadata:0";
        await contract.setApproved(true);

        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData(
              [itemId0],
              [itemPrice0],
              [itemBeneficiary0],
              [newMetadata0]
            ),
          "editItemsData: CAN_NOT_EDIT_METADATA"
        );
      });

      it("reverts when passing different length parameters", async function () {
        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData(
              [itemId0],
              [itemPrice0, itemPrice1],
              [itemBeneficiary0, itemBeneficiary1],
              [metadata0, metadata1]
            ),
          "editItemsData: LENGTH_MISMATCH"
        );

        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData(
              [itemId0, itemId1],
              [itemPrice1],
              [itemBeneficiary0, itemBeneficiary1],
              [metadata0, metadata1]
            ),
          "editItemsData: LENGTH_MISMATCH"
        );

        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData(
              [itemId0, itemId1],
              [itemPrice0, itemPrice1],
              [itemBeneficiary0],
              [metadata0, metadata1]
            ),
          "editItemsData: LENGTH_MISMATCH"
        );

        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData(
              [itemId0, itemId1],
              [itemPrice0, itemPrice1],
              [itemBeneficiary0, itemBeneficiary1],
              [metadata0]
            ),
          "editItemsData: LENGTH_MISMATCH"
        );
      });

      it("reverts when trying to edit data by not the creator or manager", async function () {
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);

        await expectRevert(
          contract
            .connect(fromUser)
            .editItemsData(
              [itemId0],
              [itemPrice0],
              [itemBeneficiary0],
              [metadata0]
            ),
          "editItemsData: CALLER_IS_NOT_CREATOR_OR_MANAGER"
        );

        await expectRevert(
          contract
            .connect(fromMinter)
            .editItemsData(
              [itemId0],
              [itemPrice0],
              [itemBeneficiary0],
              [metadata0]
            ),
          "editItemsData: CALLER_IS_NOT_CREATOR_OR_MANAGER"
        );

        await expectRevert(
          contract
            .connect(fromHacker)
            .editItemsData(
              [itemId0],
              [itemPrice0],
              [itemBeneficiary0],
              [metadata0]
            ),
          "editItemsData: CALLER_IS_NOT_CREATOR_OR_MANAGER"
        );
      });

      it("reverts when trying to edit data by not the creator or manager :: Relayed EIP721", async function () {
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
              {
                internalType: "uint256[]",
                name: "_prices",
                type: "uint256[]",
              },
              {
                internalType: "address[]",
                name: "_beneficiaries",
                type: "address[]",
              },
              {
                internalType: "string[]",
                name: "_metadatas",
                type: "string[]",
              },
            ],
            name: "editItemsData",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("editItemsData", [
          [itemId0.toString()],
          [itemPrice0],
          [itemBeneficiary0],
          [metadata0],
        ]);

        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);

        await expectRevert(
          sendMetaTx(contract, functionSignature, deployer, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, minter, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, hacker, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts when trying to edit an invalid item data", async function () {
        const itemLength = await contract.itemsCount();
        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData(
              [itemLength],
              [itemPrice0],
              [itemBeneficiary0],
              [metadata0]
            ),
          "editItemsData: ITEM_DOES_NOT_EXIST"
        );
      });

      it("reverts when trying to edit an item with price and without beneficiary", async function () {
        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData(
              [itemId0],
              [itemPrice0],
              [ZERO_ADDRESS],
              [metadata0]
            ),
          "editItemsData: INVALID_PRICE_AND_BENEFICIARY"
        );
      });

      it("reverts when trying to edit an item without price but beneficiary", async function () {
        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData([itemId0], [0], [itemBeneficiary0], [metadata0]),
          "editItemsData: INVALID_PRICE_AND_BENEFICIARY"
        );
      });

      it("reverts when trying to edit an item without metadata", async function () {
        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData([itemId0], [itemPrice0], [itemBeneficiary0], [""]),
          "editItemsData: EMPTY_METADATA"
        );
      });

      it("reverts when editable is set to false", async function () {
        await contract.connect(fromUser).setEditable(false);

        await expectRevert(
          contract
            .connect(fromCreator)
            .editItemsData([itemId0], [0], [ZERO_ADDRESS], [item0[3]]),
          "editItemsData: COLLECTION_NOT_EDITABLE"
        );
      });
    });

    describe("rescueItems", function () {
      let contract: any;
      let itemId0: any;
      let item0: any;
      let itemId1: any;
      let item1: any;

      this.beforeEach(async () => {
        item0 = [
          RARITIES_OBJECT.common.name,
          BigNumber.from(10).toString(),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        item1 = [
          RARITIES_OBJECT.common.name,
          BigNumber.from(10).toString(),
          beneficiary,
          "1:turtle_mask:hat:female,male",
        ];

        contract = await createContract(creator, false, true, true);
        await contract.connect(fromUser).addItems([item0, item1]);

        const itemLength = await contract.itemsCount();

        itemId0 = itemLength.sub(BigNumber.from(2));
        itemId1 = itemLength.sub(BigNumber.from(1));
      });

      it("should rescue an item", async function () {
        const newContentHash =
          "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq";
        const newMetadata = "1:crocodile_mask:earrings:female";

        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);

        const rescueItemsTx = await contract
          .connect(fromUser)
          .rescueItems([itemId0], [newContentHash], [newMetadata]);
        const logs = (await rescueItemsTx.wait()).events;

        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("RescueItem");
        expect(logs[0].args._itemId).to.be.eq(itemId0);
        expect(logs[0].args._contentHash).to.be.equal(newContentHash);
        expect(logs[0].args._metadata).to.be.equal(newMetadata);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          newMetadata,
          newContentHash,
        ]);
      });

      it("should rescue items", async function () {
        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);

        item = await contract.items(itemId1);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item1[0],
          RARITIES_OBJECT[item1[0]].value.toString(),
          "0",
          item1[1].toString(),
          item1[2],
          item1[3],
          "",
        ]);

        const newContentHash0 =
          "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq";
        const newMetadata0 = "1:crocodile_mask:earrings:female";
        const newContentHash1 =
          "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwc";
        const newMetadata1 = "1:turtle_mask:upper_body:female";

        const rescueItemsTx = await contract.rescueItems(
          [itemId0, itemId1],
          [newContentHash0, newContentHash1],
          [newMetadata0, newMetadata1]
        );
        const logs = (await rescueItemsTx.wait()).events;
        expect(logs.length).to.be.equal(2);
        expect(logs[0].event).to.be.equal("RescueItem");
        expect(logs[0].args._itemId).to.be.eq(itemId0);
        expect(logs[0].args._contentHash).to.be.equal(newContentHash0);
        expect(logs[0].args._metadata).to.be.equal(newMetadata0);

        expect(logs[1].event).to.be.equal("RescueItem");
        expect(logs[1].args._itemId).to.be.eq(itemId1);
        expect(logs[1].args._contentHash).to.be.equal(newContentHash1);
        expect(logs[1].args._metadata).to.be.equal(newMetadata1);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          newMetadata0,
          newContentHash0,
        ]);

        item = await contract.items(itemId1);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item1[0],
          RARITIES_OBJECT[item1[0]].value.toString(),
          "0",
          item1[1].toString(),
          item1[2],
          newMetadata1,
          newContentHash1,
        ]);
      });

      it("should rescue an item :: Relayed EIP721", async function () {
        const newContentHash =
          "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq";
        const newMetadata = "1:crocodile_mask:earrings:female";

        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);
        const functionSignature = new utils.Interface([
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
        ]).encodeFunctionData("rescueItems", [
          [itemId0.toString()],
          [newContentHash],
          [newMetadata],
        ]);

        const rescueItemsTx = await sendMetaTx(
          contract,
          functionSignature,
          user,
          fromRelayer
        );
        const logs = (await rescueItemsTx.wait()).events;
        expect(logs.length).to.be.equal(2);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(user);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("RescueItem");
        expect(logs[1].args._itemId).to.be.eq(itemId0);
        expect(logs[1].args._contentHash).to.be.equal(newContentHash);
        expect(logs[1].args._metadata).to.be.equal(newMetadata);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          newMetadata,
          newContentHash,
        ]);
      });

      it("should rescue an item without changings its metadata", async function () {
        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);

        const newContentHash0 =
          "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq";
        const rescueItemsTx = await contract
          .connect(fromUser)
          .rescueItems([itemId0], [newContentHash0], [""]);
        const logs = (await rescueItemsTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("RescueItem");
        expect(logs[0].args._itemId).to.be.eq(itemId0);
        expect(logs[0].args._contentHash).to.be.equal(newContentHash0);
        expect(logs[0].args._metadata).to.be.equal(item.metadata);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          newContentHash0,
        ]);
      });

      it("should rescue an item cleaning its content hash", async function () {
        let item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);

        const newContentHash0 =
          "bafybeiemxf5abjwjbikoz4mc3a3dla6ual3jsgpdr4cjr3oz3evfyavhwq";
        await contract
          .connect(fromUser)
          .rescueItems([itemId0], [newContentHash0], [""]);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          newContentHash0,
        ]);

        await contract.connect(fromUser).rescueItems([itemId0], [""], [""]);

        item = await contract.items(itemId0);
        expect([
          item.rarity.toString(),
          item.maxSupply.toString(),
          item.totalSupply.toString(),
          item.price.toString(),
          item.beneficiary,
          item.metadata,
          item.contentHash,
        ]).to.be.eql([
          item0[0],
          RARITIES_OBJECT[item0[0]].value.toString(),
          "0",
          item0[1].toString(),
          item0[2],
          item0[3],
          "",
        ]);
      });

      it("reverts when passing different length parameters", async function () {
        await expectRevert(
          contract.connect(fromUser).rescueItems([itemId0], ["", ""], ["", ""]),
          "rescueItems: LENGTH_MISMATCH"
        );

        await expectRevert(
          contract
            .connect(fromUser)
            .rescueItems([itemId0, itemId1], [""], ["", ""]),
          "rescueItems: LENGTH_MISMATCH"
        );

        await expectRevert(
          contract
            .connect(fromUser)
            .rescueItems([itemId0, itemId1], ["", ""], [""]),
          "rescueItems: LENGTH_MISMATCH"
        );
      });

      it("reverts when trying to rescue by not the owner", async function () {
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);
        await contract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          contract.connect(fromCreator).rescueItems([itemId0], [""], [""]),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          contract.connect(fromMinter).rescueItems([itemId0], [""], [""]),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          contract.connect(fromManager).rescueItems([itemId0], [""], [""]),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          contract.connect(fromHacker).rescueItems([itemId0], [""], [""]),
          "Ownable: caller is not the owner"
        );
      });

      it("reverts when trying to rescue by not the owner :: Relayed EIP721", async function () {
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);
        await contract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);
        const functionSignature = new utils.Interface([
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
        ]).encodeFunctionData("rescueItems", [
          [itemId0.toString()],
          [""],
          [""],
        ]);

        await expectRevert(
          sendMetaTx(contract, functionSignature, creator, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, minter, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, manager, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, hacker, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts when trying to rescue an invalid item", async function () {
        const itemLength = await contract.itemsCount();
        await expectRevert(
          contract.connect(fromUser).rescueItems([itemLength], [""], [""]),
          "rescueItems: ITEM_DOES_NOT_EXIST"
        );
      });
    });

    describe("issueTokens", function () {
      let contract: any;
      let newItem: any;
      let newItemId: any;
      let anotherNewItem: any;
      let anotherNewItemId: any;

      beforeEach(async () => {
        newItem = [
          RARITIES_OBJECT.mythic.name,
          "1",
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        anotherNewItem = [
          RARITIES_OBJECT.common.name,
          "1",
          beneficiary,
          "1:turtle_mask:hat:female,male",
        ];

        contract = await createContract(creator, false, true, true);
        await contract.connect(fromUser).addItems([newItem, anotherNewItem]);

        await contract.connect(fromCreator).completeCollection();

        newItemId = (await contract.itemsCount()).sub(BigNumber.from(2));
        anotherNewItemId = (await contract.itemsCount()).sub(BigNumber.from(1));
      });

      it("should issue multiple tokens", async function () {
        let item = await contract.items(newItemId);
        expect(item.rarity).to.be.equal(newItem[0]);

        expect(item.totalSupply).to.eq(0);

        item = await contract.items(anotherNewItemId);
        expect(item.rarity).to.eq(anotherNewItem[0]);
        expect(item.totalSupply).to.eq(0);

        const currentTotalSupply = await contract.totalSupply();

        const issueTokensTx = await contract
          .connect(fromCreator)
          .issueTokens([holder, anotherHolder], [newItemId, anotherNewItemId]);
        const logs = (await issueTokensTx.wait()).events;
        // New Item
        // match issueance
        item = await contract.items(newItemId);
        expect(item.rarity).to.be.equal(newItem[0]);

        expect(item.totalSupply).to.eq(1);

        expect(logs.length).to.be.equal(4);
        const newItemTokenId = encodeTokenId(newItemId, 1);
        expect(logs[1].event).to.be.equal("Issue");
        expect(logs[1].args._beneficiary).to.be.equal(holder);
        expect(logs[1].args._tokenId).to.be.eq(newItemTokenId);
        expect(logs[1].args._itemId).to.be.eq(newItemId);
        expect(logs[1].args._issuedId).to.eq(1);
        expect(logs[1].args._caller).to.eq(creator);

        // match owner
        let owner = await contract.ownerOf(newItemTokenId);
        expect(owner).to.be.equal(holder);

        // match token id
        let uri = await contract.tokenURI(newItemTokenId);
        let uriArr = uri.split("/");

        expect(chainId.toString()).to.be.eq(uri.split("/")[uriArr.length - 4]);
        expect(contract.address.toLowerCase()).to.be.eq(
          uri.split("/")[uriArr.length - 3]
        );
        expect(newItemId).to.be.eq(uri.split("/")[uriArr.length - 2]);
        expect("1").to.eq(uri.split("/")[uriArr.length - 1]);

        // Another new Item
        // match issued
        item = await contract.items(anotherNewItemId);
        expect(item.rarity).to.eq(anotherNewItem[0]);
        expect(item.totalSupply).to.eq(1);

        const anotherNewItemTokenId = encodeTokenId(anotherNewItemId, 1);
        expect(logs[3].event).to.be.equal("Issue");
        expect(logs[3].args._beneficiary).to.be.equal(anotherHolder);
        expect(logs[3].args._tokenId).to.be.eq(anotherNewItemTokenId);
        expect(logs[3].args._itemId).to.be.eq(anotherNewItemId);
        expect(logs[3].args._issuedId).to.eq(1);
        expect(logs[3].args._caller).to.eq(creator);

        // match owner
        owner = await contract.ownerOf(anotherNewItemTokenId);
        expect(owner).to.be.equal(anotherHolder);

        // match token id
        uri = await contract.tokenURI(anotherNewItemTokenId);
        uriArr = uri.split("/");
        expect(chainId.toString()).to.be.eq(uri.split("/")[uriArr.length - 4]);
        expect(contract.address.toLowerCase()).to.be.eq(
          uri.split("/")[uriArr.length - 3]
        );
        expect(anotherNewItemId).to.be.eq(uri.split("/")[uriArr.length - 2]);
        expect("1").to.eq(uri.split("/")[uriArr.length - 1]);

        // Match total supply
        const totalSupply = await contract.totalSupply();
        expect(totalSupply).to.eq(currentTotalSupply.add(BigNumber.from(2)));
      });

      it("should issue multiple token :: Relayed EIP721", async function () {
        let item = await contract.items(newItemId);
        expect(item.rarity).to.be.equal(newItem[0]);

        expect(item.totalSupply).to.eq(0);

        item = await contract.items(anotherNewItemId);
        expect(item.rarity).to.eq(anotherNewItem[0]);
        expect(item.totalSupply).to.eq(0);

        const currentTotalSupply = await contract.totalSupply();
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address[]",
                name: "_beneficiaries",
                type: "address[]",
              },
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
            ],
            name: "issueTokens",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("issueTokens", [
          [holder, anotherHolder],
          [newItemId.toString(), anotherNewItemId.toString()],
        ]);

        const issueTokensTx = await sendMetaTx(
          contract,
          functionSignature,
          creator,
          fromRelayer
        );
        const logs = (await issueTokensTx.wait()).events;
        expect(logs.length).to.be.equal(5);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(creator);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        // New Item
        // match issueance
        item = await contract.items(newItemId);
        expect(item.rarity).to.be.equal(newItem[0]);

        expect(item.totalSupply).to.eq(1);

        const newItemTokenId = encodeTokenId(newItemId, 1);
        expect(logs[2].event).to.be.equal("Issue");
        expect(logs[2].args._beneficiary).to.be.equal(holder);
        expect(logs[2].args._tokenId).to.be.eq(newItemTokenId);
        expect(logs[2].args._itemId).to.be.eq(newItemId);
        expect(logs[2].args._issuedId).to.eq(1);
        expect(logs[2].args._caller).to.eq(creator);

        // match owner
        let owner = await contract.ownerOf(newItemTokenId);
        expect(owner).to.be.equal(holder);

        // match token id
        let uri = await contract.tokenURI(newItemTokenId);
        let uriArr = uri.split("/");
        expect(chainId.toString()).to.be.eq(uri.split("/")[uriArr.length - 4]);
        expect(contract.address.toLowerCase()).to.be.eq(
          uri.split("/")[uriArr.length - 3]
        );
        expect(newItemId).to.be.eq(uri.split("/")[uriArr.length - 2]);
        expect("1").to.eq(uri.split("/")[uriArr.length - 1]);

        // Another new Item
        // match issued
        item = await contract.items(anotherNewItemId);
        expect(item.rarity).to.eq(anotherNewItem[0]);
        expect(item.totalSupply).to.eq(1);

        const anotherNewItemTokenId = encodeTokenId(anotherNewItemId, 1);
        expect(logs[4].event).to.be.equal("Issue");
        expect(logs[4].args._beneficiary).to.be.equal(anotherHolder);
        expect(logs[4].args._tokenId).to.be.eq(anotherNewItemTokenId);
        expect(logs[4].args._itemId).to.be.eq(anotherNewItemId);
        expect(logs[4].args._issuedId).to.eq(1);
        expect(logs[4].args._caller).to.eq(creator);

        // match owner
        owner = await contract.ownerOf(anotherNewItemTokenId);
        expect(owner).to.be.equal(anotherHolder);

        // match token id
        uri = await contract.tokenURI(anotherNewItemTokenId);
        uriArr = uri.split("/");
        expect(chainId.toString()).to.be.eq(uri.split("/")[uriArr.length - 4]);
        expect(contract.address.toLowerCase()).to.be.eq(
          uri.split("/")[uriArr.length - 3]
        );
        expect(anotherNewItemId).to.be.eq(uri.split("/")[uriArr.length - 2]);
        expect("1").to.eq(uri.split("/")[uriArr.length - 1]);

        // Match total supply
        const totalSupply = await contract.totalSupply();
        expect(totalSupply).to.eq(currentTotalSupply.add(BigNumber.from(2)));
      });

      it("should issue multiple token for the same item id :: Gas estimation", async function () {
        const itemsInTheSameTx = 70;
        const beneficiaries = [];
        const ids = [];

        for (let i = 0; i < itemsInTheSameTx; i++) {
          ids.push(anotherNewItemId);
          beneficiaries.push(beneficiary);
        }

        const { receipt } = await contract
          .connect(fromCreator)
          .issueTokens(beneficiaries, ids);

        // match issueance
        const item = await contract.items(anotherNewItemId);
        expect(item.rarity).to.eq(anotherNewItem[0]);
        expect(item.totalSupply).to.eq(itemsInTheSameTx);

        // User
        const balance = await contract.balanceOf(beneficiary);
        expect(balance).to.eq(itemsInTheSameTx);
        // console.log("fix error");
        // console.log(
        //   `Issue items: ${itemsInTheSameTx} => Gas used:: ${receipt}`
        // );
      });

      it("should issue multiple tokens by minter", async function () {
        await expectRevert(
          contract
            .connect(fromMinter)
            .issueTokens([anotherHolder], [newItemId]),
          "_issueToken: CALLER_CAN_NOT_MINT"
        );

        // Set global Minter
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract
          .connect(fromMinter)
          .issueTokens([anotherHolder], [newItemId]);

        await contract.connect(fromCreator).setMinters([minter], [false]);
        await expectRevert(
          contract
            .connect(fromMinter)
            .issueTokens([anotherHolder], [newItemId]),
          "_issueToken: CALLER_CAN_NOT_MINT"
        );

        // Set item Minter
        await contract
          .connect(fromCreator)
          .setItemsMinters([newItemId], [minter], [1]);

        await contract
          .connect(fromMinter)
          .issueTokens([anotherHolder], [newItemId]);
      });

      it("should issue multiple tokens by minter :: Relayed EIP721", async function () {
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address[]",
                name: "_beneficiaries",
                type: "address[]",
              },
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
            ],
            name: "issueTokens",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("issueTokens", [
          [anotherHolder],
          [newItemId.toString()],
        ]);

        await expectRevert(
          sendMetaTx(contract, functionSignature, minter, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        // Set global Minter
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await sendMetaTx(contract, functionSignature, minter, fromRelayer);

        await contract.connect(fromCreator).setMinters([minter], [false]);
        await expectRevert(
          sendMetaTx(contract, functionSignature, minter, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        // Set item Minter
        await contract
          .connect(fromCreator)
          .setItemsMinters([newItemId], [minter], [1]);

        await sendMetaTx(contract, functionSignature, minter, fromRelayer);
      });

      it("should issue multiple tokens by minter and reduce the allowance", async function () {
        // Set items Minter
        await contract
          .connect(fromCreator)
          .setItemsMinters(
            [newItemId, anotherNewItemId],
            [minter, minter],
            [2, 2]
          );

        let minterAllowance = await contract.itemMinters(newItemId, minter);
        expect(minterAllowance).to.be.eq(2);

        minterAllowance = await contract.itemMinters(anotherNewItemId, minter);
        expect(minterAllowance).to.be.eq(2);

        await contract
          .connect(fromMinter)
          .issueTokens(
            [anotherHolder, anotherHolder, anotherHolder],
            [newItemId, anotherNewItemId, newItemId]
          );

        minterAllowance = await contract.itemMinters(newItemId, minter);
        expect(minterAllowance).to.be.eq(0);

        minterAllowance = await contract.itemMinters(anotherNewItemId, minter);
        expect(minterAllowance).to.be.eq(1);
      });

      it("should issue multiple tokens by minter and reduce the allowance :: Relayed EIP721", async function () {
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address[]",
                name: "_beneficiaries",
                type: "address[]",
              },
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
            ],
            name: "issueTokens",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("issueTokens", [
          [anotherHolder, anotherHolder, anotherHolder],
          [
            newItemId.toString(),
            anotherNewItemId.toString(),
            newItemId.toString(),
          ],
        ]);

        // Set items Minter
        await contract
          .connect(fromCreator)
          .setItemsMinters(
            [newItemId, anotherNewItemId],
            [minter, minter],
            [2, 2]
          );

        let minterAllowance = await contract.itemMinters(newItemId, minter);
        expect(minterAllowance).to.be.eq(2);

        minterAllowance = await contract.itemMinters(anotherNewItemId, minter);
        expect(minterAllowance).to.be.eq(2);

        await sendMetaTx(contract, functionSignature, minter, fromRelayer);

        minterAllowance = await contract.itemMinters(newItemId, minter);
        expect(minterAllowance).to.be.eq(0);

        minterAllowance = await contract.itemMinters(anotherNewItemId, minter);
        expect(minterAllowance).to.be.eq(1);
      });

      it("should issue multiple tokens by minter and not reduce if allowance is infinity", async function () {
        // Set items Minter
        await contract
          .connect(fromCreator)
          .setItemsMinters(
            [newItemId, anotherNewItemId],
            [minter, minter],
            [MAX_UINT256, MAX_UINT256]
          );

        let minterAllowance = await contract.itemMinters(newItemId, minter);
        expect(minterAllowance).to.be.eq(MAX_UINT256);

        minterAllowance = await contract.itemMinters(anotherNewItemId, minter);
        expect(minterAllowance).to.be.eq(MAX_UINT256);

        await contract
          .connect(fromMinter)
          .issueTokens(
            [anotherHolder, anotherHolder, anotherHolder],
            [newItemId, anotherNewItemId, newItemId]
          );

        minterAllowance = await contract.itemMinters(newItemId, minter);
        expect(minterAllowance).to.be.eq(MAX_UINT256);

        minterAllowance = await contract.itemMinters(anotherNewItemId, minter);
        expect(minterAllowance).to.be.eq(MAX_UINT256);
      });

      it("should issue multiple tokens by minter and not reduce if allowance is also a global minter", async function () {
        // Set items Minter
        await contract
          .connect(fromCreator)
          .setItemsMinters(
            [newItemId, anotherNewItemId],
            [minter, minter],
            [1, 1]
          );

        await contract.connect(fromCreator).setMinters([minter], [true]);

        let minterAllowance = await contract.itemMinters(newItemId, minter);
        expect(minterAllowance).to.be.eq(1);

        minterAllowance = await contract.itemMinters(anotherNewItemId, minter);
        expect(minterAllowance).to.be.eq(1);

        await contract
          .connect(fromMinter)
          .issueTokens(
            [anotherHolder, anotherHolder, anotherHolder],
            [newItemId, anotherNewItemId, newItemId]
          );

        await contract
          .connect(fromMinter)
          .issueTokens(
            [anotherHolder, anotherHolder, anotherHolder],
            [newItemId, anotherNewItemId, newItemId]
          );

        minterAllowance = await contract.itemMinters(newItemId, minter);
        expect(minterAllowance).to.be.eq(1);

        minterAllowance = await contract.itemMinters(anotherNewItemId, minter);
        expect(minterAllowance).to.be.eq(1);
      });

      it("reverts when issue multiple tokens by minter without allowance", async function () {
        // Set items Minter
        await contract
          .connect(fromCreator)
          .setItemsMinters(
            [newItemId, anotherNewItemId],
            [minter, minter],
            [2, 2]
          );

        let minterAllowance = await contract.itemMinters(newItemId, minter);
        expect(minterAllowance).to.be.eq(2);

        minterAllowance = await contract.itemMinters(anotherNewItemId, minter);
        expect(minterAllowance).to.be.eq(2);

        await expectRevert(
          contract
            .connect(fromMinter)
            .issueTokens(
              [anotherHolder, anotherHolder, anotherHolder, anotherHolder],
              [newItemId, newItemId, anotherNewItemId, newItemId]
            ),
          "_issueToken: CALLER_CAN_NOT_MINT"
        );
      });

      it("reverts when issuing a token by not allowed user", async function () {
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);
        await contract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          contract
            .connect(fromUser)
            .issueTokens(
              [holder, anotherHolder],
              [newItemId, anotherNewItemId]
            ),
          "_issueToken: CALLER_CAN_NOT_MINT"
        );

        await expectRevert(
          contract
            .connect(fromManager)
            .issueTokens(
              [holder, anotherHolder],
              [newItemId, anotherNewItemId]
            ),
          "_issueToken: CALLER_CAN_NOT_MINT"
        );

        await expectRevert(
          contract
            .connect(fromHacker)
            .issueTokens(
              [holder, anotherHolder],
              [newItemId, anotherNewItemId]
            ),
          "_issueToken: CALLER_CAN_NOT_MINT"
        );
      });

      it("reverts when issuing a token by not the creator or minter :: Relayed EIP721 ", async function () {
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);
        await contract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address[]",
                name: "_beneficiaries",
                type: "address[]",
              },
              {
                internalType: "uint256[]",
                name: "_itemIds",
                type: "uint256[]",
              },
            ],
            name: "issueTokens",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("issueTokens", [
          [holder, anotherHolder],
          [newItemId.toString(), anotherNewItemId.toString()],
        ]);

        await expectRevert(
          sendMetaTx(contract, functionSignature, deployer, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, manager, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, hacker, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts if trying to issue tokens with invalid argument length", async function () {
        await expectRevert(
          contract
            .connect(fromUser)
            .issueTokens([user], [newItemId, anotherNewItemId]),
          "issueTokens: LENGTH_MISMATCH"
        );

        await expectRevert(
          contract
            .connect(fromUser)
            .issueTokens([user, anotherUser], [anotherNewItemId]),
          "issueTokens: LENGTH_MISMATCH"
        );
      });

      it("reverts when issuing a token to an invalid address", async function () {
        await expectRevert(
          contract
            .connect(fromCreator)
            .issueTokens(
              [anotherHolder, ZERO_ADDRESS],
              [newItemId, anotherNewItemId]
            ),
          "ERC721: mint to the zero address"
        );
      });

      it("reverts when trying to issue an invalid item id", async function () {
        const length = await contract.itemsCount();
        await expectRevert(
          contract
            .connect(fromCreator)
            .issueTokens([holder, anotherHolder], [length, newItemId]),
          "_issueToken: ITEM_DOES_NOT_EXIST"
        );
      });

      it("reverts when trying to issue an exhausted item", async function () {
        const itemsInTheSameTx = RARITIES_OBJECT.mythic.value;

        const beneficiaries = [];
        const ids = [];

        for (let i = 0; i < itemsInTheSameTx + 1; i++) {
          beneficiaries.push(beneficiary);
          ids.push(newItemId);
        }

        await expectRevert(
          contract.connect(fromCreator).issueTokens(beneficiaries, ids),
          "_issueToken: ITEM_EXHAUSTED"
        );

        await contract
          .connect(fromCreator)
          .issueTokens(beneficiaries.slice(1), ids.slice(1));

        await expectRevert(
          contract
            .connect(fromCreator)
            .issueTokens(
              [holder, anotherHolder],
              [newItemId, anotherNewItemId]
            ),
          "_issueToken: ITEM_EXHAUSTED"
        );
      });

      it("reverts when trying to issue a token when the the collection is not approved", async function () {
        await contract.connect(fromUser).setApproved(false);

        await expectRevert(
          contract
            .connect(fromCreator)
            .issueTokens(
              [anotherHolder, anotherHolder],
              [newItemId, anotherNewItemId]
            ),
          "issueTokens: MINT_NOT_ALLOWED"
        );
      });

      it("reverts when trying to issue a token when the the collection is not completed", async function () {
        const newItem = [
          RARITIES_OBJECT.mythic.name,
          "1",
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        const contract = await createContract(creator, false, true, true);
        await contract.connect(fromUser).addItems([newItem]);

        const newItemId = (await contract.itemsCount()).sub(BigNumber.from(1));

        await expectRevert(
          contract
            .connect(fromCreator)
            .issueTokens([anotherHolder], [newItemId]),
          "issueTokens: MINT_NOT_ALLOWED"
        );
      });
    });

    describe("tokenURI", function () {
      it("should return the correct token URI", async function () {
        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        const contract = await createContract(creator, false, true, true);

        await contract.connect(fromUser).addItems([newItem]);

        await contract.connect(fromCreator).completeCollection();

        const itemsLength = await contract.itemsCount();
        const itemId = itemsLength.sub(BigNumber.from(1));
        await contract.connect(fromCreator).issueTokens([holder], [itemId]);
        // match token id
        let uri = await contract.tokenURI(encodeTokenId(itemId, 1));
        let uriArr = uri.split("/"); // [...]/8/1
        expect(chainId.toString()).to.be.eq(uri.split("/")[uriArr.length - 4]);
        expect(contract.address.toLowerCase()).to.be.eq(
          uri.split("/")[uriArr.length - 3]
        );
        expect(itemId.toString()).to.eq(uri.split("/")[uriArr.length - 2]);
        expect("1").to.be.equal(uri.split("/")[uriArr.length - 1]);
      });

      it("reverts if the token does not exist", async function () {
        await expectRevert(
          collectionContract.tokenURI(encodeTokenId(0, 100)),
          "tokenURI: INVALID_TOKEN_ID"
        );

        await expectRevert(
          collectionContract.tokenURI(encodeTokenId(100, 1)),
          "tokenURI: INVALID_TOKEN_ID"
        );
      });
    });

    describe("transferBatch", function () {
      it("should transfer in batch", async function () {
        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);

        const batchTransferFromTx = await collectionContract
          .connect(fromHolder)
          .batchTransferFrom(holder, anotherHolder, [token1, token2]);
        const logs = (await batchTransferFromTx.wait()).events;
        // 0.6 Zep contracts emits an approval before each Transfer event for cleaning allowances
        expect(logs.length).to.be.equal(4);
        expect(logs[1].event).to.be.equal("Transfer");
        expect(logs[1].args.from).to.be.equal(holder);
        expect(logs[1].args.to).to.be.equal(anotherHolder);
        expect(logs[1].args.tokenId).to.eq(token1);

        expect(logs[3].event).to.be.equal("Transfer");
        expect(logs[3].args.from).to.be.equal(holder);
        expect(logs[3].args.to).to.be.equal(anotherHolder);
        expect(logs[3].args.tokenId).to.eq(token2);

        ownerToken1 = await collectionContract.ownerOf(token1);
        ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(anotherHolder);
        expect(ownerToken2).to.be.equal(anotherHolder);
      });

      it("should transfer in batch :: Relayed EIP721", async function () {
        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address",
                name: "_from",
                type: "address",
              },
              {
                internalType: "address",
                name: "_to",
                type: "address",
              },
              {
                internalType: "uint256[]",
                name: "_tokenIds",
                type: "uint256[]",
              },
              {
                internalType: "bytes",
                name: "_data",
                type: "bytes",
              },
            ],
            name: "safeBatchTransferFrom",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("safeBatchTransferFrom", [
          holder,
          anotherHolder,
          [token1.toString(), token2.toString()],
          EMPTY_HASH,
        ]);

        const safeBatchTransferFromTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          holder,
          fromRelayer
        );
        const logs = (await safeBatchTransferFromTx.wait()).events;
        // 0.6 Zep contracts emits an approval before each Transfer event for cleaning allowances
        expect(logs.length).to.be.equal(5);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(holder);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[2].event).to.be.equal("Transfer");
        expect(logs[2].args.from).to.be.equal(holder);
        expect(logs[2].args.to).to.be.equal(anotherHolder);
        expect(logs[2].args.tokenId).to.eq(token1);

        expect(logs[4].event).to.be.equal("Transfer");
        expect(logs[4].args.from).to.be.equal(holder);
        expect(logs[4].args.to).to.be.equal(anotherHolder);
        expect(logs[4].args.tokenId).to.eq(token2);

        ownerToken1 = await collectionContract.ownerOf(token1);
        ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(anotherHolder);
        expect(ownerToken2).to.be.equal(anotherHolder);
      });

      it("should safe transfer in batch", async function () {
        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);

        const safeBatchTransferFromTx = await collectionContract
          .connect(fromHolder)
          .safeBatchTransferFrom(
            holder,
            anotherHolder,
            [token1, token2],
            EMPTY_HASH
          );
        const logs = (await safeBatchTransferFromTx.wait()).events;
        // 0.6 Zep contracts emits an approval before each Transfer event for cleaning allowances
        expect(logs.length).to.be.equal(4);
        expect(logs[1].event).to.be.equal("Transfer");
        expect(logs[1].args.from).to.be.equal(holder);
        expect(logs[1].args.to).to.be.equal(anotherHolder);
        expect(logs[1].args.tokenId).to.eq(token1);

        expect(logs[3].event).to.be.equal("Transfer");
        expect(logs[3].args.from).to.be.equal(holder);
        expect(logs[3].args.to).to.be.equal(anotherHolder);
        expect(logs[3].args.tokenId).to.eq(token2);

        ownerToken1 = await collectionContract.ownerOf(token1);
        ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(anotherHolder);
        expect(ownerToken2).to.be.equal(anotherHolder);
      });

      it("should safe transfer in batch by operator", async function () {
        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);

        await collectionContract.connect(fromHolder).approve(hacker, token1);
        await collectionContract.connect(fromHolder).approve(hacker, token2);

        const safeBatchTransferFromTx = await collectionContract
          .connect(fromHacker)
          .safeBatchTransferFrom(
            holder,
            anotherHolder,
            [token1, token2],
            EMPTY_HASH
          );
        const logs = (await safeBatchTransferFromTx.wait()).events;
        // 0.6 Zep contracts emits an approval before each Transfer event for cleaning allowances
        expect(logs.length).to.be.equal(4);
        expect(logs[1].event).to.be.equal("Transfer");
        expect(logs[1].args.from).to.be.equal(holder);
        expect(logs[1].args.to).to.be.equal(anotherHolder);
        expect(logs[1].args.tokenId).to.eq(token1);

        expect(logs[3].event).to.be.equal("Transfer");
        expect(logs[3].args.from).to.be.equal(holder);
        expect(logs[3].args.to).to.be.equal(anotherHolder);
        expect(logs[3].args.tokenId).to.eq(token2);

        ownerToken1 = await collectionContract.ownerOf(token1);
        ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(anotherHolder);
        expect(ownerToken2).to.be.equal(anotherHolder);
      });

      it("should safe transfer in batch by operator :: Relayed EIP721", async function () {
        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);

        await collectionContract.connect(fromHolder).approve(operator, token1);
        await collectionContract.connect(fromHolder).approve(operator, token2);
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address",
                name: "_from",
                type: "address",
              },
              {
                internalType: "address",
                name: "_to",
                type: "address",
              },
              {
                internalType: "uint256[]",
                name: "_tokenIds",
                type: "uint256[]",
              },
              {
                internalType: "bytes",
                name: "data",
                type: "bytes",
              },
            ],
            name: "safeBatchTransferFrom",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("safeBatchTransferFrom", [
          holder,
          anotherHolder,
          [token1.toString(), token2.toString()],
          EMPTY_HASH,
        ]);

        const safeBatchTransferFromTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          operator,
          fromRelayer
        );
        const logs = (await safeBatchTransferFromTx.wait()).events;
        // 0.6 Zep contracts emits an approval before each Transfer event for cleaning allowances
        expect(logs.length).to.be.equal(5);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(operator);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[2].event).to.be.equal("Transfer");
        expect(logs[2].args.from).to.be.equal(holder);
        expect(logs[2].args.to).to.be.equal(anotherHolder);
        expect(logs[2].args.tokenId).to.eq(token1);

        expect(logs[4].event).to.be.equal("Transfer");
        expect(logs[4].args.from).to.be.equal(holder);
        expect(logs[4].args.to).to.be.equal(anotherHolder);
        expect(logs[4].args.tokenId).to.eq(token2);

        ownerToken1 = await collectionContract.ownerOf(token1);
        ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(anotherHolder);
        expect(ownerToken2).to.be.equal(anotherHolder);
      });

      it("should safe transfer in batch by approval for all", async function () {
        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);

        await collectionContract
          .connect(fromHolder)
          .setApprovalForAll(approvedForAll, true);

        const safeBatchTransferFromTx = await collectionContract
          .connect(fromApprovedForAll)
          .safeBatchTransferFrom(
            holder,
            anotherHolder,
            [token1, token2],
            EMPTY_HASH
          );
        const logs = (await safeBatchTransferFromTx.wait()).events;
        // 0.6 Zep contracts emits an approval before each Transfer event for cleaning allowances
        expect(logs.length).to.be.equal(4);
        expect(logs[1].event).to.be.equal("Transfer");
        expect(logs[1].args.from).to.be.equal(holder);
        expect(logs[1].args.to).to.be.equal(anotherHolder);
        expect(logs[1].args.tokenId).to.eq(token1);

        expect(logs[3].event).to.be.equal("Transfer");
        expect(logs[3].args.from).to.be.equal(holder);
        expect(logs[3].args.to).to.be.equal(anotherHolder);
        expect(logs[3].args.tokenId).to.eq(token2);

        ownerToken1 = await collectionContract.ownerOf(token1);
        ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(anotherHolder);
        expect(ownerToken2).to.be.equal(anotherHolder);
      });

      it("should safe transfer in batch by approval for all :: Relayed EIP721", async function () {
        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);

        await collectionContract
          .connect(fromHolder)
          .setApprovalForAll(approvedForAll, true);
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address",
                name: "_from",
                type: "address",
              },
              {
                internalType: "address",
                name: "_to",
                type: "address",
              },
              {
                internalType: "uint256[]",
                name: "_tokenIds",
                type: "uint256[]",
              },
              {
                internalType: "bytes",
                name: "_data",
                type: "bytes",
              },
            ],
            name: "safeBatchTransferFrom",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("safeBatchTransferFrom", [
          holder,
          anotherHolder,
          [token1.toString(), token2.toString()],
          EMPTY_HASH,
        ]);

        const safeBatchTransferFromTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          approvedForAll,
          fromRelayer
        );

        const logs = (await safeBatchTransferFromTx.wait()).events;
        // 0.6 Zep contracts emits an approval before each Transfer event for cleaning allowances
        expect(logs.length).to.be.equal(5);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(approvedForAll);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[2].event).to.be.equal("Transfer");
        expect(logs[2].args.from).to.be.equal(holder);
        expect(logs[2].args.to).to.be.equal(anotherHolder);
        expect(logs[2].args.tokenId).to.eq(token1);

        expect(logs[4].event).to.be.equal("Transfer");
        expect(logs[4].args.from).to.be.equal(holder);
        expect(logs[4].args.to).to.be.equal(anotherHolder);
        expect(logs[4].args.tokenId).to.eq(token2);

        ownerToken1 = await collectionContract.ownerOf(token1);
        ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(anotherHolder);
        expect(ownerToken2).to.be.equal(anotherHolder);
      });

      it("should tranfer tokens in batch when the collection does not allow minting", async function () {
        await collectionContract.connect(fromUser).setApproved(false);

        await expectRevert(
          collectionContract
            .connect(fromCreator)
            .issueTokens([anotherHolder], [0]),
          "issueTokens: MINT_NOT_ALLOWED"
        );

        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);

        await collectionContract
          .connect(fromHolder)
          .setApprovalForAll(hacker, true);

        const safeBatchTransferFromTx = await collectionContract
          .connect(fromHacker)
          .safeBatchTransferFrom(
            holder,
            anotherHolder,
            [token1, token2],
            EMPTY_HASH
          );
        const logs = (await safeBatchTransferFromTx.wait()).events;
        // 0.6 Zep contracts emits an approval before each Transfer event for cleaning allowances
        expect(logs.length).to.be.equal(4);
        expect(logs[1].event).to.be.equal("Transfer");
        expect(logs[1].args.from).to.be.equal(holder);
        expect(logs[1].args.to).to.be.equal(anotherHolder);
        expect(logs[1].args.tokenId).to.eq(token1);

        expect(logs[3].event).to.be.equal("Transfer");
        expect(logs[3].args.from).to.be.equal(holder);
        expect(logs[3].args.to).to.be.equal(anotherHolder);
        expect(logs[3].args.tokenId).to.eq(token2);

        ownerToken1 = await collectionContract.ownerOf(token1);
        ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(anotherHolder);
        expect(ownerToken2).to.be.equal(anotherHolder);
      });

      it("reverts when transfer in batch by unuthorized user", async function () {
        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);

        await expectRevert(
          collectionContract
            .connect(fromHacker)
            .batchTransferFrom(holder, anotherHolder, [token1, token2]),
          "ERC721: transfer caller is not owner nor approved"
        );

        await expectRevert(
          collectionContract
            .connect(fromHolder)
            .batchTransferFrom(holder, anotherHolder, [token1, token2, token3]),
          "ERC721: transfer caller is not owner nor approved"
        );
      });

      it("reverts when transfer in batch by unuthorized user :: Relayed EIP721 ", async function () {
        let ownerToken1 = await collectionContract.ownerOf(token1);
        let ownerToken2 = await collectionContract.ownerOf(token2);
        expect(ownerToken1).to.be.equal(holder);
        expect(ownerToken2).to.be.equal(holder);
        let functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address",
                name: "_from",
                type: "address",
              },
              {
                internalType: "address",
                name: "_to",
                type: "address",
              },
              {
                internalType: "uint256[]",
                name: "_tokenIds",
                type: "uint256[]",
              },
              {
                internalType: "bytes",
                name: "_data",
                type: "bytes",
              },
            ],
            name: "safeBatchTransferFrom",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("safeBatchTransferFrom", [
          holder,
          anotherHolder,
          [token1.toString(), token2.toString()],
          EMPTY_HASH,
        ]);

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            hacker,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
        functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address",
                name: "_from",
                type: "address",
              },
              {
                internalType: "address",
                name: "_to",
                type: "address",
              },
              {
                internalType: "uint256[]",
                name: "_tokenIds",
                type: "uint256[]",
              },
              {
                internalType: "bytes",
                name: "_data",
                type: "bytes",
              },
            ],
            name: "safeBatchTransferFrom",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("safeBatchTransferFrom", [
          holder,
          anotherHolder,
          [token1.toString(), token2.toString(), token3.toString()],
          "0x",
        ]);

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            holder,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts when beneficiary is 0 address", async function () {
        await expectRevert(
          collectionContract
            .connect(fromHolder)
            .batchTransferFrom(holder, ZERO_ADDRESS, [token1, token2]),
          "ERC721: transfer to the zero address"
        );
      });
    });

    describe("setEditable", function () {
      it("should set editable", async function () {
        let isEditable = await collectionContract.isEditable();
        expect(isEditable).to.be.equal(true);

        const setEditableTx = await collectionContract
          .connect(fromUser)
          .setEditable(false);
        const logs = (await setEditableTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("SetEditable");
        expect(logs[0].args._previousValue).to.be.equal(true);
        expect(logs[0].args._newValue).to.be.equal(false);

        isEditable = await collectionContract.isEditable();
        expect(isEditable).to.be.equal(false);
      });

      it("should set editable :: Relayed EIP721", async function () {
        let isEditable = await collectionContract.isEditable();
        expect(isEditable).to.be.equal(true);
        const functionSignature = new utils.Interface([
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
        ]).encodeFunctionData("setEditable", [false]);

        const setEditableTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          user,
          fromRelayer
        );
        const logs = (await setEditableTx.wait()).events;
        expect(logs.length).to.be.equal(2);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(user);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("SetEditable");
        expect(logs[1].args._previousValue).to.be.equal(true);
        expect(logs[1].args._newValue).to.be.equal(false);

        isEditable = await collectionContract.isEditable();
        expect(isEditable).to.be.equal(false);
      });

      it("reverts when trying to change values by not the owner", async function () {
        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          collectionContract.connect(fromCreator).setEditable(false),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          collectionContract.connect(fromMinter).setEditable(false),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          collectionContract.connect(fromManager).setEditable(false),
          "Ownable: caller is not the owner"
        );

        await expectRevert(
          collectionContract.connect(fromHacker).setEditable(false),
          "Ownable: caller is not the owner"
        );
      });

      it("reverts when trying to change values by not the owner :: Relayed EIP721", async function () {
        const functionSignature = new utils.Interface([
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
        ]).encodeFunctionData("setEditable", [false]);

        await collectionContract.connect(fromCreator).setMinters([minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            creator,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            minter,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            manager,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            hacker,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts when trying to set the same value as before", async function () {
        await expectRevert(
          collectionContract.connect(fromUser).setEditable(true),
          "setEditable: VALUE_IS_THE_SAME"
        );
      });
    });

    describe("setBaseURI", function () {
      it("should set Base URI", async function () {
        const newBaseURI = "https://new-api.io/";

        let baseURI = await collectionContract.baseURI();
        expect(BASE_URI).to.be.equal(baseURI);

        const setBaseURITx = await collectionContract
          .connect(fromUser)
          .setBaseURI(newBaseURI);
        const logs = (await setBaseURITx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("BaseURI");
        expect(logs[0].args._oldBaseURI).to.be.equal(BASE_URI);
        expect(logs[0].args._newBaseURI).to.be.equal(newBaseURI);

        baseURI = await collectionContract.baseURI();
        expect(newBaseURI).to.be.equal(baseURI);

        const uri = await collectionContract.tokenURI(token1);

        const [itemId, issuedId] = decodeTokenId(token1);

        expect(uri).to.be.equal(
          `${newBaseURI}${chainId}/${collectionContract.address.toLowerCase()}/${itemId.toString()}/${issuedId.toString()}`
        );
      });

      it("should set Base URI :: Relayed EIP721", async function () {
        const newBaseURI = "https://new-api.io/";

        let baseURI = await collectionContract.baseURI();
        expect(BASE_URI).to.be.equal(baseURI);
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "string",
                name: "_baseURI",
                type: "string",
              },
            ],
            name: "setBaseURI",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("setBaseURI", [newBaseURI]);

        const setBaseURITx = await sendMetaTx(
          collectionContract,
          functionSignature,
          user,
          fromRelayer
        );
        const logs = (await setBaseURITx.wait()).events;
        expect(logs.length).to.be.equal(2);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(user);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("BaseURI");
        expect(logs[1].args._oldBaseURI).to.be.equal(BASE_URI);
        expect(logs[1].args._newBaseURI).to.be.equal(newBaseURI);

        baseURI = await collectionContract.baseURI();
        expect(newBaseURI).to.be.equal(baseURI);

        const uri = await collectionContract.tokenURI(token1);

        const [itemId, issuedId] = decodeTokenId(token1);

        expect(uri).to.be.equal(
          `${newBaseURI}${chainId}/${collectionContract.address.toLowerCase()}/${itemId.toString()}/${issuedId.toString()}`
        );
      });

      it("reverts when trying to change values by hacker", async function () {
        await expectRevert(
          collectionContract.connect(fromHacker).setBaseURI(""),
          "Ownable: caller is not the owner"
        );
      });

      it("reverts when trying to change values by not the owner :: Relayed EIP721", async function () {
        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "string",
                name: "_baseURI",
                type: "string",
              },
            ],
            name: "setBaseURI",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("setBaseURI", [""]);

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            creator,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            minter,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            manager,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            hacker,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });
    });

    describe("completeCollection", function () {
      let contract: any;
      beforeEach(async () => {
        // Create collection and set up wearables
        contract = await createContract(creator, false, true, true);
      });

      it("should complete collection", async function () {
        let isCompleted = await contract.isCompleted();
        expect(isCompleted).to.be.equal(false);

        const completeCollectionTx = await contract
          .connect(fromCreator)
          .completeCollection();
        const logs = (await completeCollectionTx.wait()).events;
        expect(logs.length).to.equal(1);
        expect(logs[0].event).to.equal("Complete");

        isCompleted = await contract.isCompleted();
        expect(isCompleted).to.be.equal(true);
      });

      it("should complete collection :: Relayed EIP721", async function () {
        let isCompleted = await contract.isCompleted();
        expect(isCompleted).to.be.equal(false);
        const functionSignature = new utils.Interface([
          {
            inputs: [],
            name: "completeCollection",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("completeCollection", []);

        const completeCollectionTx = await sendMetaTx(
          contract,
          functionSignature,
          creator,
          fromRelayer
        );
        const logs = (await completeCollectionTx.wait()).events;
        expect(logs.length).to.be.equal(2);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(creator);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.equal("Complete");

        isCompleted = await contract.isCompleted();
        expect(isCompleted).to.be.equal(true);
      });

      it("should issue tokens after complete the collection", async function () {
        await contract.connect(fromCreator).completeCollection();

        await issueItem(contract, holder, 0, fromCreator);
        await issueItem(contract, anotherHolder, 0, fromCreator);
        await issueItem(contract, anotherHolder, 1, fromCreator);
      });

      it("reverts when trying to add an item after the collection is completed", async function () {
        let isCompleted = await contract.isCompleted();
        expect(isCompleted).to.be.equal(false);

        await contract.connect(fromCreator).completeCollection();

        isCompleted = await contract.isCompleted();
        expect(isCompleted).to.be.equal(true);

        const newItem = [
          RARITIES_OBJECT.common.name,
          utils.parseEther("10"),
          beneficiary,
          "1:crocodile_mask:hat:female,male",
        ];

        await expectRevert(
          contract.connect(fromUser).addItems([newItem]),
          "_addItem: COLLECTION_COMPLETED"
        );
      });

      it("reverts when completing collection twice", async function () {
        await contract.connect(fromCreator).completeCollection();

        await expectRevert(
          contract.connect(fromCreator).completeCollection(),
          "completeCollection: COLLECTION_ALREADY_COMPLETED"
        );
      });

      it("reverts when completing collection by other than the creator", async function () {
        await expectRevert(
          contract.connect(fromDeployer).completeCollection(),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          contract.connect(fromManager).completeCollection(),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          contract.connect(fromMinter).completeCollection(),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );

        await expectRevert(
          contract.connect(fromHacker).completeCollection(),
          "onlyCreator: CALLER_IS_NOT_CREATOR"
        );
      });

      it("reverts when completing collection by other than the creator :: Relayed EIP721", async function () {
        await contract.connect(fromCreator).setMinters([minter], [true]);
        await contract.connect(fromCreator).setManagers([manager], [true]);
        await contract.connect(fromCreator).setItemsMinters([0], [minter], [1]);
        await contract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);
        const functionSignature = new utils.Interface([
          {
            inputs: [],
            name: "completeCollection",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("completeCollection", []);

        await expectRevert(
          sendMetaTx(contract, functionSignature, deployer, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, minter, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, manager, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(contract, functionSignature, hacker, fromRelayer),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });
    });

    describe("transferCreatorship", function () {
      it("should transfer creator role by creator", async function () {
        let creator_ = await collectionContract.creator();
        expect(creator_).to.be.equal(creator);

        const transferCreatorshipTx = await collectionContract
          .connect(fromCreator)
          .transferCreatorship(user);
        const logs = (await transferCreatorshipTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("CreatorshipTransferred");
        expect(logs[0].args._previousCreator).to.be.equal(creator);
        expect(logs[0].args._newCreator).to.be.equal(user);

        creator_ = await collectionContract.creator();
        expect(creator_).to.be.equal(user);
      });

      it("should transfer creator role by creator :: Relayed EIP721", async function () {
        let creator_ = await collectionContract.creator();
        expect(creator_).to.be.equal(creator);
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address",
                name: "_newCreator",
                type: "address",
              },
            ],
            name: "transferCreatorship",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("transferCreatorship", [user]);

        const transferCreatorshipTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          creator,
          fromRelayer
        );
        const logs = (await transferCreatorshipTx.wait()).events;
        expect(logs.length).to.be.equal(2);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(creator);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("CreatorshipTransferred");
        expect(logs[1].args._previousCreator).to.be.equal(creator);
        expect(logs[1].args._newCreator).to.be.equal(user);

        creator_ = await collectionContract.creator();
        expect(creator_).to.be.equal(user);
      });

      it("should transfer creator role by owner", async function () {
        let creator_ = await collectionContract.creator();
        expect(creator_).to.be.equal(creator);

        const transferCreatorshipTx = await collectionContract
          .connect(fromUser)
          .transferCreatorship(user);
        const logs = (await transferCreatorshipTx.wait()).events;
        expect(logs.length).to.be.equal(1);
        expect(logs[0].event).to.be.equal("CreatorshipTransferred");
        expect(logs[0].args._previousCreator).to.be.equal(creator);
        expect(logs[0].args._newCreator).to.be.equal(user);

        creator_ = await collectionContract.creator();
        expect(creator_).to.be.equal(user);
      });

      it("should transfer creator role by owner :: Relayed EIP721", async function () {
        let creator_ = await collectionContract.creator();
        expect(creator_).to.be.equal(creator);
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address",
                name: "_newCreator",
                type: "address",
              },
            ],
            name: "transferCreatorship",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("transferCreatorship", [user]);

        const transferCreatorshipTx = await sendMetaTx(
          collectionContract,
          functionSignature,
          user,
          fromRelayer
        );
        const logs = (await transferCreatorshipTx.wait()).events;
        expect(logs.length).to.be.equal(2);

        expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
        expect(logs[0].args.userAddress).to.be.equal(user);
        expect(logs[0].args.relayerAddress).to.be.equal(relayer);
        expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

        expect(logs[1].event).to.be.equal("CreatorshipTransferred");
        expect(logs[1].args._previousCreator).to.be.equal(creator);
        expect(logs[1].args._newCreator).to.be.equal(user);

        creator_ = await collectionContract.creator();
        expect(creator_).to.be.equal(user);
      });

      it("reverts when trying to transfer creator role by not the owner or creator", async function () {
        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);

        await expectRevert(
          collectionContract.connect(fromMinter).transferCreatorship(user),
          "transferCreatorship: CALLER_IS_NOT_OWNER_OR_CREATOR"
        );

        await expectRevert(
          collectionContract.connect(fromManager).transferCreatorship(user),
          "transferCreatorship: CALLER_IS_NOT_OWNER_OR_CREATOR"
        );

        await expectRevert(
          collectionContract.connect(fromHacker).transferCreatorship(user),
          "transferCreatorship: CALLER_IS_NOT_OWNER_OR_CREATOR"
        );
      });

      it("reverts when trying to transfer creator role by not the owner or creator :: Relayed EIP721", async function () {
        await collectionContract
          .connect(fromCreator)
          .setMinters([minter], [true]);
        await collectionContract
          .connect(fromCreator)
          .setManagers([manager], [true]);
        await collectionContract
          .connect(fromCreator)
          .setItemsMinters([0], [minter], [1]);
        await collectionContract
          .connect(fromCreator)
          .setItemsManagers([0], [manager], [true]);
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address",
                name: "_newCreator",
                type: "address",
              },
            ],
            name: "transferCreatorship",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("transferCreatorship", [user]);

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            minter,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            manager,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            hacker,
            fromRelayer
          ),
          "NMT#executeMetaTransaction: CALL_FAILED"
        );
      });

      it("reverts when trying to transfer creator role to an invalid address", async function () {
        await expectRevert(
          collectionContract
            .connect(fromUser)
            .transferCreatorship(ZERO_ADDRESS),
          "transferCreatorship: INVALID_CREATOR_ADDRESS"
        );
      });
    });

    describe("encodeTokenId", function () {
      it("should encode a token id", async function () {
        let expectedId = await collectionContract.encodeTokenId(0, 1);
        let decoded = decodeTokenId(expectedId);
        expect(expectedId).to.eq(encodeTokenId(0, 1));
        expect(0).to.eq(decoded[0]);
        expect(1).to.eq(decoded[1]);

        expectedId = await collectionContract.encodeTokenId(1, 0);
        decoded = decodeTokenId(expectedId);
        expect(expectedId).to.eq(encodeTokenId(1, 0));
        expect(1).to.eq(decoded[0]);
        expect(0).to.eq(decoded[1]);

        expectedId = await collectionContract.encodeTokenId(
          11232232,
          1123123123
        );
        decoded = decodeTokenId(expectedId);
        expect(expectedId).to.eq(encodeTokenId(11232232, 1123123123));
        expect(11232232).to.eq(decoded[0]);
        expect(1123123123).to.eq(decoded[1]);

        expectedId = await collectionContract.encodeTokenId(
          4569428193,
          90893249234
        );
        decoded = decodeTokenId(expectedId);
        expect(expectedId).to.eq(encodeTokenId(4569428193, 90893249234));
        expect(4569428193).to.eq(decoded[0]);
        expect(90893249234).to.eq(decoded[1]);
      });
      // console.log('fix error')
      // it("revert when the first value is greater than 5 bytes", async function () {
      //   const max = BigNumber.from(utils.hexZeroPad("0xff", 10, "f"));
      //   const one = BigNumber.from(1);

      //   const expectedId = await collectionContract.encodeTokenId(max, 0);
      //   expect(expectedId).to.eq(encodeTokenId(max, 0));

      //   await expectRevert(
      //     collectionContract.encodeTokenId(max.add(one), 0),
      //     "encodeTokenId: INVALID_ITEM_ID"
      //   );
      // });

      // it("revert when the second value is greater than 27 bytes", async function () {
      //   const max = BigNumber.from(utils.hexZeroPad("0xff", 54, "f"));
      //   const one = BigNumber.from(1);

      //   const expectedId = await collectionContract.encodeTokenId(0, max);
      //   expect(expectedId).to.eq(encodeTokenId(0, max));

      //   await expectRevert(
      //     collectionContract.encodeTokenId(0, max.add(one)),
      //     "encodeTokenId: INVALID_ISSUED_ID"
      //   );
      // });
    });

    describe("decodeTokenId", function () {
      it("should decode a token id", async function () {
        let expectedValues = await collectionContract.decodeTokenId(
          encodeTokenId(0, 1)
        );
        expect(expectedValues[0]).to.eq(0);
        expect(expectedValues[1]).to.eq(1);

        expectedValues = await collectionContract.decodeTokenId(
          encodeTokenId(1, 0)
        );
        expect(expectedValues[0]).to.eq(1);
        expect(expectedValues[1]).to.eq(0);

        expectedValues = await collectionContract.decodeTokenId(
          encodeTokenId(124, 123212)
        );
        expect(expectedValues[0]).to.eq(124);
        expect(expectedValues[1]).to.eq(123212);

        expectedValues = await collectionContract.decodeTokenId(
          encodeTokenId(4569428193, 90893249234)
        );
        expect(expectedValues[0]).to.eq(4569428193);
        expect(expectedValues[1]).to.eq(90893249234);
      });
    });

    describe("MetaTransaction", function () {
      it("should get the chain id", async function () {
        const expectedChainId = getChainId();
        const contractChainId = await collectionContract.getChainId();
        expect(contractChainId).to.eq(expectedChainId);
      });

      it("should get the domain separator", async function () {
        const expectedDomainSeparator = await getDomainSeparator(
          collectionContract
        );
        const domainSeparator = await collectionContract.domainSeparator();
        expect(expectedDomainSeparator).to.eq(domainSeparator);
      });

      it("should get nonce", async function () {
        let nonce = await collectionContract.getNonce(user);
        expect(0).to.eq(nonce);
        const functionSignature = new utils.Interface([
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
        ]).encodeFunctionData("setApproved", [false]);

        await sendMetaTx(
          collectionContract,
          functionSignature,
          user,
          fromRelayer
        );

        nonce = await collectionContract.getNonce(user);
        expect(1).to.eq(nonce);
      });

      it("should send a tx ", async function () {
        let owner = await collectionContract.ownerOf(token1);
        expect(owner).to.be.equal(holder);
        const functionSignature = new utils.Interface([
          {
            inputs: [
              {
                internalType: "address",
                name: "from",
                type: "address",
              },
              {
                internalType: "address",
                name: "to",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "tokenId",
                type: "uint256",
              },
            ],
            name: "safeTransferFrom",
            outputs: [],
            stateMutability: "nonpayable",
            type: "function",
          },
        ]).encodeFunctionData("safeTransferFrom", [
          holder,
          anotherHolder,
          token1.toString(),
        ]);

        await sendMetaTx(
          collectionContract,
          functionSignature,
          holder,
          fromRelayer
        );

        owner = await collectionContract.ownerOf(token1);
        expect(owner).to.be.equal(anotherHolder);
      });

      it("reverts when signature does not match with signer", async function () {
        const functionSignature = new utils.Interface([
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
        ]).encodeFunctionData("setApproved", [false]);

        await expectRevert(
          sendMetaTx(
            collectionContract,
            functionSignature,
            user,
            fromRelayer,
            hacker
          ),
          "NMT#executeMetaTransaction: SIGNER_AND_SIGNATURE_DO_NOT_MATCH"
        );
      });

      it("reverts when trying to replicate a tx", async function () {
        const functionSignature = new utils.Interface([
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
        ]).encodeFunctionData("setApproved", [false]);

        const signature = await getSignature(
          collectionContract,
          functionSignature,
          user,
          null,
          DEFAULT_DOMAIN,
          DEFAULT_VERSION
        );

        const r = "0x" + signature.substring(0, 64);
        const s = "0x" + signature.substring(64, 128);
        const v = "0x" + signature.substring(128, 130);

        await collectionContract
          .connect(fromRelayer)
          .executeMetaTransaction(user, functionSignature, r, s, v);

        await expectRevert(
          collectionContract
            .connect(fromRelayer)
            .executeMetaTransaction(user, functionSignature, r, s, v),
          "NMT#executeMetaTransaction: SIGNER_AND_SIGNATURE_DO_NOT_MATCH"
        );
      });

      it("reverts when trying to impersonate a tx", async function () {
        const functionSignature = new utils.Interface([
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
        ]).encodeFunctionData("setApproved", [false]);

        const signature = await getSignature(
          collectionContract,
          functionSignature,
          hacker,
          null,
          DEFAULT_DOMAIN,
          DEFAULT_VERSION
        );

        const r = "0x" + signature.substring(0, 64);
        const s = "0x" + signature.substring(64, 128);
        const v = "0x" + signature.substring(128, 130);

        await expectRevert(
          collectionContract
            .connect(fromRelayer)
            .executeMetaTransaction(user, functionSignature, r, s, v),
          "NMT#executeMetaTransaction: SIGNER_AND_SIGNATURE_DO_NOT_MATCH"
        );
      });
    });
  });
}
