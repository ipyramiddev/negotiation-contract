import hr from "hardhat";
import { expect } from "chai";
import { BigNumber, Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import { getChainId } from "./helper/ChainId";
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
  BENEFICIARY_ADDRESS,
  OTHER_BENEFICIARY_ADDRESS,
  createDummyFactory,
  createDummyCollection,
  encodeTokenId,
} from "./helper/Collection";
import { balanceSnap } from "./helper/BalanceSnap";
import { parseEther } from "@ethersproject/units";

describe("Collection Store", function () {
  const ONE_MILLION = BigNumber.from(1000000);
  // Store
  const FEE = BigNumber.from(10000);

  // COLLECTION ITEMS 2
  const COLLECTION2_ITEMS = [
    [
      RARITIES_OBJECT.legendary.name,
      parseEther("10"),
      OTHER_BENEFICIARY_ADDRESS,
      "1:coco_maso:hat:female,male",
    ],
    [
      RARITIES_OBJECT.unique.name,
      parseEther("20"),
      OTHER_BENEFICIARY_ADDRESS,
      "1:banana_mask:hat:female,male",
    ],
    [
      RARITIES_OBJECT.common.name,
      0,
      ZERO_ADDRESS,
      "1:apple_mask:hat:female,male",
    ],
  ];
  let UccContract, StoreContract, Collection, RaritiesContract;

  let uccContract: Contract,
    storeContract: Contract,
    collection1: Contract,
    collection2: Contract,
    factory: Contract,
    raritiesContract: Contract;

  let deployer: Signer,
    user: Signer,
    buyer: Signer,
    anotherBuyer: Signer,
    storeOwner: Signer,
    feeOwner: Signer,
    hacker: Signer,
    relayer: Signer;

  let deployerAddr: string,
    userAddr: string,
    buyerAddr: string,
    anotherBuyerAddr: string,
    storeOwnerAddr: string,
    feeOwnerAddr: string,
    hackerAddr: string,
    relayerAddr: string;

  const chainId = getChainId();
  beforeEach(async function () {
    [
      deployer,
      user,
      buyer,
      anotherBuyer,
      storeOwner,
      feeOwner,
      hacker,
      relayer,
    ] = await ethers.getSigners();

    [
      deployerAddr,
      userAddr,
      buyerAddr,
      anotherBuyerAddr,
      storeOwnerAddr,
      feeOwnerAddr,
      hackerAddr,
      relayerAddr,
    ] = await Promise.all([
      deployer.getAddress(),
      user.getAddress(),
      buyer.getAddress(),
      anotherBuyer.getAddress(),
      storeOwner.getAddress(),
      feeOwner.getAddress(),
      hacker.getAddress(),
      relayer.getAddress(),
    ]);

    UccContract = await ethers.getContractFactory("UnicialCashToken");
    uccContract = await UccContract.deploy(chainId);

    StoreContract = await ethers.getContractFactory("CollectionStore");
    storeContract = await StoreContract.connect(storeOwner).deploy(
      storeOwnerAddr,
      uccContract.address,
      feeOwnerAddr,
      FEE
    );

    RaritiesContract = await ethers.getContractFactory("Rarities");
    raritiesContract = await RaritiesContract.deploy(
      deployerAddr,
      getInitialRarities()
    );
    factory = await createDummyFactory(deployerAddr);
    collection1 = await createDummyCollection(factory, {
      creator: deployerAddr,
      items: ITEMS,
      shouldComplete: true,
      rarities: raritiesContract.address,
    });
    collection2 = await createDummyCollection(factory, {
      creator: deployerAddr,
      items: COLLECTION2_ITEMS,
      shouldComplete: true,
      rarities: raritiesContract.address,
    });

    await collection1.setApproved(true);
    await collection1.setMinters([storeContract.address], [true]);

    await collection2.setApproved(true);
    await collection2.setMinters([storeContract.address], [true]);

    await uccContract
      .connect(buyer)
      .approve(storeContract.address, MAX_UINT256);
  });
  // describe("Deploy", async function () {
  //   it("deploy with correct values", async function () {
  //     const contract = await StoreContract.connect(storeOwner).deploy(
  //       storeOwnerAddr,
  //       uccContract.address,
  //       feeOwnerAddr,
  //       FEE
  //     );

  //     const acceptedToken_ = await contract.acceptedToken();
  //     expect(acceptedToken_).to.be.equal(uccContract.address);

  //     const feeOwner_ = await contract.feeOwner();
  //     expect(feeOwner_).to.be.equal(feeOwnerAddr);

  //     const fee_ = await contract.fee();
  //     expect(fee_).to.equal(FEE);
  //   });
  //   it("reverts when deploying with fee >= ONE_MILLION", async function () {
  //     await expect(
  //       StoreContract.connect(storeOwner).deploy(
  //         storeOwnerAddr,
  //         uccContract.address,
  //         feeOwnerAddr,
  //         ONE_MILLION
  //       )
  //     ).to.be.revertedWith(
  //       "CollectionStore#setFee: FEE_SHOULD_BE_LOWER_THAN_BASE_FEE"
  //     );

  //     await expect(
  //       StoreContract.connect(storeOwner).deploy(
  //         storeOwnerAddr,
  //         uccContract.address,
  //         feeOwnerAddr,
  //         ONE_MILLION.add(BigNumber.from(1))
  //       )
  //     ).to.be.revertedWith(
  //       "CollectionStore#setFee: FEE_SHOULD_BE_LOWER_THAN_BASE_FEE"
  //     );
  //   });
  // });

  describe("buy", function () {
    it("should buy", async function () {
      let totalSupplyCollection1 = await collection1.totalSupply();
      expect(totalSupplyCollection1).to.equal(0);
      let totalSupplyCollection2 = await collection2.totalSupply();
      expect(totalSupplyCollection2).to.equal(0);

      let itemsBalanceOfBuyer = await collection1.balanceOf(buyerAddr);
      expect(itemsBalanceOfBuyer).to.equal(0);
      const price = BigNumber.from(ITEMS[0][1]);
      await uccContract.mint(buyerAddr, price);
      const buyerBalance = await balanceSnap(uccContract, buyerAddr, "buyer");
      const beneficiaryBalance = await balanceSnap(
        uccContract,
        BENEFICIARY_ADDRESS,
        "beneficiary"
      );
      const feeOwnerBalance = await balanceSnap(
        uccContract,
        feeOwnerAddr,
        "fee owner"
      );
      const storeBalance = await balanceSnap(
        uccContract,
        storeContract.address,
        "store"
      );
      expect(await collection1.globalMinters(storeContract.address)).to.equal(
        true
      );
      const buyTx = await storeContract
        .connect(buyer)
        .buy([[collection1.address, [0], [price], [buyerAddr]]]);
      const logs = (await buyTx.wait()).events;
      totalSupplyCollection1 = await collection1.totalSupply();
      expect(totalSupplyCollection1).to.equal(1);
      totalSupplyCollection2 = await collection2.totalSupply();
      expect(totalSupplyCollection2).to.equal(0);
      const item0 = await collection1.items(0);
      expect(item0.totalSupply).to.equal(1);
      expect(logs.length).to.be.equal(5);
      const feeCharged = price.mul(FEE).div(ONE_MILLION);
      // expect(logs[1].event).to.be.equal("Transfer");
      // expect(logs[1].args._from).to.be.equal(buyerAddr);
      // expect(logs[1].args._to.toLowerCase()).to.be.equal(
      //   BENEFICIARY_ADDRESS.toLowerCase()
      // );
      // expect(logs[1].args._value).to.equal(price.sub(feeCharged));
      // expect(logs[2].event).to.be.equal("Issue");
      // expect(logs[2].args._beneficiary).to.be.equal(buyerAddr);
      // expect(logs[2].args._tokenId).to.equal(encodeTokenId(0, 1));
      // expect(logs[2].args._itemId).to.equal(0);
      // expect(logs[2].args._issuedId).to.equal(1);
      // expect(logs[2].args._caller).to.equal(storeContract.address);
      // expect(logs[3].event).to.be.equal("Transfer");
      // expect(logs[3].args._from).to.be.equal(buyerAddr);
      // expect(logs[3].args._to).to.be.equal(feeOwnerAddr);
      // expect(logs[3].args._value).to.equal(feeCharged);
      expect(logs[4].event).to.be.equal("Bought");
      // expect(logs[4].args._itemsToBuy).to.be.eql([
      //   [collection1.address, ["0"], [price.toString()], [buyerAddr]],
      // ]);
      expect(logs[4].args._itemsToBuy[0][0]).to.be.eql(collection1.address);
      expect(logs[4].args._itemsToBuy[0][1].toString()).to.be.eql("0");
      expect(logs[4].args._itemsToBuy[0][2].toString()).to.be.eql(
        price.toString()
      );
      expect(logs[4].args._itemsToBuy[0][3]).to.be.eql([buyerAddr]);
      await buyerBalance.requireDecrease(price);
      await beneficiaryBalance.requireIncrease(price.sub(feeCharged));
      await feeOwnerBalance.requireIncrease(feeCharged);
      await storeBalance.requireConstant();
      itemsBalanceOfBuyer = await collection1.balanceOf(buyerAddr);
      expect(itemsBalanceOfBuyer).to.equal(1);
      const itemId = await collection1.tokenOfOwnerByIndex(buyerAddr, 0);
      const uri = await collection1.tokenURI(itemId);
      const uriArr = uri.split("/");
      expect((0).toString()).to.equal(uriArr[uriArr.length - 2]);
    });

    it("should buy an item with price 0", async function () {
      let totalSupplyCollection1 = await collection1.totalSupply();
      expect(totalSupplyCollection1).to.equal(0);
      let totalSupplyCollection2 = await collection2.totalSupply();
      expect(totalSupplyCollection2).to.equal(0);
      const buyerBalance = await balanceSnap(uccContract, buyerAddr, "buyer");
      const beneficiaryBalance = await balanceSnap(
        uccContract,
        BENEFICIARY_ADDRESS,
        "beneficiary"
      );
      const feeOwnerBalance = await balanceSnap(
        uccContract,
        feeOwnerAddr,
        "fee owner"
      );
      const storeBalance = await balanceSnap(
        uccContract,
        storeContract.address,
        "store"
      );
      let itemsBalanceOfBuyer = await collection2.balanceOf(buyerAddr);
      expect(itemsBalanceOfBuyer).to.equal(0);
      const buyTx = await storeContract
        .connect(buyer)
        .buy([[collection2.address, [2], [0], [buyerAddr]]]);
      const logs = (await buyTx.wait()).events;
      console.log(logs);
      totalSupplyCollection1 = await collection1.totalSupply();
      expect(totalSupplyCollection1).to.equal(0);
      totalSupplyCollection2 = await collection2.totalSupply();
      expect(totalSupplyCollection2).to.equal(1);
      const item2 = await collection2.items(2);
      expect(item2.totalSupply).to.equal(1);
      expect(logs.length).to.be.equal(3);
      expect(logs[0].event).to.be.equal("Issue");
      expect(logs[0].args._beneficiary).to.be.equal(buyerAddr);
      expect(logs[0].args._tokenId).to.equal(encodeTokenId(2, 1));
      expect(logs[0].args._itemId).to.equal(2);
      expect(logs[0].args._issuedId).to.equal(1);
      expect(logs[0].args._caller).to.equal(storeContract.address);
      expect(logs[1].event).to.be.equal("Bought");
      expect(logs[1].args._itemsToBuy).to.be.eql([
        [collection2.address, ["2"], ["0"], [buyerAddr]],
      ]);
      await buyerBalance.requireConstant();
      await beneficiaryBalance.requireConstant();
      await feeOwnerBalance.requireConstant();
      await storeBalance.requireConstant();
      itemsBalanceOfBuyer = await collection2.balanceOf(buyerAddr);
      expect(itemsBalanceOfBuyer).to.equal(1);
      const itemId = await collection2.tokenOfOwnerByIndex(buyerAddr, 0);
      const uri = await collection2.tokenURI(itemId);
      const uriArr = uri.split("/");
      expect((2).toString()).to.equal(uriArr[uriArr.length - 2]);
    });
    // it('should buy more than 1 item from different collections', async function () {
    //   let totalSupplyCollection1 = await collection1.totalSupply()
    //   expect(totalSupplyCollection1).to.equal(0)
    //   let totalSupplyCollection2 = await collection2.totalSupply()
    //   expect(totalSupplyCollection2).to.equal(0)
    //   const buyerBalance = await balanceSnap(uccContract, buyer, 'buyer')
    //   const beneficiaryBalance = await balanceSnap(
    //     uccContract,
    //     BENEFICIARY_ADDRESS,
    //     'beneficiary collection 1'
    //   )
    //   const otherBeneficiaryBalance = await balanceSnap(
    //     uccContract,
    //     OTHER_BENEFICIARY_ADDRESS,
    //     'beneficiary collection 2'
    //   )
    //   const feeOwnerBalance = await balanceSnap(
    //     uccContract,
    //     feeOwner,
    //     'fee owner'
    //   )
    //   const storeBalance = await balanceSnap(
    //     uccContract,
    //     storeContract.address,
    //     'store'
    //   )
    //   let itemsCollection1BalanceOfBuyer = await collection1.balanceOf(buyer)
    //   expect(itemsCollection1BalanceOfBuyer).to.equal(0)
    //   let itemsCollection2BalanceOfBuyer = await collection2.balanceOf(buyer)
    //   expect(itemsCollection2BalanceOfBuyer).to.equal(0)
    //   const price10 = BigNumber.from(ITEMS[0][1])
    //   const price12 = BigNumber.from(ITEMS[2][1])
    //   const price20 = BigNumber.from(COLLECTION2_ITEMS[0][1])
    //   const finalPrice = price10.add(price10).add(price12).add(price20)
    //   const { logs } = await storeContract.buy(
    //     [
    //       [
    //         collection1.address,
    //         [0, 0, 2],
    //         [price10, price10, price12],
    //         [buyer, buyer, buyer],
    //       ],
    //       [collection2.address, [0], [price20], [buyer]],
    //     ],
    //     fromBuyer
    //   )
    //   totalSupplyCollection1 = await collection1.totalSupply()
    //   expect(totalSupplyCollection1).to.equal(3)
    //   totalSupplyCollection2 = await collection2.totalSupply()
    //   expect(totalSupplyCollection2).to.equal(1)
    //   const item10 = await collection1.items(0)
    //   expect(item10.totalSupply).to.equal(2)
    //   const item12 = await collection1.items(2)
    //   expect(item12.totalSupply).to.equal(1)
    //   const item20 = await collection2.items(0)
    //   expect(item20.totalSupply).to.equal(1)
    //   expect(logs.length).to.be.equal(10)
    //   const price10Fee = price10.mul(FEE).div(ONE_MILLION)
    //   let feeCharged = price10Fee
    //   expect(logs[0].event).to.be.equal('Transfer')
    //   expect(logs[0].args._from).to.be.equal(buyer)
    //   expect(logs[0].args._to.toLowerCase()).to.be.equal(
    //     BENEFICIARY_ADDRESS.toLowerCase()
    //   )
    //   expect(logs[0].args._value).to.equal(price10.sub(price10Fee))
    //   feeCharged = feeCharged.add(price10Fee)
    //   expect(logs[1].event).to.be.equal('Transfer')
    //   expect(logs[1].args._from).to.be.equal(buyer)
    //   expect(logs[1].args._to.toLowerCase()).to.be.equal(
    //     BENEFICIARY_ADDRESS.toLowerCase()
    //   )
    //   expect(logs[1].args._value).to.equal(price10.sub(price10Fee))
    //   const price12Fee = price12.mul(FEE).div(ONE_MILLION)
    //   feeCharged = feeCharged.add(price12Fee)
    //   expect(logs[2].event).to.be.equal('Transfer')
    //   expect(logs[2].args._from).to.be.equal(buyer)
    //   expect(logs[2].args._to.toLowerCase()).to.be.equal(
    //     BENEFICIARY_ADDRESS.toLowerCase()
    //   )
    //   expect(logs[2].args._value).to.equal(price12.sub(price12Fee))
    //   expect(logs[3].event).to.be.equal('Issue')
    //   expect(logs[3].args._beneficiary).to.be.equal(buyer)
    //   expect(logs[3].args._tokenId).to.equal(encodeTokenId(0, 1))
    //   expect(logs[3].args._itemId).to.equal(0)
    //   expect(logs[3].args._issuedId).to.equal(1)
    //   expect(logs[3].args._caller).to.equal(storeContract.address)
    //   expect(logs[4].event).to.be.equal('Issue')
    //   expect(logs[4].args._beneficiary).to.be.equal(buyer)
    //   expect(logs[4].args._tokenId).to.equal(encodeTokenId(0, 2))
    //   expect(logs[4].args._itemId).to.equal(0)
    //   expect(logs[4].args._issuedId).to.equal(2)
    //   expect(logs[4].args._caller).to.equal(storeContract.address)
    //   expect(logs[5].event).to.be.equal('Issue')
    //   expect(logs[5].args._beneficiary).to.be.equal(buyer)
    //   expect(logs[5].args._tokenId).to.equal(encodeTokenId(2, 1))
    //   expect(logs[5].args._itemId).to.equal(2)
    //   expect(logs[5].args._issuedId).to.equal(1)
    //   expect(logs[5].args._caller).to.equal(storeContract.address)
    //   const price20Fee = price20.mul(FEE).div(ONE_MILLION)
    //   feeCharged = feeCharged.add(price20Fee)
    //   expect(logs[6].event).to.be.equal('Transfer')
    //   expect(logs[6].args._from).to.be.equal(buyer)
    //   expect(logs[6].args._to.toLowerCase()).to.be.equal(
    //     OTHER_BENEFICIARY_ADDRESS.toLowerCase()
    //   )
    //   expect(logs[6].args._value).to.equal(price20.sub(price20Fee))
    //   expect(logs[7].event).to.be.equal('Issue')
    //   expect(logs[7].args._beneficiary).to.be.equal(buyer)
    //   expect(logs[7].args._tokenId).to.equal(encodeTokenId(0, 1))
    //   expect(logs[7].args._itemId).to.equal(0)
    //   expect(logs[7].args._issuedId).to.equal(1)
    //   expect(logs[7].args._caller).to.equal(storeContract.address)
    //   expect(logs[8].event).to.be.equal('Transfer')
    //   expect(logs[8].args._from).to.be.equal(buyer)
    //   expect(logs[8].args._to).to.be.equal(feeOwner)
    //   expect(logs[8].args._value).to.equal(feeCharged)
    //   expect(logs[9].event).to.be.equal('Bought')
    //   expect(logs[9].args._itemsToBuy).to.be.eql([
    //     [
    //       collection1.address,
    //       ['0', '0', '2'],
    //       [price10.toString(), price10.toString(), price12.toString()],
    //       [buyer, buyer, buyer],
    //     ],
    //     [collection2.address, ['0'], [price20.toString()], [buyer]],
    //   ])
    //   await buyerBalance.requireDecrease(finalPrice)
    //   await beneficiaryBalance.requireIncrease(
    //     price10
    //       .add(price10)
    //       .add(price12)
    //       .sub(price10Fee.add(price10Fee).add(price12Fee))
    //   )
    //   await otherBeneficiaryBalance.requireIncrease(price20.sub(price20Fee))
    //   await feeOwnerBalance.requireIncrease(feeCharged)
    //   await storeBalance.requireConstant()
    //   itemsCollection1BalanceOfBuyer = await collection1.balanceOf(buyer)
    //   expect(itemsCollection1BalanceOfBuyer).to.equal(3)
    //   itemsCollection2BalanceOfBuyer = await collection2.balanceOf(buyer)
    //   expect(itemsCollection2BalanceOfBuyer).to.equal(1)
    //   let itemId = await collection1.tokenOfOwnerByIndex(buyer, 0)
    //   let uri = await collection1.tokenURI(itemId)
    //   let uriArr = uri.split('/')
    //   expect(0).to.equal(uriArr[uriArr.length - 2])
    //   itemId = await collection1.tokenOfOwnerByIndex(buyer, 1)
    //   uri = await collection1.tokenURI(itemId)
    //   uriArr = uri.split('/')
    //   expect(0).to.equal(uriArr[uriArr.length - 2])
    //   itemId = await collection1.tokenOfOwnerByIndex(buyer, 2)
    //   uri = await collection1.tokenURI(itemId)
    //   uriArr = uri.split('/')
    //   expect(2).to.equal(uriArr[uriArr.length - 2])
    //   itemId = await collection2.tokenOfOwnerByIndex(buyer, 0)
    //   uri = await collection1.tokenURI(itemId)
    //   uriArr = uri.split('/')
    //   expect(0).to.equal(uriArr[uriArr.length - 2])
    // })
    // it('should buy more than 1 item from different collections :: Relayed EIP721', async function () {
    //   let totalSupplyCollection1 = await collection1.totalSupply()
    //   expect(totalSupplyCollection1).to.equal(0)
    //   let totalSupplyCollection2 = await collection2.totalSupply()
    //   expect(totalSupplyCollection2).to.equal(0)
    //   const buyerBalance = await balanceSnap(uccContract, buyer, 'buyer')
    //   const beneficiaryBalance = await balanceSnap(
    //     uccContract,
    //     BENEFICIARY_ADDRESS,
    //     'beneficiary collection 1'
    //   )
    //   const otherBeneficiaryBalance = await balanceSnap(
    //     uccContract,
    //     OTHER_BENEFICIARY_ADDRESS,
    //     'beneficiary collection 2'
    //   )
    //   const feeOwnerBalance = await balanceSnap(
    //     uccContract,
    //     feeOwner,
    //     'fee owner'
    //   )
    //   const storeBalance = await balanceSnap(
    //     uccContract,
    //     storeContract.address,
    //     'store'
    //   )
    //   let itemsCollection1BalanceOfBuyer = await collection1.balanceOf(buyer)
    //   expect(itemsCollection1BalanceOfBuyer).to.equal(0)
    //   let itemsCollection2BalanceOfBuyer = await collection2.balanceOf(buyer)
    //   expect(itemsCollection2BalanceOfBuyer).to.equal(0)
    //   const price10 = BigNumber.from(ITEMS[0][1])
    //   const price12 = BigNumber.from(ITEMS[2][1])
    //   const price20 = BigNumber.from(COLLECTION2_ITEMS[0][1])
    //   const finalPrice = price10.add(price10).add(price12).add(price20)
    //   const functionSignature = web3.eth.abi.encodeFunctionCall(
    //     {
    //       inputs: [
    //         {
    //           components: [
    //             {
    //               internalType: 'contract IERC721CollectionV2',
    //               name: 'collection',
    //               type: 'address',
    //             },
    //             {
    //               internalType: 'uint256[]',
    //               name: 'ids',
    //               type: 'uint256[]',
    //             },
    //             {
    //               internalType: 'uint256[]',
    //               name: 'prices',
    //               type: 'uint256[]',
    //             },
    //             {
    //               internalType: 'address[]',
    //               name: 'beneficiaries',
    //               type: 'address[]',
    //             },
    //           ],
    //           internalType: 'struct CollectionStore.ItemToBuy[]',
    //           name: '_itemsToBuy',
    //           type: 'tuple[]',
    //         },
    //       ],
    //       name: 'buy',
    //       outputs: [],
    //       stateMutability: 'nonpayable',
    //       type: 'function',
    //     },
    //     [
    //       [
    //         [
    //           collection1.address,
    //           [0, 0, 2],
    //           [price10.toString(), price10.toString(), price12.toString()],
    //           [buyer, buyer, buyer],
    //         ],
    //         [collection2.address, [0], [price20.toString()], [buyer]],
    //       ],
    //     ]
    //   )
    //   const res = await sendMetaTx(
    //     storeContract,
    //     functionSignature,
    //     buyer,
    //     relayer,
    //     null,
    //     'Decentraland Collection Store',
    //     '1'
    //   )
    //   const logs = res.logs.slice(1, res.logs.length)
    //   totalSupplyCollection1 = await collection1.totalSupply()
    //   expect(totalSupplyCollection1).to.equal(3)
    //   totalSupplyCollection2 = await collection2.totalSupply()
    //   expect(totalSupplyCollection2).to.equal(1)
    //   const item10 = await collection1.items(0)
    //   expect(item10.totalSupply).to.equal(2)
    //   const item12 = await collection1.items(2)
    //   expect(item12.totalSupply).to.equal(1)
    //   const item20 = await collection2.items(0)
    //   expect(item20.totalSupply).to.equal(1)
    //   expect(logs.length).to.be.equal(10)
    //   const price10Fee = price10.mul(FEE).div(ONE_MILLION)
    //   let feeCharged = price10Fee
    //   expect(logs[0].event).to.be.equal('Transfer')
    //   expect(logs[0].args._from).to.be.equal(buyer)
    //   expect(logs[0].args._to.toLowerCase()).to.be.equal(
    //     BENEFICIARY_ADDRESS.toLowerCase()
    //   )
    //   expect(logs[0].args._value).to.equal(price10.sub(price10Fee))
    //   feeCharged = feeCharged.add(price10Fee)
    //   expect(logs[1].event).to.be.equal('Transfer')
    //   expect(logs[1].args._from).to.be.equal(buyer)
    //   expect(logs[1].args._to.toLowerCase()).to.be.equal(
    //     BENEFICIARY_ADDRESS.toLowerCase()
    //   )
    //   expect(logs[1].args._value).to.equal(price10.sub(price10Fee))
    //   const price12Fee = price12.mul(FEE).div(ONE_MILLION)
    //   feeCharged = feeCharged.add(price12Fee)
    //   expect(logs[2].event).to.be.equal('Transfer')
    //   expect(logs[2].args._from).to.be.equal(buyer)
    //   expect(logs[2].args._to.toLowerCase()).to.be.equal(
    //     BENEFICIARY_ADDRESS.toLowerCase()
    //   )
    //   expect(logs[2].args._value).to.equal(price12.sub(price12Fee))
    //   expect(logs[3].event).to.be.equal('Issue')
    //   expect(logs[3].args._beneficiary).to.be.equal(buyer)
    //   expect(logs[3].args._tokenId).to.equal(encodeTokenId(0, 1))
    //   expect(logs[3].args._itemId).to.equal(0)
    //   expect(logs[3].args._issuedId).to.equal(1)
    //   expect(logs[3].args._caller).to.equal(storeContract.address)
    //   expect(logs[4].event).to.be.equal('Issue')
    //   expect(logs[4].args._beneficiary).to.be.equal(buyer)
    //   expect(logs[4].args._tokenId).to.equal(encodeTokenId(0, 2))
    //   expect(logs[4].args._itemId).to.equal(0)
    //   expect(logs[4].args._issuedId).to.equal(2)
    //   expect(logs[4].args._caller).to.equal(storeContract.address)
    //   expect(logs[5].event).to.be.equal('Issue')
    //   expect(logs[5].args._beneficiary).to.be.equal(buyer)
    //   expect(logs[5].args._tokenId).to.equal(encodeTokenId(2, 1))
    //   expect(logs[5].args._itemId).to.equal(2)
    //   expect(logs[5].args._issuedId).to.equal(1)
    //   expect(logs[5].args._caller).to.equal(storeContract.address)
    //   const price20Fee = price20.mul(FEE).div(ONE_MILLION)
    //   feeCharged = feeCharged.add(price20Fee)
    //   expect(logs[6].event).to.be.equal('Transfer')
    //   expect(logs[6].args._from).to.be.equal(buyer)
    //   expect(logs[6].args._to.toLowerCase()).to.be.equal(
    //     OTHER_BENEFICIARY_ADDRESS.toLowerCase()
    //   )
    //   expect(logs[6].args._value).to.equal(price20.sub(price20Fee))
    //   expect(logs[7].event).to.be.equal('Issue')
    //   expect(logs[7].args._beneficiary).to.be.equal(buyer)
    //   expect(logs[7].args._tokenId).to.equal(encodeTokenId(0, 1))
    //   expect(logs[7].args._itemId).to.equal(0)
    //   expect(logs[7].args._issuedId).to.equal(1)
    //   expect(logs[7].args._caller).to.equal(storeContract.address)
    //   expect(logs[8].event).to.be.equal('Transfer')
    //   expect(logs[8].args._from).to.be.equal(buyer)
    //   expect(logs[8].args._to).to.be.equal(feeOwner)
    //   expect(logs[8].args._value).to.equal(feeCharged)
    //   expect(logs[9].event).to.be.equal('Bought')
    //   expect(logs[9].args._itemsToBuy).to.be.eql([
    //     [
    //       collection1.address,
    //       ['0', '0', '2'],
    //       [price10.toString(), price10.toString(), price12.toString()],
    //       [buyer, buyer, buyer],
    //     ],
    //     [collection2.address, ['0'], [price20.toString()], [buyer]],
    //   ])
    //   await buyerBalance.requireDecrease(finalPrice)
    //   await beneficiaryBalance.requireIncrease(
    //     price10
    //       .add(price10)
    //       .add(price12)
    //       .sub(price10Fee.add(price10Fee).add(price12Fee))
    //   )
    //   await otherBeneficiaryBalance.requireIncrease(price20.sub(price20Fee))
    //   await feeOwnerBalance.requireIncrease(feeCharged)
    //   await storeBalance.requireConstant()
    //   itemsCollection1BalanceOfBuyer = await collection1.balanceOf(buyer)
    //   expect(itemsCollection1BalanceOfBuyer).to.equal(3)
    //   itemsCollection2BalanceOfBuyer = await collection2.balanceOf(buyer)
    //   expect(itemsCollection2BalanceOfBuyer).to.equal(1)
    //   let itemId = await collection1.tokenOfOwnerByIndex(buyer, 0)
    //   let uri = await collection1.tokenURI(itemId)
    //   let uriArr = uri.split('/')
    //   expect(0).to.equal(uriArr[uriArr.length - 2])
    //   itemId = await collection1.tokenOfOwnerByIndex(buyer, 1)
    //   uri = await collection1.tokenURI(itemId)
    //   uriArr = uri.split('/')
    //   expect(0).to.equal(uriArr[uriArr.length - 2])
    //   itemId = await collection1.tokenOfOwnerByIndex(buyer, 2)
    //   uri = await collection1.tokenURI(itemId)
    //   uriArr = uri.split('/')
    //   expect(2).to.equal(uriArr[uriArr.length - 2])
    //   itemId = await collection2.tokenOfOwnerByIndex(buyer, 0)
    //   uri = await collection1.tokenURI(itemId)
    //   uriArr = uri.split('/')
    //   expect(0).to.equal(uriArr[uriArr.length - 2])
    // })
    // it('should buy entire outfit :: gas checker', async function () {
    //   const { receipt } = await storeContract.buy(
    //     [
    //       [
    //         collection1.address,
    //         ITEMS.map((_, index) => index),
    //         ITEMS.map((i) => i[1]), // price
    //         ITEMS.map((_) => buyer),
    //       ],
    //     ],
    //     fromBuyer
    //   )
    //   console.log(`Buy ${ITEMS.length} items -> Gas used:: ${receipt.gasUsed}`)
    // })
    // it('reverts when buyer has not balance', async function () {
    //   await uccContract.approve(storeContract.address, -1, fromHacker)
    //   const balance = await uccContract.balanceOf(hacker)
    //   await uccContract.transfer(storeContract.address, balance, fromHacker)
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           collection1.address,
    //           [0], // id
    //           [ITEMS[0][1]], // price
    //           [buyer],
    //         ],
    //       ],
    //       fromHacker
    //     )
    //   )
    // })
    // it('reverts when buyer has not approve the store to use the accepted token on his behalf', async function () {
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           collection1.address,
    //           [0], // id
    //           [ITEMS[0][1]], // price
    //           [buyer],
    //         ],
    //       ],
    //       fromAnotherBuyer
    //     )
    //   )
    // })
    // it('reverts when trying to buy an item not part of the collection', async function () {
    //   const itemsCount = await collection1.itemsCount()
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           collection1.address,
    //           [itemsCount], // id
    //           [ITEMS[0][1]], // price,
    //           [buyer],
    //         ],
    //       ],
    //       fromBuyer
    //     )
    //   )
    // })
    // it('reverts when trying to buy an item from a not allowed collection', async function () {
    //   await collection1.setMinters(
    //     [storeContract.address],
    //     [false],
    //     creationParams
    //   )
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           collection1.address,
    //           [0], // id
    //           [ITEMS[0][1]], // price
    //           [buyer],
    //         ],
    //       ],
    //       fromBuyer
    //     ),
    //     '_issueToken: CALLER_CAN_NOT_MINT'
    //   )
    // })
    // it('reverts when trying to buy more than the amount of items left', async function () {
    //   // Only 1 item left. Trying to buy 2
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           collection2.address,
    //           [1, 1], // id
    //           [COLLECTION2_ITEMS[1][1], COLLECTION2_ITEMS[1][1]], // price
    //           [buyer, buyer],
    //         ],
    //       ],
    //       fromBuyer
    //     ),
    //     '_issueToken: ITEM_EXHAUSTED'
    //   )
    //   // Buy item left
    //   await storeContract.buy(
    //     [
    //       [
    //         collection2.address,
    //         [1], // id
    //         [COLLECTION2_ITEMS[1][1]], // price
    //         [buyer],
    //       ],
    //     ],
    //     fromBuyer
    //   )
    //   // Try again
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           collection2.address,
    //           [1], // id
    //           [COLLECTION2_ITEMS[1][1]], // price
    //           [buyer],
    //         ],
    //       ],
    //       fromBuyer
    //     ),
    //     '_issueToken: ITEM_EXHAUSTED'
    //   )
    // })
    // it('reverts when item price mismatch', async function () {
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           collection1.address,
    //           [0, 0], // id
    //           [
    //             ITEMS[0][1],
    //             BigNumber.from(ITEMS[0][1]).add(BigNumber.from(1)),
    //           ], // price
    //           [buyer, buyer],
    //         ],
    //       ],
    //       fromBuyer
    //     ),
    //     'CollectionStore#buy: ITEM_PRICE_MISMATCH'
    //   )
    // })
    // it('reverts when item id and price length mismatch', async function () {
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           collection1.address,
    //           [0, 0], // id
    //           [ITEMS[0][1]], // price
    //           [buyer],
    //         ],
    //       ],
    //       fromBuyer
    //     ),
    //     'CollectionStore#buy: LENGTH_MISMATCH'
    //   )
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           collection1.address,
    //           [0], // id
    //           [ITEMS[0][1], ITEMS[0][1]], // price
    //           [buyer],
    //         ],
    //       ],
    //       fromBuyer
    //     ),
    //     'CollectionStore#buy: LENGTH_MISMATCH'
    //   )
    // })
    // it('reverts when trying to buy an item from an invalid collection', async function () {
    //   await assertRevert(
    //     storeContract.buy(
    //       [
    //         [
    //           storeContract.address,
    //           [0], // id
    //           [ITEMS[0][1]], // price
    //           [buyer],
    //         ],
    //       ],
    //       fromBuyer
    //     )
    //   )
    // })
  });
});
