const fs = require("fs");
const path = require('path');

const ADDRESSES_FILE = path.join(__dirname,  "/../../contract-addresses.json");

function getContractAddresses() {
    if (!fs.existsSync(ADDRESSES_FILE)) {
        console.error("No addresses file found");
        return;
    }
    return JSON.parse(fs.readFileSync(ADDRESSES_FILE, 'utf8'));
}

function writeContractAddresses(addresses) {
    if (!fs.existsSync(ADDRESSES_FILE)) {
        console.error("No addresses file found");
        return;
    }

    try {
        fs.writeFileSync(ADDRESSES_FILE, JSON.stringify(addresses, null, 2), 'utf8');
        
        console.log("Addresses have been saved.");
    } catch (err) {
        console.error("An error occurred while writing JSON Object to file.", err);
    }
}

module.exports = {
    getContractAddresses,
    writeContractAddresses
};

