import { ethers } from "ethers";

export const ether = (value: string) => {
  return ethers.utils.parseEther(value);
};
