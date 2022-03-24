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

  describe("addRarity", function () {
    const newRarity1 = ["newrarity1", "2", "1"];
    const newRarity2 = ["newrarity2", "4", "2"];

    it("should add a rarity", async function () {
      raritiesContract = await RaritiesContract.deploy(
        deployerAddr,
        getInitialRarities()
      );
      let raritiesCount = await raritiesContract.raritiesCount();
      expect(raritiesCount).to.equal(7);

      const tx = await raritiesContract
        .connect(deployer)
        .addRarities([newRarity1]);
      const logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(1);
      expect(logs[0].event).to.be.equal("AddRarity");
      expect(logs[0].args._rarity[0]).to.equal(newRarity1[0]);
      expect(logs[0].args._rarity[1]).to.equal(newRarity1[1]);
      expect(logs[0].args._rarity[2]).to.equal(newRarity1[2]);

      raritiesCount = await raritiesContract.raritiesCount();
      expect(raritiesCount).to.equal(8);

      const rarity = await raritiesContract.getRarityByName(newRarity1[0]);
      expect(rarity.name).to.be.equal(newRarity1[0]);
      expect(rarity.maxSupply).to.equal(newRarity1[1]);
      expect(rarity.price).to.equal(newRarity1[2]);
    });

    it("should add rarities", async function () {
      let raritiesCount = await raritiesContract.raritiesCount();
      expect(raritiesCount).to.equal(7);

      const tx = await raritiesContract.addRarities([newRarity1, newRarity2]);
      const logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(2);
      expect(logs[0].event).to.be.equal("AddRarity");
      expect(logs[0].args._rarity[0]).to.equal(newRarity1[0]);
      expect(logs[0].args._rarity[1]).to.equal(newRarity1[1]);
      expect(logs[0].args._rarity[2]).to.equal(newRarity1[2]);

      expect(logs[1].event).to.be.equal("AddRarity");
      expect(logs[1].args._rarity[0]).to.equal(newRarity2[0]);
      expect(logs[1].args._rarity[1]).to.equal(newRarity2[1]);
      expect(logs[1].args._rarity[2]).to.equal(newRarity2[2]);

      raritiesCount = await raritiesContract.raritiesCount();
      expect(raritiesCount).to.equal(9);

      let rarity = await raritiesContract.getRarityByName(newRarity1[0]);
      expect(rarity.name).to.be.equal(newRarity1[0]);
      expect(rarity.maxSupply).to.equal(newRarity1[1]);
      expect(rarity.price).to.equal(newRarity1[2]);

      rarity = await raritiesContract.getRarityByName(newRarity2[0]);
      expect(rarity.name).to.be.equal(newRarity2[0]);
      expect(rarity.maxSupply).to.equal(newRarity2[1]);
      expect(rarity.price).to.equal(newRarity2[2]);
    });

    it("should add rarities :: Relayed EIP721", async function () {
      let raritiesCount = await raritiesContract.raritiesCount();
      expect(raritiesCount).to.equal(7);

      const abi = [
        {
          inputs: [
            {
              components: [
                {
                  internalType: "string",
                  name: "name",
                  type: "string",
                },
                {
                  internalType: "uint256",
                  name: "maxSupply",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "price",
                  type: "uint256",
                },
              ],
              internalType: "struct Rarities.Rarity[]",
              name: "_rarities",
              type: "tuple[]",
            },
          ],
          name: "addRarities",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(abi);
      const functionSignature = iface.encodeFunctionData("addRarities", [
        [newRarity1, newRarity2],
      ]);

      const tx = await sendMetaTx(
        raritiesContract,
        functionSignature,
        deployerAddr,
        relayer,
        null,
        domain,
        version
      );
      const logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(3);

      expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
      expect(logs[0].args.userAddress).to.be.equal(deployerAddr);
      expect(logs[0].args.relayerAddress).to.be.equal(relayerAddr);
      expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

      expect(logs[1].event).to.be.equal("AddRarity");
      expect(logs[1].args._rarity[0]).to.equal(newRarity1[0]);
      expect(logs[1].args._rarity[1]).to.equal(newRarity1[1]);
      expect(logs[1].args._rarity[2]).to.equal(newRarity1[2]);

      expect(logs[2].event).to.be.equal("AddRarity");
      expect(logs[2].args._rarity[0]).to.equal(newRarity2[0]);
      expect(logs[2].args._rarity[1]).to.equal(newRarity2[1]);
      expect(logs[2].args._rarity[2]).to.equal(newRarity2[2]);

      raritiesCount = await raritiesContract.raritiesCount();
      expect(raritiesCount).to.equal(9);

      let rarity = await raritiesContract.getRarityByName(newRarity1[0]);
      expect(rarity.name).to.be.equal(newRarity1[0]);
      expect(rarity.maxSupply).to.equal(newRarity1[1]);
      expect(rarity.price).to.equal(newRarity1[2]);

      rarity = await raritiesContract.getRarityByName(newRarity2[0]);
      expect(rarity.name).to.be.equal(newRarity2[0]);
      expect(rarity.maxSupply).to.equal(newRarity2[1]);
      expect(rarity.price).to.equal(newRarity2[2]);
    });

    it("should accept a rarity with a mix of characters in the name", async function () {
      const newRarity = ["newRarity-v2", "2", "1"];

      let raritiesCount = await raritiesContract.raritiesCount();
      expect(raritiesCount).to.equal(7);

      const tx = await raritiesContract.addRarities([newRarity]);
      const logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(1);
      expect(logs[0].event).to.be.equal("AddRarity");
      expect(logs[0].args._rarity[0]).to.equal(newRarity[0]);
      expect(logs[0].args._rarity[1]).to.equal(newRarity[1]);
      expect(logs[0].args._rarity[2]).to.equal(newRarity[2]);

      raritiesCount = await raritiesContract.raritiesCount();
      expect(raritiesCount).to.equal(8);

      const rarity = await raritiesContract.getRarityByName(newRarity[0]);
      expect(rarity.name).to.be.equal(newRarity[0]);
      expect(rarity.maxSupply).to.equal(newRarity[1]);
      expect(rarity.price).to.equal(newRarity[2]);
    });

    it("reverts when trying to add an already added rarity", async function () {
      await raritiesContract.addRarities([newRarity1]);

      await expect(
        raritiesContract.addRarities([newRarity1])
      ).to.be.revertedWith("Rarities#_addRarity: RARITY_ALREADY_ADDED");
    });

    it("reverts when trying to add a rarity with name greater than 32", async function () {
      const rarity = ["thetexthasmore32charactersforname", "10", "10"];

      await expect(raritiesContract.addRarities([rarity])).to.be.revertedWith(
        "Rarities#_addRarity: INVALID_LENGTH"
      );
    });

    it("reverts when trying to add a rarity with empty name", async function () {
      const rarity = ["", "10", "10"];

      await expect(raritiesContract.addRarities([rarity])).to.be.revertedWith(
        "Rarities#_addRarity: INVALID_LENGTH"
      );
    });

    it("reverts when trying to add a rarity by hacker", async function () {
      const rarity = ["rarityname", "10", "10"];

      await expect(
        raritiesContract.connect(hacker).addRarities([rarity])
      ).to.be.revertedWith("Ownable: caller is not the owner");

      const abi = [
        {
          inputs: [
            {
              components: [
                {
                  internalType: "string",
                  name: "name",
                  type: "string",
                },
                {
                  internalType: "uint256",
                  name: "maxSupply",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "price",
                  type: "uint256",
                },
              ],
              internalType: "struct Rarities.Rarity[]",
              name: "_rarities",
              type: "tuple[]",
            },
          ],
          name: "addRarities",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      let iface = new ethers.utils.Interface(abi);
      const functionSignature = iface.encodeFunctionData("addRarities", [
        [newRarity1, newRarity2],
      ]);

      await expect(
        sendMetaTx(
          raritiesContract,
          functionSignature,
          hackerAddr,
          relayer,
          null,
          domain,
          version
        )
      ).to.be.revertedWith("NMT#executeMetaTransaction: CALL_FAILED");
    });
  });
  describe("updatePrice", function () {
    const newRarity1 = ["newrarity1", "2", "1"];
    const newRarity2 = ["newrarity-V2", "4", "2"];

    const newPrice1 = "10";
    const newPrice2 = "0";

    beforeEach(async () => {
      await raritiesContract.addRarities([newRarity1, newRarity2]);
    });

    it("should update a rarity's price", async function () {
      let rarity = await raritiesContract.getRarityByName(newRarity1[0]);
      expect(rarity.name).to.be.equal(newRarity1[0]);
      expect(rarity.maxSupply).to.equal(newRarity1[1]);
      expect(rarity.price).to.equal(newRarity1[2]);

      const tx = await raritiesContract.updatePrices(
        [newRarity1[0]],
        [newPrice1]
      );
      const logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(1);
      expect(logs[0].event).to.be.equal("UpdatePrice");
      expect(logs[0].args._name).to.be.equal(newRarity1[0]);
      expect(logs[0].args._price).to.equal(newPrice1);

      rarity = await raritiesContract.getRarityByName(newRarity1[0]);
      expect(rarity.name).to.be.equal(newRarity1[0]);
      expect(rarity.maxSupply).to.equal(newRarity1[1]);
      expect(rarity.price).to.equal(newPrice1);
    });

    it("should update rarities' prices", async function () {
      let rarity = await raritiesContract.getRarityByName(newRarity1[0]);
      expect(rarity.name).to.be.equal(newRarity1[0]);
      expect(rarity.maxSupply).to.equal(newRarity1[1]);
      expect(rarity.price).to.equal(newRarity1[2]);

      rarity = await raritiesContract.getRarityByName(newRarity2[0]);
      expect(rarity.name).to.be.equal(newRarity2[0]);
      expect(rarity.maxSupply).to.equal(newRarity2[1]);
      expect(rarity.price).to.equal(newRarity2[2]);

      const tx = await raritiesContract.updatePrices(
        [newRarity1[0], newRarity2[0]],
        [newPrice1, newPrice2]
      );
      const logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(2);
      expect(logs[0].event).to.be.equal("UpdatePrice");
      expect(logs[0].args._name).to.be.equal(newRarity1[0]);
      expect(logs[0].args._price).to.equal(newPrice1);

      expect(logs[1].event).to.be.equal("UpdatePrice");
      expect(logs[1].args._name).to.be.equal(newRarity2[0]);
      expect(logs[1].args._price).to.equal(newPrice2);

      rarity = await raritiesContract.getRarityByName(newRarity1[0]);
      expect(rarity.name).to.be.equal(newRarity1[0]);
      expect(rarity.maxSupply).to.equal(newRarity1[1]);
      expect(rarity.price).to.equal(newPrice1);

      rarity = await raritiesContract.getRarityByName(newRarity2[0]);
      expect(rarity.name).to.be.equal(newRarity2[0]);
      expect(rarity.maxSupply).to.equal(newRarity2[1]);
      expect(rarity.price).to.equal(newPrice2);
    });

    it("should update rarities' prices :: Relayed EIP721", async function () {
      let rarity = await raritiesContract.getRarityByName(newRarity1[0]);
      expect(rarity.name).to.be.equal(newRarity1[0]);
      expect(rarity.maxSupply).to.equal(newRarity1[1]);
      expect(rarity.price).to.equal(newRarity1[2]);

      rarity = await raritiesContract.getRarityByName(newRarity2[0]);
      expect(rarity.name).to.be.equal(newRarity2[0]);
      expect(rarity.maxSupply).to.equal(newRarity2[1]);
      expect(rarity.price).to.equal(newRarity2[2]);

      const updatePricesABI = [
        {
          inputs: [
            {
              internalType: "string[]",
              name: "_names",
              type: "string[]",
            },
            {
              internalType: "uint256[]",
              name: "_prices",
              type: "uint256[]",
            },
          ],
          name: "updatePrices",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      const iface = new ethers.utils.Interface(updatePricesABI);

      const functionSignature = iface.encodeFunctionData("updatePrices", [
        [newRarity1[0], newRarity2[0]],
        [newPrice1, newPrice2],
      ]);

      const tx = await sendMetaTx(
        raritiesContract,
        functionSignature,
        deployerAddr,
        relayer,
        null,
        domain,
        version
      );
      const logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(3);

      expect(logs[0].event).to.be.equal("MetaTransactionExecuted");
      expect(logs[0].args.userAddress).to.be.equal(deployerAddr);
      expect(logs[0].args.relayerAddress).to.be.equal(relayerAddr);
      expect(logs[0].args.functionSignature).to.be.equal(functionSignature);

      expect(logs[1].event).to.be.equal("UpdatePrice");
      expect(logs[1].args._name).to.be.equal(newRarity1[0]);
      expect(logs[1].args._price).to.equal(newPrice1);

      expect(logs[2].event).to.be.equal("UpdatePrice");
      expect(logs[2].args._name).to.be.equal(newRarity2[0]);
      expect(logs[2].args._price).to.equal(newPrice2);

      rarity = await raritiesContract.getRarityByName(newRarity1[0]);
      expect(rarity.name).to.be.equal(newRarity1[0]);
      expect(rarity.maxSupply).to.equal(newRarity1[1]);
      expect(rarity.price).to.equal(newPrice1);

      rarity = await raritiesContract.getRarityByName(newRarity2[0]);
      expect(rarity.name).to.be.equal(newRarity2[0]);
      expect(rarity.maxSupply).to.equal(newRarity2[1]);
      expect(rarity.price).to.equal(newPrice2);
    });

    it("reverts when params' length mismatch", async function () {
      await expect(
        raritiesContract.updatePrices([newRarity1[0]], [newPrice1, newPrice2])
      ).to.be.revertedWith("Rarities#updatePrices: LENGTH_MISMATCH");

      await expect(
        raritiesContract.updatePrices(
          [newRarity1[0], newRarity2[0]],
          [newPrice1]
        )
      ).to.be.revertedWith("Rarities#updatePrices: LENGTH_MISMATCH");
    });

    it("reverts when trying to update an invalid rarity's price", async function () {
      await expect(
        raritiesContract.updatePrices(
          ["invalid", newRarity2[0]],
          [newPrice1, newPrice2]
        )
      ).to.be.revertedWith("Rarities#updatePrices: INVALID_RARITY");
    });

    it("reverts when trying to update a rarity's price by hacker", async function () {
      await expect(
        raritiesContract
          .connect(hacker)
          .updatePrices([newRarity1[0]], [newPrice1])
      ).to.be.revertedWith("Ownable: caller is not the owner");

      const updatePricesABI = [
        {
          inputs: [
            {
              internalType: "string[]",
              name: "_names",
              type: "string[]",
            },
            {
              internalType: "uint256[]",
              name: "_prices",
              type: "uint256[]",
            },
          ],
          name: "updatePrices",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ];
      const iface = new ethers.utils.Interface(updatePricesABI);
      const functionSignature = iface.encodeFunctionData("updatePrices", [
        [newRarity1[0], newRarity2[0]],
        [newPrice1, newPrice2],
      ]);

      await expect(
        sendMetaTx(
          raritiesContract,
          functionSignature,
          hackerAddr,
          relayer,
          null,
          domain,
          version
        )
      ).to.be.revertedWith("NMT#executeMetaTransaction: CALL_FAILED");
    });
  });
});
