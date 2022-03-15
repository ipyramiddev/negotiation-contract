import { ethers } from "hardhat";

const RARITIES = [
  { name: "common", index: 0, value: 100000 },
  { name: "uncommon", index: 1, value: 10000 },
  { name: "rare", index: 2, value: 5000 },
  { name: "epic", index: 3, value: 1000 },
  { name: "legendary", index: 4, value: 100 },
  { name: "mythic", index: 5, value: 10 },
  { name: "unique", index: 6, value: 1 },
];

const DEFAULT_RARITY_PRICE = "100000000000000000000"; // 100 UCC

/**
 * @dev Steps:
 * Deploy the Collection implementation
 * Deploy the committee with the desired members. The owner will be the DAO contract / currently a EOA
 * Deploy the collection Manager. The owner will be the DAO contract / currently a EOA
 * Deploy the forwarder. Caller Is the collection manager.
 * Deploy the collection Factory. Owner is the forwarder.
 */
async function main() {}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
