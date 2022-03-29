import { network } from "hardhat";
export const duration = {
  seconds: function (val: any) {
    return val;
  },
  minutes: function (val: any) {
    return val * this.seconds(60);
  },
  hours: function (val: any) {
    return val * this.minutes(60);
  },
  days: function (val: any) {
    return val * this.hours(24);
  },
  weeks: function (val: any) {
    return val * this.days(7);
  },
  years: function (val: any) {
    return val * this.days(365);
  },
};

// Increases testrpc time by the passed duration in seconds
export function increaseTime(duration: any) {
  const id = Date.now();
  return new Promise((resolve, reject) => {
    try {
      network.provider.send("evm_increaseTime", [duration]);
      network.provider.send("evm_mine");
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
}

export async function increaseBlocks(n) {
  for (let i = 0; i < n; i++) {
    await new Promise((resolve, reject) => network.provider.send("evm_mine"));
  }
}
