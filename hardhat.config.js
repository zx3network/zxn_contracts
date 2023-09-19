require("@nomicfoundation/hardhat-toolbox");

require('dotenv').config();

const alchemySepoliaUrl = process.env.ALCHEMY_SEPOLIA_URL || ''
const alchemyMainnetUrl = process.env.ALCHEMY_MAINNET_URL || ''
const devPrivateKey = process.env.PRIVATE_KEY_DEV || ''
const prodPrivateKey = process.env.PRIVATE_KEY_PROD || ''

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: "0.8.17",
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
            timeout: 1800000
            // mining: {
            //     auto: false,
            //     interval: 2000
            // }
        },
        localhost: {
            url: "http://localhost:8545"
        },
        sepolia: {
            url: `${alchemySepoliaUrl}`,
            accounts: [`0x${devPrivateKey}`],
        },
        mainnet: {
          url: `${alchemyMainnetUrl}`,
          accounts: [`0x${prodPrivateKey}`],
        }
    }
};
