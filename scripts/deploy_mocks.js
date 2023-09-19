const hre = require("hardhat");
const { writeContractAddresses } = require('./helpers/utils');


async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    const XenMock = await ethers.getContractFactory("XENCryptoMock");
    const xen = await XenMock.deploy();

    console.log("XenMock deployed to:", xen.address);

    const DxnMock = await ethers.getContractFactory("DBXenERC20Mock");
    const dxn = await DxnMock.deploy();

    console.log("DxnMock deployed to:", dxn.address);

    let addresses = {
        xen: xen.address,
        dxn: dxn.address
    }

    writeContractAddresses(addresses);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
