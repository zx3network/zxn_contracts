const hre = require("hardhat");
const { getContractAddresses, writeContractAddresses } = require('./helpers/utils');


async function main() {
    const addresses = getContractAddresses();
    const CYCLE_DURATION = 60 * 60 * 24; // 60 * 60 * 24;
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const ZXNProtocol = await ethers.getContractFactory("ZXNProtocol");
    const zxnProtocol = await ZXNProtocol.deploy(addresses.xen, addresses.dxn, CYCLE_DURATION);
    const zxn = await zxnProtocol.zxn();

    console.log("ZXNProtocol deployed to:", zxnProtocol.address);
    console.log("ZXN deployed to:        ", zxn);

    let updatedAddresses = {
        ...addresses,
        zxnprotocol: zxnProtocol.address,
        zxn: zxn
    };

    writeContractAddresses(updatedAddresses);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
