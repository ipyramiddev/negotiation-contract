import chai, { expect } from "chai";
import { BigNumber, Contract, Signer } from "ethers";
import { ethers } from "hardhat";

import { ZERO_ADDRESS } from "./helper/Collection";

describe("Forwarder", function () {
  let ForwarderContract, CommitteeContract;

  let forwarderContract: Contract, committeeContract: Contract;

  let deployer: Signer,
    user: Signer,
    anotherUser: Signer,
    owner: Signer,
    hacker: Signer;
  let deployerAddr: string,
    userAddr: string,
    anotherUserAddr: string,
    ownerAddr: string,
    hackerAddr: string;

  beforeEach(async function () {
    [deployer, user, anotherUser, owner, hacker] = await ethers.getSigners();
    [deployerAddr, userAddr, anotherUserAddr, ownerAddr, hackerAddr] =
      await Promise.all([
        deployer.getAddress(),
        user.getAddress(),
        anotherUser.getAddress(),
        owner.getAddress(),
        hacker.getAddress(),
      ]);

    CommitteeContract = await ethers.getContractFactory("Committee");
    committeeContract = await CommitteeContract.deploy(ownerAddr, [userAddr]);

    ForwarderContract = await ethers.getContractFactory("Forwarder");
    forwarderContract = await ForwarderContract.deploy(ownerAddr, userAddr);
  });

  describe("create forwarder", async function () {
    it("deploy with correct values", async function () {
      const contract = await ForwarderContract.deploy(ownerAddr, userAddr);

      const forwarderOwner = await contract.owner();
      const caller = await contract.caller();

      expect(forwarderOwner).to.be.equal(ownerAddr);
      expect(caller).to.be.equal(userAddr);
    });
  });
  describe("setCaller", async function () {
    it("should set the caller", async function () {
      let caller = await forwarderContract.caller();
      expect(caller).to.be.equal(userAddr);

      let tx = await forwarderContract
        .connect(owner)
        .setCaller(committeeContract.address);
      let logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(1);
      expect(logs[0].event).to.be.equal("CallerSet");
      expect(logs[0].args._oldCaller).to.be.equal(userAddr);
      expect(logs[0].args._newCaller).to.be.equal(committeeContract.address);

      caller = await forwarderContract.caller();
      expect(caller).to.be.equal(committeeContract.address);

      tx = await forwarderContract.connect(owner).setCaller(userAddr);
      logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(1);
      expect(logs[0].event).to.be.equal("CallerSet");
      expect(logs[0].args._oldCaller).to.be.equal(committeeContract.address);
      expect(logs[0].args._newCaller).to.be.equal(userAddr);

      caller = await forwarderContract.caller();
      expect(caller).to.be.equal(userAddr);
    });

    it("should set the ZERO_ADDRESS as the caller", async function () {
      let caller = await forwarderContract.caller();
      expect(caller).to.be.equal(userAddr);

      let tx = await forwarderContract.connect(owner).setCaller(ZERO_ADDRESS);
      let logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(1);
      expect(logs[0].event).to.be.equal("CallerSet");
      expect(logs[0].args._oldCaller).to.be.equal(userAddr);
      expect(logs[0].args._newCaller).to.be.equal(ZERO_ADDRESS);

      caller = await forwarderContract.caller();
      expect(caller).to.be.equal(ZERO_ADDRESS);

      tx = await forwarderContract.connect(owner).setCaller(userAddr);
      logs = (await tx.wait()).events;

      expect(logs.length).to.be.equal(1);
      expect(logs[0].event).to.be.equal("CallerSet");
      expect(logs[0].args._oldCaller).to.be.equal(ZERO_ADDRESS);
      expect(logs[0].args._newCaller).to.be.equal(userAddr);

      caller = await forwarderContract.caller();
      expect(caller).to.be.equal(userAddr);
    });

    it("reverts when trying to set the caller by hacker", async function () {
      await expect(
        forwarderContract.connect(hacker).setCaller(userAddr)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
