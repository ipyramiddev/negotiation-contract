// import chai, { expect } from "chai";
// import { BigNumber, Contract, Signer } from "ethers";
// import { ethers } from "hardhat";
// import { getChainId } from "./helper/ChainId";

// import {
//   ZERO_ADDRESS,
//   getInitialRarities,
//   getRarityNames,
//   genRanHex,
//   ITEMS,
//   getInitData,
//   RARITIES_OBJECT,
// } from "./helper/Collection";
// import {
//   hexlify,
//   keccak256,
//   solidityKeccak256,
//   solidityPack,
//   zeroPad,
// } from "ethers/lib/utils";

// describe("CollectionFactory", function () {
//   let CollectionImplementation, FactoryContract, RaritiesContract;

//   let collectionImplementation: Contract,
//     factoryContract: Contract,
//     raritiesContract: Contract;

//   let deployer: Signer, user: Signer, factoryOwner: Signer, hacker: Signer;

//   let deployerAddr: string,
//     userAddr: string,
//     factoryOwnerAddr: string,
//     hackerAddr: string;

//   beforeEach(async function () {
//     [deployer, user, factoryOwner, hacker] = await ethers.getSigners();
//     [deployerAddr, userAddr, factoryOwnerAddr, hackerAddr] = await Promise.all([
//       deployer.getAddress(),
//       user.getAddress(),
//       factoryOwner.getAddress(),
//       hacker.getAddress(),
//     ]);

//     RaritiesContract = await ethers.getContractFactory("Rarities");
//     raritiesContract = await RaritiesContract.deploy(
//       deployerAddr,
//       getInitialRarities()
//     );
//     CollectionImplementation = await ethers.getContractFactory(
//       "ERC721Collection"
//     );
//     collectionImplementation = await CollectionImplementation.deploy();

//     FactoryContract = await ethers.getContractFactory(
//       "ERC721CollectionFactory"
//     );
//     factoryContract = await FactoryContract.deploy(
//       factoryOwnerAddr,
//       collectionImplementation.address
//     );
//   });

//   describe("create factory", async function () {
//     it("deploy with correct values", async function () {
//       const CollectionImpl = await ethers.getContractFactory(
//         "ERC721Collection"
//       );
//       const collectionImpl = await CollectionImpl.connect(
//         factoryOwner
//       ).deploy();

//       const Contract = await ethers.getContractFactory(
//         "ERC721CollectionFactory"
//       );
//       const contract = await Contract.deploy(
//         factoryOwnerAddr,
//         collectionImpl.address
//       );

//       const expectedCode = `0x3d602d80600a3d3981f3363d3d373d3d3d363d73${collectionImpl.address.replace(
//         "0x",
//         ""
//       )}5af43d82803e903d91602b57fd5bf3`;

//       expect(await contract.implementation()).to.be.equal(
//         collectionImpl.address
//       );
//       expect(await contract.owner()).to.be.equal(factoryOwnerAddr);
//       expect(await contract.code()).to.be.equal(expectedCode.toLowerCase());
//       expect(await contract.codeHash()).to.be.equal(
//         solidityKeccak256(["bytes"], [expectedCode])
//       );
//     });
//   });
//   describe("getAddress", function () {
//     it("should get a deterministic address on-chain", async function () {
//       const salt = "0x" + genRanHex(64);
//       const data = getInitData({
//         creator: userAddr,
//         shouldComplete: true,
//         isApproved: true,
//         rarities: raritiesContract.address,
//       });
//       const expectedAddress = await factoryContract.getAddress(
//         salt,
//         factoryOwnerAddr,
//         data
//       );
//       let createCollectionTx = await factoryContract
//         .connect(factoryOwner)
//         .createCollection(salt, data);
//       let logs = (await createCollectionTx.wait()).events;

//       expect(logs[0].args._address.toLowerCase()).to.be.equal(
//         expectedAddress.toLowerCase()
//       );
//     });

//     it("should get a deterministic address off-chain", async function () {
//       const codeHash = await factoryContract.codeHash();
//       console.log(`Codehash: ${codeHash}`);
//       const salt = "0x" + genRanHex(64);
//       const data = getInitData({
//         creator: userAddr,
//         shouldComplete: true,
//         isApproved: true,
//         rarities: raritiesContract.address,
//       });
//       const expectedAddress = `0x${keccak256(
//         solidityPack(
//           ["bytes1", "address", "bytes32", "bytes32"],
//           [
//             "0xff",
//             factoryContract.address,
//             keccak256(
//               solidityPack(
//                 ["bytes32", "address", "bytes"],
//                 [salt, factoryOwnerAddr, data]
//               )
//             ),
//             codeHash,
//           ]
//         )
//       ).slice(-40)}`.toLowerCase();
//       let createCollectionTx = await factoryContract
//         .connect(factoryOwner)
//         .createCollection(salt, data);
//       let logs = (await createCollectionTx.wait()).events;

//       expect(logs[0].args._address.toLowerCase()).to.be.equal(
//         expectedAddress.toLowerCase()
//       );
//     });
//   });
//   describe("createCollection", function () {
//     const name = "collectionName";
//     const symbol = "collectionSymbol";
//     const shouldComplete = true;
//     const baseURI = "collectionBaseURI";
//     const items = [];

//     it("should create a collection", async function () {
//       const salt = "0x" + genRanHex(64);
//       const data = getInitData({
//         name,
//         symbol,
//         baseURI,
//         creator: userAddr,
//         shouldComplete: true,
//         isApproved: true,
//         items: ITEMS,
//         rarities: raritiesContract.address,
//       });
//       const expectedAddress = await factoryContract.getAddress(
//         salt,
//         factoryOwnerAddr,
//         data
//       );

//       let collectionsSize = await factoryContract.collectionsSize();
//       expect(collectionsSize).to.eq(0);

//       let isCollectionFromFactory =
//         await factoryContract.isCollectionFromFactory(expectedAddress);
//       expect(isCollectionFromFactory).to.equal(false);

//       let createCollectionTx = await factoryContract
//         .connect(factoryOwner)
//         .createCollection(salt, data);
//       let logs = (await createCollectionTx.wait()).events;

//       expect(logs[0].args._address.toLowerCase()).to.be.equal(
//         expectedAddress.toLowerCase()
//       );

//       expect(logs.length).to.be.equal(13);

//       let log = logs[0];
//       expect(log.event).to.be.equal("ProxyCreated");
//       expect(log.args._address).to.be.equal(expectedAddress);
//       expect(log.args._salt).to.be.equal(hexlify(salt));

//       log = logs[1];
//       expect(log.event).to.be.equal("OwnershipTransferred");
//       expect(log.args.previousOwner).to.be.equal(ZERO_ADDRESS);
//       expect(log.args.newOwner).to.be.equal(factoryContract.address);

//       log = logs[12];
//       expect(log.event).to.be.equal("OwnershipTransferred");
//       expect(log.args.previousOwner).to.be.equal(factoryContract.address);
//       expect(log.args.newOwner).to.be.equal(factoryOwnerAddr);

//       collectionsSize = await factoryContract.collectionsSize();
//       expect(collectionsSize).to.equal(1);

//       isCollectionFromFactory = await factoryContract.isCollectionFromFactory(
//         expectedAddress
//       );
//       expect(isCollectionFromFactory).to.equal(true);
//     });

//     it("should create a collection with items", async function () {
//       const salt = "0x" + genRanHex(64);
//       const data = getInitData({
//         name,
//         symbol,
//         baseURI,
//         creator: userAddr,
//         shouldComplete: true,
//         isApproved: true,
//         items: ITEMS,
//         rarities: raritiesContract.address,
//       });
//       const expectedAddress = await factoryContract.getAddress(
//         salt,
//         factoryOwnerAddr,
//         data
//       );

//       let collectionsSize = await factoryContract.collectionsSize();
//       expect(collectionsSize).to.equal(0);

//       let isCollectionFromFactory =
//         await factoryContract.isCollectionFromFactory(expectedAddress);
//       expect(isCollectionFromFactory).to.equal(false);

//       let createCollectionTx = await factoryContract
//         .connect(factoryOwner)
//         .createCollection(salt, data);
//       let logs = (await createCollectionTx.wait()).events;

//       expect(logs.length).to.be.equal(13);

//       let log = logs[0];
//       expect(log.event).to.be.equal("ProxyCreated");
//       expect(log.args._address).to.be.equal(expectedAddress);
//       expect(log.args._salt).to.be.equal(hexlify(salt));

//       log = logs[1];
//       expect(log.event).to.be.equal("OwnershipTransferred");
//       expect(log.args.previousOwner).to.be.equal(ZERO_ADDRESS);
//       expect(log.args.newOwner).to.be.equal(factoryContract.address);

//       log = logs[12];
//       expect(log.event).to.be.equal("OwnershipTransferred");
//       expect(log.args.previousOwner).to.be.equal(factoryContract.address);
//       expect(log.args.newOwner).to.be.equal(factoryOwnerAddr);

//       // Check collection data
//       const collection = await ethers.getContractAt(
//         "ERC721Collection",
//         expectedAddress
//       );
//       const baseURI_ = await collection.baseURI();
//       const creator_ = await collection.creator();
//       const owner_ = await collection.owner();
//       const name_ = await collection.name();
//       const symbol_ = await collection.symbol();
//       const isInitialized_ = await collection.isInitialized();
//       const isApproved_ = await collection.isApproved();
//       const isCompleted_ = await collection.isCompleted();
//       const isEditable_ = await collection.isEditable();
//       const rarities_ = await collection.rarities();

//       expect(baseURI_).to.be.equal(baseURI);
//       expect(creator_).to.be.equal(userAddr);
//       expect(owner_).to.be.equal(factoryOwnerAddr);
//       expect(name_).to.be.equal(name);
//       expect(symbol_).to.be.equal(symbol);
//       expect(isInitialized_).to.be.equal(true);
//       expect(isApproved_).to.be.equal(false);
//       expect(isCompleted_).to.be.equal(shouldComplete);
//       expect(isEditable_).to.be.equal(true);
//       expect(rarities_).to.be.equal(raritiesContract.address);

//       const itemLength = await collection.itemsCount();

//       expect(ITEMS.length).to.equal(itemLength);

//       for (let i = 0; i < ITEMS.length; i++) {
//         const {
//           rarity,
//           maxSupply,
//           totalSupply,
//           price,
//           beneficiary,
//           metadata,
//           contentHash,
//         } = await collection.items(i);

//         expect(rarity).to.equal(ITEMS[i][0]);
//         expect(maxSupply).to.equal(
//           RARITIES_OBJECT[ITEMS[i][0].toString()].value
//         );
//         expect(totalSupply).to.equal(0);
//         expect(price).to.equal(ITEMS[i][1]);
//         expect(beneficiary.toLowerCase()).to.be.equal(
//           ITEMS[i][2].toString().toLowerCase()
//         );
//         expect(metadata).to.be.equal(ITEMS[i][3]);
//         expect(contentHash).to.be.equal("");
//       }

//       collectionsSize = await factoryContract.collectionsSize();
//       expect(collectionsSize).to.equal(1);

//       isCollectionFromFactory = await factoryContract.isCollectionFromFactory(
//         expectedAddress
//       );
//       expect(isCollectionFromFactory).to.equal(true);
//     });

//     it("should create different addresses from different salts", async function () {
//       const salt1 = "0x" + genRanHex(64);
//       const salt2 = "0x" + genRanHex(64);

//       let collectionsSize = await factoryContract.collectionsSize();
//       expect(collectionsSize).to.equal(0);

//       const createCollectionTx1 = await factoryContract
//         .connect(factoryOwner)
//         .createCollection(
//           salt1,
//           getInitData({
//             name,
//             symbol,
//             baseURI,
//             creator: userAddr,
//             shouldComplete: true,
//             isApproved: true,
//             items: ITEMS,
//             rarities: raritiesContract.address,
//           })
//         );

//       let logs = (await createCollectionTx1.wait()).events;
//       const address1 = logs[0].args._address;

//       const createCollectionTx2 = await factoryContract
//         .connect(factoryOwner)
//         .createCollection(
//           salt2,
//           getInitData({
//             name,
//             symbol,
//             baseURI,
//             creator: userAddr,
//             shouldComplete: true,
//             isApproved: true,
//             items: ITEMS,
//             rarities: raritiesContract.address,
//           })
//         );

//       logs = (await createCollectionTx2.wait()).events;

//       const address2 = logs[0].args._address;

//       expect(address2).to.not.be.equal(address1);

//       collectionsSize = await factoryContract.collectionsSize();
//       expect(collectionsSize).to.equal(2);

//       let isCollectionFromFactory =
//         await factoryContract.isCollectionFromFactory(address1);
//       expect(isCollectionFromFactory).to.equal(true);

//       isCollectionFromFactory = await factoryContract.isCollectionFromFactory(
//         address2
//       );
//       expect(isCollectionFromFactory).to.equal(true);
//     });

//     it("reverts if initialize call failed", async function () {
//       const salt = "0x" + genRanHex(64);

//       await expect(
//         factoryContract.connect(factoryOwner).createCollection(
//           salt,
//           getInitData({
//             name,
//             symbol,
//             baseURI,
//             creator: ZERO_ADDRESS,
//             shouldComplete: true,
//             isApproved: true,
//             items: ITEMS,
//             rarities: raritiesContract.address,
//           })
//         )
//       ).to.be.revertedWith("MinimalProxyFactory#createProxy: CALL_FAILED");
//     });

//     it("reverts if trying to re-deploy the same collection", async function () {
//       const salt = "0x" + genRanHex(64);

//       await factoryContract.connect(factoryOwner).createCollection(
//         salt,
//         getInitData({
//           name,
//           symbol,
//           baseURI,
//           creator: userAddr,
//           shouldComplete: true,
//           isApproved: true,
//           items: ITEMS,
//           rarities: raritiesContract.address,
//         })
//       );

//       await expect(
//         factoryContract.connect(factoryOwner).createCollection(
//           salt,
//           getInitData({
//             name,
//             symbol,
//             baseURI,
//             creator: userAddr,
//             shouldComplete: true,
//             isApproved: true,
//             items: ITEMS,
//             rarities: raritiesContract.address,
//           })
//         )
//       ).to.be.revertedWith("MinimalProxyFactory#createProxy: CREATION_FAILED");
//     });

//     it("reverts if trying to create a collection by not the owner", async function () {
//       const salt = "0x" + genRanHex(64);

//       await expect(
//         factoryContract.connect(user).createCollection(
//           salt,
//           getInitData({
//             name,
//             symbol,
//             baseURI,
//             creator: userAddr,
//             shouldComplete: true,
//             isApproved: true,
//             items: ITEMS,
//             rarities: raritiesContract.address,
//           })
//         )
//       ).to.be.revertedWith("Ownable: caller is not the owner");
//     });
//   });
// });
