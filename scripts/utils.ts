import { Interface } from "ethers/lib/utils";
import { ERC721CollectionABI } from "./abis/ERC721Collection.abi";

export function getDeployParams() {
  return {
    url:
      process.env[`RPC_URL_${process.env["NETWORK"]}`] ||
      "https://testrpc1.znxscan.com",
    accounts: process.env["MNEMONIC"]
      ? {
          mnemonic: process.env["MNEMONIC"]
            ? process.env["MNEMONIC"].replace(/,/g, " ")
            : "test test test test test test test test test test test junk",

          initialIndex: 0,
          count: 10,
          path: `m/44'/60'/0'/0`,
        }
      : [
          process.env["PRIV_KEY"]
            ? process.env["PRIV_KEY"]
            : "0x12345678911111111111111111111111111111111111111111111111111111",
        ],
    gas: 12000000,
    blockGasLimit: 0x1fffffffffffff,
    allowUnlimitedContractSize: true,
  };
}

/** 
  @dev
  Function selectors can be generated like below using ethers library
*/
// const iface = new Interface(ERC721CollectionABI);
// console.log("RESCUE_ITEMS_SELECTOR", iface.getSighash("rescueItems"));
// console.log("SET_APPROVE_COLLECTION_SELECTOR", iface.getSighash("setApproved"));
// console.log("SET_EDITABLE_SELECTOR", iface.getSighash("setEditable"));

export const RESCUE_ITEMS_SELECTOR = "0x3c963655";
export const SET_APPROVE_COLLECTION_SELECTOR = "0x46d5a568";
export const SET_EDITABLE_SELECTOR = "0x2cb0d48a";
