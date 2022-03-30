import { increaseTime } from "./helper/increase";
import { ethers } from "hardhat";
// import { encodeTokenId } from "./helper/Utils";
import { doTest } from "./helper/baseCollection";
import { BigNumber, Contract, Signer } from "ethers";
import {
  ITEMS,
  CONTRACT_NAME,
  CONTRACT_SYMBOL,
  BASE_URI,
  GRACE_PERIOD,
  getInitialRarities,
  encodeTokenId,
} from "./helper/Collection";

async function issueItem(
  contract: any,
  beneficiary: any,
  index: any,
  from: any
) {
  await contract.connect(from).issueTokens([beneficiary], [index]);
}

describe("Collection", function () {
  let ERC721Collection: any, Rarities: any;
  let rarities: any, collectionContract: any;
  // option id = 0
  // issued id = 1
  const token1 = encodeTokenId(0, 1);

  // option id = 0
  const token2 = encodeTokenId(0, 2);
  // issued id =, token1 2

  // option id = 1
  const token3 = encodeTokenId(1, 1);
  // issued id =, token1 1

  before(async function () {
    Rarities = await ethers.getContractFactory("Rarities");
    ERC721Collection = await ethers.getContractFactory("ERC721Collection");
  });

  describe("doTest", function () {
    it("call doTest function", async function () {
      doTest(
        ERC721Collection,
        async (
          creator: any,
          shouldComplete: any,
          shouldApprove: any,
          shouldPassGracePeriod: any
        ) => {
          rarities = await Rarities.deploy(creator, getInitialRarities());
          collectionContract = await ERC721Collection.deploy();
          await collectionContract.initialize(
            CONTRACT_NAME,
            CONTRACT_SYMBOL,
            BASE_URI,
            creator,
            shouldComplete,
            shouldApprove,
            rarities.address,
            ITEMS
          );
          if (shouldPassGracePeriod) {
            await increaseTime(GRACE_PERIOD);
          }
          return collectionContract;
        },
        CONTRACT_NAME,
        CONTRACT_SYMBOL,
        ITEMS,
        issueItem,
        null,
        [token1, token2, token3]
      );
    });
  });
});
