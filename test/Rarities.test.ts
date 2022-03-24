import { expect } from "chai";
import { BigNumber, Contract, Signer } from "ethers";
import { ethers } from "hardhat";
import { getChainId } from "./helper/ChainId";
import { sendMetaTx } from "./helper/MetaTx";

import {
  getInitialRarities,
  RARITIES_OBJECT,
  DEFAULT_RARITY_PRICE,
} from "./helper/Collection";

const domain = "Unicial Rarities";
const version = "1";

describe("Rarities", function () {
  this.timeout(100000);

  // Accounts
  let deployer: Signer,
    user: Signer,
    hacker: Signer,
    relayer: Signer,
    creator: Signer;

  let deployerAddr, userAddr, hackerAddr, relayerAddr, creatorAddr;

  // Contracts
  let RaritiesContract, raritiesContract: Contract;

  beforeEach(async function () {
    // Create Listing environment
    [deployer, user, hacker, relayer, creator] = await ethers.getSigners();
    [deployerAddr, userAddr, hackerAddr, relayerAddr, creatorAddr] =
      await Promise.all([
        deployer.getAddress(),
        user.getAddress(),
        hacker.getAddress(),
        relayer.getAddress(),
        creator.getAddress(),
      ]);

    RaritiesContract = await ethers.getContractFactory("Rarities");
    raritiesContract = await RaritiesContract.deploy(
      deployerAddr,
      getInitialRarities()
    );
  });

  describe("initialize", function () {
    it("should be initialized with correct values", async function () {
      const contract = await RaritiesContract.deploy(
        deployerAddr,
        getInitialRarities()
      );

      const owner = await contract.owner();
      expect(owner).to.be.equal(deployerAddr);

      const raritiesCount = await contract.raritiesCount();
      expect(raritiesCount).to.equal(7);

      for (let i = 0; i < raritiesCount.toNumber(); i++) {
        const rarity = await contract.rarities(i);
        expect(rarity.name).to.be.equal(RARITIES_OBJECT[rarity.name].name);
        expect(rarity.maxSupply).to.equal(RARITIES_OBJECT[rarity.name].value);
        expect(rarity.price).to.equal(DEFAULT_RARITY_PRICE);
      }
    });
  });

  describe("getRarityByName", function () {
    it("should get rarity", async function () {
      const raritiesCount = await raritiesContract.raritiesCount();
      expect(raritiesCount).to.equal(7);

      for (const rarityName in RARITIES_OBJECT) {
        const rarity = await raritiesContract.getRarityByName(
          RARITIES_OBJECT[rarityName].name
        );

        expect(rarity.name).to.be.equal(RARITIES_OBJECT[rarityName].name);
        expect(rarity.maxSupply).to.equal(RARITIES_OBJECT[rarityName].value);
        expect(rarity.price).to.equal(DEFAULT_RARITY_PRICE);
      }
    });

    it("should get rarity by using special characters", async function () {
      const newRarity = ["newrarity-V2", "4", "2"];

      await raritiesContract.connect(deployer).addRarities([newRarity]);
      const inputs = [
        newRarity[0],
        "NEWRARITY-V2",
        "NewRarity-V2",
        "newrarity-v2",
      ];
      for (const input of inputs) {
        const rarity = await raritiesContract.getRarityByName(input);

        expect(rarity.name).to.be.equal(newRarity[0]);
        expect(rarity.maxSupply).to.equal(newRarity[1]);
        expect(rarity.price).to.equal(newRarity[2]);
      }
    });

    it("reverts when trying to get rarity by an invalid name", async function () {
      await expect(
        raritiesContract.getRarityByName("invalid")
      ).to.be.revertedWith("Rarities#getRarityByName: INVALID_RARITY");
    });
  });
});
