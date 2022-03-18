import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import { BigNumberish } from "ethers";
import {
  RESCUE_ITEMS_SELECTOR,
  SET_APPROVE_COLLECTION_SELECTOR,
  SET_EDITABLE_SELECTOR,
} from "./utils";
dotenv.config();

interface RARITY {
  name: string;
  maxSupply: BigNumberish;
  price: BigNumberish;
}
const DEFAULT_RARITY_PRICE = "100000000000000000000" as BigNumberish; // 100 UCC
const OWNER_CUT_PER_MILLION = 25000; // fee percent per million;

const RARITIES: RARITY[] = [
  { name: "common", maxSupply: 100000, price: DEFAULT_RARITY_PRICE },
  { name: "uncommon", maxSupply: 10000, price: DEFAULT_RARITY_PRICE },
  { name: "rare", maxSupply: 5000, price: DEFAULT_RARITY_PRICE },
  { name: "epic", maxSupply: 1000, price: DEFAULT_RARITY_PRICE },
  { name: "legendary", maxSupply: 100, price: DEFAULT_RARITY_PRICE },
  { name: "mythic", maxSupply: 10, price: DEFAULT_RARITY_PRICE },
  { name: "unique", maxSupply: 1, price: DEFAULT_RARITY_PRICE },
];

enum NETWORKS {
  "ZNX_TESTNET" = "ZNX_TESTNET",
}

enum UCC {
  "ZNX_TESTNET" = "0x8A2AA3F73402972FeBBE74a1f99390158C8802Be",
}

const network = NETWORKS[process.env["NETWORK"] as NETWORKS];
if (!network) {
  throw "Invalid network";
}

/**
 * @dev Steps:
 * Deploy the Collection implementation
 * Deploy the committee with the desired members. The owner will be the DAO contract / currently a EOA
 * Deploy the collection Manager. The owner will be the DAO contract / currently a EOA
 * Deploy the forwarder. Caller Is the collection manager.
 * Deploy the collection Factory. Owner is the forwarder.
 */
async function main() {
  const owner: string = process.env["OWNER"]!;
  const collectionDeploymentsFeesCollector = process.env["OWNER"];

  const account = ethers.provider.getSigner();
  const accountAddress = await account.getAddress();

  // Deploy the collection implementation
  const Collection = await ethers.getContractFactory("ERC721Collection");
  const collectonImp = await Collection.deploy();

  // Deploy the rarities
  const Rarities = await ethers.getContractFactory("Rarities");
  const rarities = await Rarities.deploy(owner, RARITIES);

  // Deploy the committee
  const Committee = await ethers.getContractFactory("Committee");
  const committee = await Committee.deploy(
    owner,
    process.env["COMMITTEE_MEMBERS"]?.split(",")
  );

  // Deploy the collection manager
  const CollectionManager = await ethers.getContractFactory(
    "CollectionManager"
  );
  const collectionManager = await CollectionManager.deploy(
    owner,
    UCC[network],
    committee.address,
    collectionDeploymentsFeesCollector,
    rarities.address,
    [
      RESCUE_ITEMS_SELECTOR,
      SET_APPROVE_COLLECTION_SELECTOR,
      SET_EDITABLE_SELECTOR,
    ],
    [true, true, true]
  );

  // Deploy the forwarder
  const Forwarder = await ethers.getContractFactory("Forwarder");
  const forwarder = await Forwarder.deploy(owner, collectionManager.address);

  // Deploy the Collection Factory
  const ERC721CollectionFactory = await ethers.getContractFactory(
    "ERC721CollectionFactory"
  );
  const collectionFactory = await ERC721CollectionFactory.deploy(
    forwarder.address,
    collectonImp.address
  );

  // Deploy collection store
  const CollectionStore = await ethers.getContractFactory("CollectionStore");
  const collectionStore = await CollectionStore.deploy(
    owner,
    UCC[network],
    owner,
    OWNER_CUT_PER_MILLION
  );

  console.log(`Contract deployed by: ${accountAddress}`);
  console.log("Collection imp:", collectonImp.address);
  console.log("Rarities:", rarities.address);
  console.log("Committee:", committee.address);
  console.log("Collection Manager :", collectionManager.address);
  console.log("Forwarder:", forwarder.address);
  console.log("Collection Factory:", collectionFactory.address);
  console.log("Collection Store:", collectionStore.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
