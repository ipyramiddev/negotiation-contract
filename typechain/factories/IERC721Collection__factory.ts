/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import { Provider } from "@ethersproject/providers";
import type {
  IERC721Collection,
  IERC721CollectionInterface,
} from "../IERC721Collection";

const _abi = [
  {
    inputs: [],
    name: "COLLECTION_HASH",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
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
        internalType: "bool",
        name: "_shouldComplete",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "_isApproved",
        type: "bool",
      },
      {
        internalType: "address",
        name: "_rarities",
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
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
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
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_itemId",
        type: "uint256",
      },
    ],
    name: "items",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
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

export class IERC721Collection__factory {
  static readonly abi = _abi;
  static createInterface(): IERC721CollectionInterface {
    return new utils.Interface(_abi) as IERC721CollectionInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IERC721Collection {
    return new Contract(address, _abi, signerOrProvider) as IERC721Collection;
  }
}
