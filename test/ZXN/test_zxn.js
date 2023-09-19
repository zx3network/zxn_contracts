const { ethers } = require("hardhat");
const { expect } = require("chai");
const { BigNumber } = require("ethers");

describe("Test ZXN contract", async function () {

    let zxn;
    let deployer; 
    let user;
    
    beforeEach(async function () {
        [deployer, user] = await ethers.getSigners();
        const ZXN = await ethers.getContractFactory("ZXN");
        zxn = await ZXN.deploy();
        await zxn.deployed();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await zxn.owner()).to.equal(deployer.address);
        });
    });

    describe("Supply", function () {
        it("ZXN total supply should be 0", async function () {
            expect(await zxn.totalSupply()).to.equal(0);
        });

        it("ZXN total supply should increase after minting", async function () {
            await zxn.connect(deployer).mintReward(user.address, ethers.utils.parseEther("1000000"));
            expect(await zxn.totalSupply()).to.equal(ethers.utils.parseEther("1000000"));
        });
    });

    describe("Transactions", function () {
        it("Should fail if sender is not the owner", async function () {
            await expect(zxn.connect(user).mintReward(user.address, 1000000)).to.be.revertedWith("ZXN: Caller must be ZXNProtocol contract.");
        });

        it("Deloyer should be able to mint tokens", async function () {
            await zxn.connect(deployer).mintReward(user.address, 1000000);
        });

        it("Should mint tokens if sender is the owner", async function () {
            await zxn.mintReward(user.address, ethers.utils.parseEther("1000000"));
            expect(await zxn.balanceOf(user.address)).to.equal(ethers.utils.parseEther("1000000"));
        });

        it("Should fail if trying to mint tokens exceeding cap", async function () {
            try {
                await zxn.mintReward(user.address, ethers.utils.parseEther("1000000001"));
            } catch (error) {
                expect(error.message).to.include("ERC20Capped: cap exceeded");
            }
        });
    });
});

