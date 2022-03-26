import { Contract, Signer } from "ethers";
import {
  defaultAbiCoder,
  hexlify,
  hexZeroPad,
  keccak256,
  solidityKeccak256,
  toUtf8Bytes,
  zeroPad,
} from "ethers/lib/utils";
import { getChainId } from "./ChainId";
import hre from "hardhat";

export const DEFAULT_DOMAIN = "Unicial Collection";
export const DEFAULT_VERSION = "1";

export async function sendMetaTx(
  contract: Contract,
  functionSignature: string,
  signer: string,
  relayer: Signer,
  badSigner: string = null,
  domain: string = DEFAULT_DOMAIN,
  version: string = DEFAULT_VERSION
) {
  const signature: string = await getSignature(
    contract,
    functionSignature,
    signer,
    badSigner,
    domain,
    version
  );
  const r = "0x" + signature.substring(0, 64);
  const s = "0x" + signature.substring(64, 128);
  const v = "0x" + signature.substring(128, 130);

  return contract
    .connect(relayer)
    .executeMetaTransaction(signer, functionSignature, r, s, v);
}

export async function getSignature(
  contract: Contract,
  functionSignature: string,
  signer: string,
  badSigner: string,
  domain: string,
  version: string
) {
  const chainId = getChainId();

  const domainType = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "verifyingContract", type: "address" },
    { name: "salt", type: "bytes32" },
  ];

  const domainData = {
    name: domain,
    verifyingContract: contract.address,
    salt: hexZeroPad(hexlify(chainId), 32),
    version,
  };

  const metaTransactionType = [
    { name: "nonce", type: "uint256" },
    { name: "from", type: "address" },
    { name: "functionSignature", type: "bytes" },
  ];

  let nonce = await contract.getNonce(signer);
  let message = {
    nonce: Number(nonce.toString()),
    from: badSigner ? badSigner : signer,
    functionSignature: functionSignature,
  };

  const dataToSign = {
    types: {
      EIP712Domain: domainType,
      MetaTransaction: metaTransactionType,
    },
    domain: domainData,
    primaryType: "MetaTransaction",
    message: message,
  };

  const signature: string = await new Promise((res, rej) =>
    hre.network.provider.sendAsync(
      {
        method: "eth_signTypedData_v4",
        params: [signer, dataToSign],
        jsonrpc: "2.0",
        id: 999999999999,
      },
      function (err, result) {
        if (err || result.error) {
          return rej(err || result.error);
        }
        return res(result.result);
      }
    )
  );

  return signature.substring(2);
}

// export async function getDomainSeparator(contract) {
//   const chainId = await contract.getChainId();

//   return web3.utils.soliditySha3({
//     t: "bytes",
//     v: web3.eth.abi.encodeParameters(
//       ["bytes32", "bytes32", "bytes32", "address", "bytes32"],
//       [
//         web3.utils.soliditySha3({
//           t: "string",
//           v: "EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)",
//         }),
//         web3.utils.soliditySha3({ t: "string", v: "Decentraland Collection" }),
//         web3.utils.soliditySha3({ t: "string", v: "2" }),
//         contract.address,
//         web3.utils.padLeft(web3.utils.toHex(chainId), 64),
//       ]
//     ),
//   });
// }

export const getDomainSeparator = async (contract: Contract) => {
  const chainId = await contract.getChainId();

  return keccak256(
    defaultAbiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "address", "bytes32"],
      [
        keccak256(
          toUtf8Bytes(
            "EIP712Domain(string name,string version,address verifyingContract,bytes32 salt)"
          )
        ),
        keccak256(toUtf8Bytes("Unicial Collection")),
        keccak256(toUtf8Bytes("1")),
        contract.address,
        chainId,
      ]
    )
  );
};
