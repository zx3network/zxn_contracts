const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Test ZXNProtocol contract", async function () {

    let xen;
    let dxn;
    let zxnProtocol;
    let zxn;
    let zxnProtocolAddress;
    let deployer; 
    let user1, user2, user3, user4, user5;
    
    beforeEach(async function () {
        [deployer, user1, user2, user3, user4, user5] = await ethers.getSigners();

        const XEN = await ethers.getContractFactory("XENCryptoMock");
        const DXN = await ethers.getContractFactory("DBXenERC20Mock");
        const ZXNProtocol = await ethers.getContractFactory("ZXNProtocol");
        const ZXN = await ethers.getContractFactory("ZXN");

        xen = await XEN.deploy();
        dxn = await DXN.deploy();
        zxnProtocol = await ZXNProtocol.deploy(xen.address, dxn.address, 60*60*24);

        await xen.deployed();
        await dxn.deployed();
        await zxnProtocol.deployed();

        const zxnAddress = await zxnProtocol.zxn();
        const zxnABI = ZXN.interface.format();
        zxn = new ethers.Contract(zxnAddress, zxnABI, ethers.provider);

        zxnProtocolAddress = await zxnProtocol.address;
        let deployerAddress = deployer.address;

        let xenUser1 = xen.connect(user1);
        let xenUser2 = xen.connect(user2);
        let xenUser3 = xen.connect(user3);
        let xenUser4 = xen.connect(user4);
        let xenUser5 = xen.connect(user5);
        await xen.approve(deployerAddress, ethers.utils.parseEther("10000000000000"));
        await xen.transferFrom(deployerAddress, user1.address, ethers.utils.parseEther("1000000000"));
        await xen.transferFrom(deployerAddress, user2.address, ethers.utils.parseEther("1000000000"));
        await xen.transferFrom(deployerAddress, user3.address, ethers.utils.parseEther("1000000000"));
        await xen.transferFrom(deployerAddress, user4.address, ethers.utils.parseEther("1000000000"));
        await xen.transferFrom(deployerAddress, user5.address, ethers.utils.parseEther("1000000000"));

        let dxnUser1 = dxn.connect(user1);
        let dxnUser2 = dxn.connect(user2);
        let dxnUser3 = dxn.connect(user3);
        let dxnUser4 = dxn.connect(user4);
        let dxnUser5 = dxn.connect(user5);
        await dxn.approve(deployerAddress, ethers.utils.parseEther("10000"));
        await dxn.transferFrom(deployerAddress, user1.address, ethers.utils.parseEther("2000"));
        await dxn.transferFrom(deployerAddress, user2.address, ethers.utils.parseEther("2000"));
        await dxn.transferFrom(deployerAddress, user3.address, ethers.utils.parseEther("2000"));
        await dxn.transferFrom(deployerAddress, user4.address, ethers.utils.parseEther("2000"));
        await dxn.transferFrom(deployerAddress, user5.address, ethers.utils.parseEther("2000"));
    });

    describe("ZXN", function () {
        it("ZXN total supply should be 0", async function () {
            const totalSupply = await zxn.totalSupply();
            expect(totalSupply).to.equal(0);
        });
    });   

    describe("Variables", function () {
        it("Cycle duration should be 24 hours", async function () {
            expect(await zxnProtocol.cycleDuration()).to.equal(60*60*24);
        });

        it("All user balances should be 1 trillion XEN and 2000 DXN", async function () {
            expect(await xen.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("1000000000"));
            expect(await xen.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("1000000000"));
            expect(await xen.balanceOf(user3.address)).to.equal(ethers.utils.parseEther("1000000000"));
            expect(await xen.balanceOf(user4.address)).to.equal(ethers.utils.parseEther("1000000000"));
            expect(await xen.balanceOf(user5.address)).to.equal(ethers.utils.parseEther("1000000000"));

            expect(await dxn.balanceOf(user1.address)).to.equal(ethers.utils.parseEther("2000"));
            expect(await dxn.balanceOf(user2.address)).to.equal(ethers.utils.parseEther("2000"));
            expect(await dxn.balanceOf(user3.address)).to.equal(ethers.utils.parseEther("2000"));
            expect(await dxn.balanceOf(user4.address)).to.equal(ethers.utils.parseEther("2000"));
            expect(await dxn.balanceOf(user5.address)).to.equal(ethers.utils.parseEther("2000"));
        });

        it("Cycle should increase every 24 hours", async function () {
            expect(await zxnProtocol.getCurrentCycle()).to.equal(0);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            expect(await zxnProtocol.getCurrentCycle()).to.equal(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            expect(await zxnProtocol.getCurrentCycle()).to.equal(2);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            expect(await zxnProtocol.getCurrentCycle()).to.equal(3);
        });
    });

    describe("Transactions", function () {
        it("User burns 1 XEN batch, should reduce XEN balance by 1,000,000", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);
            let user1XENBalace = await xen.balanceOf(user1.address);
            expect(user1XENBalace).to.equal(ethers.utils.parseEther("999000000"));
        });

        it("User burns 1 XEN batch, cannot claim tokens in the same cycle", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);
            await expect(zxnProtocol.connect(user1).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");
        });

        it("User should not be allowed to burn DXN before first burning XEN", async function () {
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1"));
            await expect(zxnProtocol.connect(user1).burnDxnBatch(1)).to.be.revertedWith("ZXNProtocol: Have to burn XEN first before burning DXN in this cycle.");
        });

        it("User can burn XEN first, then after burning XEN can burn DXN", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("4"));
            await zxnProtocol.connect(user1).burnDxnBatch(4);
        });

        it("After user burns 100 DXN ballance should be 1900", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("100"));
            await zxnProtocol.connect(user1).burnDxnBatch(100);

            let user1DXNBalace = await dxn.balanceOf(user1.address);
            expect(user1DXNBalace).to.equal(ethers.utils.parseEther("1900"));
        });

        it("User should not be allowed to burn 0 XEN batches", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await expect(zxnProtocol.connect(user1).burnXenBatch(0)).to.be.revertedWith("ZXNProtocol: min number of XEN batches is 1.");
        });

        it("User should not be allowed to burn more than 1000000 XEN batches", async function () {
            await xen.approve(deployer.address, ethers.utils.parseEther("1000000000001"));
            await xen.transferFrom(deployer.address, user1.address, ethers.utils.parseEther("1000000000001"));
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000001"));
            await expect(zxnProtocol.connect(user1).burnXenBatch(1000001)).to.be.revertedWith("ZXNProtocol: max number of XEN batches is 1000000.");
        });

        it("User should not be allowed to burn 0 DXN batches", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("4"));
            await expect(zxnProtocol.connect(user1).burnDxnBatch(0)).to.be.revertedWith("ZXNProtocol: min number of DXN batches is 1.");
        });

        it("User should not be allowed to burn more than 10000 DXN batches", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await dxn.approve(deployer.address, ethers.utils.parseEther("10000"));
            await dxn.transferFrom(deployer.address, user1.address, ethers.utils.parseEther("10000"));

            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("10001"));
            await expect(zxnProtocol.connect(user1).burnDxnBatch(10001)).to.be.revertedWith("ZXNProtocol: max number of DXN batches is 10000.");
        });

        it("User should have enough DXN balance to burn", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("2001"));

            let user1DXNBalace = await dxn.balanceOf(user1.address);
            expect(user1DXNBalace).to.equal(ethers.utils.parseEther("2000"));

            await expect(zxnProtocol.connect(user1).burnDxnBatch(2001)).to.be.revertedWith("ZXNProtocol: not enough DXN tokens for burn.");
        });

        it("After user claim ZXN total supply should be 5000000", async function () {
            let totalZxnSupply = await zxnProtocol.getZxnSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxnProtocol.getZxnSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("2500000"));

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxnProtocol.getZxnSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("5000000"));
        });

        it("User burns 1 XEN batch, claim next cycle, reward should be 2500000 ZXN tokens", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);
            await expect(zxnProtocol.connect(user1).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("2500000"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("2500000"));
        });

        it("User burns 10 XEN batches, claim next cycle, reward should be 2500000 ZXN tokens", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("10000000"));
            await zxnProtocol.connect(user1).burnXenBatch(10);
            await expect(zxnProtocol.connect(user1).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("2500000"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("2500000"));
        });

        it("2 users burn 1 XEN batch each, user1 claims next cycle, reward should be 1250000 ZXN tokens, ZXN total supply 1250000", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);
            await expect(zxnProtocol.connect(user1).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);
            await expect(zxnProtocol.connect(user2).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("1250000"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("1250000"));
        });

        it("2 users burn 1 XEN batch each, both users claim next cycle, reward should be 1250000 ZXN tokens each, ZXN total supply 2500000", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);
            await expect(zxnProtocol.connect(user1).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);
            await expect(zxnProtocol.connect(user2).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("1250000"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("1250000"));


            await zxnProtocol.connect(user2).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("2500000"));

            let user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("1250000"));
        });

        it("2 users burn 1 XEN batch each, user1 claims next cycle, user2 claims cycle after next", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));

            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await expect(zxnProtocol.connect(user1).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");
            await expect(zxnProtocol.connect(user2).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("1250000"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("1250000"));

            let user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("0"));

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await expect(zxnProtocol.connect(user1).claimRewards()).to.be.revertedWith("ZXNProtocol: account has no rewards.");

            await zxnProtocol.connect(user2).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("2500000"));

            user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("1250000"));
        });

        it("5 users burn 1 XEN batch each, after claim they should have 500000 ZXN each", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user3).burnXenBatch(1);

            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user4).burnXenBatch(1);

            await xen.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user5).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();
            await zxnProtocol.connect(user2).claimRewards();
            await zxnProtocol.connect(user3).claimRewards();
            await zxnProtocol.connect(user4).claimRewards();
            await zxnProtocol.connect(user5).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("2500000"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("500000"));

            let user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("500000"));

            let user3ZXNBalace = await zxn.balanceOf(user3.address);
            expect(user3ZXNBalace).to.equal(ethers.utils.parseEther("500000"));

            let user4ZXNBalace = await zxn.balanceOf(user4.address);
            expect(user4ZXNBalace).to.equal(ethers.utils.parseEther("500000"));

            let user5ZXNBalace = await zxn.balanceOf(user5.address);
            expect(user5ZXNBalace).to.equal(ethers.utils.parseEther("500000"));
        });

        it("2 users burn 1 XEN batch each, don't claim, balance and total ZXN supply should be 0", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("0"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("0"));

            let user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("0"));
        });


        it("5 users burn different XEN batches during different cycles", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            // Unclaimed user balances:
            // user1 = 1,250,000 | user2 = 1,250,000

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("0"));

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user3).burnXenBatch(1);

            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user4).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            // Unclaimed user balances:
            // user1 = 1,875,000 | user2 = 1,875,000 | user3 = 625,000 | user4 = 625,000

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await xen.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user5).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            // Unclaimed user balances:
            // user1 = 3,125,000 | user2 = 1,875,000 | user3 = 625,000 | user4 = 625,000 | user5 = 1,250,000

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("0"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("0"));
            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("3125000"));

            user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("3125000"));

            // Unclaimed user balances:
            // user1 = 0 | user2 = 1,875,000 | user3 = 625,000 | user4 = 625,000 | user5 = 1,250,000

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await xen.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user5).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            // Unclaimed user balances:
            // user1 = 1,250,000 | user2 = 1,875,000 | user3 = 625,000 | user4 = 625,000 | user5 = 2,500,000

            let user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("0"));
            await zxnProtocol.connect(user2).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("5000000"));

            user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("1875000"));

            // Unclaimed user balances:
            // user1 = 1,250,000 | user2 = 0 | user3 = 625,000 | user4 = 625,000 | user5 = 2,500,000

            user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("3125000"));
            await zxnProtocol.connect(user1).claimRewards();

            let user3ZXNBalace = await zxn.balanceOf(user3.address);
            expect(user3ZXNBalace).to.equal(ethers.utils.parseEther("0"));
            await zxnProtocol.connect(user3).claimRewards();

            let user4ZXNBalace = await zxn.balanceOf(user4.address);
            expect(user4ZXNBalace).to.equal(ethers.utils.parseEther("0"));
            await zxnProtocol.connect(user4).claimRewards();

            let user5ZXNBalace = await zxn.balanceOf(user5.address);
            expect(user5ZXNBalace).to.equal(ethers.utils.parseEther("0"));
            await zxnProtocol.connect(user5).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("10000000"));

            // Unclaimed user balances:
            // user1 = 0 | user2 = 0 | user3 = 0 | user4 = 0 | user5 = 0
            
            user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("4375000"));

            user3ZXNBalace = await zxn.balanceOf(user3.address);
            expect(user3ZXNBalace).to.equal(ethers.utils.parseEther("625000"));

            user4ZXNBalace = await zxn.balanceOf(user4.address);
            expect(user4ZXNBalace).to.equal(ethers.utils.parseEther("625000"));

            user5ZXNBalace = await zxn.balanceOf(user5.address);
            expect(user5ZXNBalace).to.equal(ethers.utils.parseEther("2500000"));
        });

        it("2 users burn: user1 burns 4 XEN batches, user2 burns 1 XEN batch", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("4000000"));
            await zxnProtocol.connect(user1).burnXenBatch(4);

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("0"));
            await zxnProtocol.connect(user1).claimRewards();

            let user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("0"));
            await zxnProtocol.connect(user2).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("2500000"));

            user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("2000000"));

            user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("500000"));

        });   

        it("2 users burn: user1 burns XEN and DXN, user 2 burns XEN only", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("4"));
            await zxnProtocol.connect(user1).burnDxnBatch(4);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();
            await zxnProtocol.connect(user2).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("5000000"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("3250000"));

            let user2ZXNBalace = await zxn.balanceOf(user2.address);
            expect(user2ZXNBalace).to.equal(ethers.utils.parseEther("1750000"));
        }); 

        it("Should not be allowed to burn DXN before buring XEN on the next cycle after burning DXN", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user1).burnXenBatch(1);

            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("4"));
            await zxnProtocol.connect(user1).burnDxnBatch(4);

            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("4"));
            await expect(zxnProtocol.connect(user1).burnDxnBatch(4)).to.be.revertedWith("ZXNProtocol: Have to burn XEN first before burning DXN in this cycle.");
        }); 

        it("Should not allow to burn after 400 active burn cycles", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));

            for (let i = 0; i < 400; i++) {
                await zxnProtocol.connect(user1).burnXenBatch(1);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await expect(zxnProtocol.connect(user1).burnXenBatch(1)).to.be.revertedWith("ZXNProtocol: Active burn cycles finished.");
        }); 

        it("Should not allow to burn after 400 active burn cycles (1000 total cycles),", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));

            await ethers.provider.send("evm_increaseTime", [60*60*24*600]);
            await ethers.provider.send("evm_mine");

            for (let i = 0; i < 400; i++) {
                await zxnProtocol.connect(user1).burnXenBatch(1);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await expect(zxnProtocol.connect(user1).burnXenBatch(1)).to.be.revertedWith("ZXNProtocol: Active burn cycles finished.");
        });

        it("Should not allow to burn after 400 active burn cycles", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));

            for (let i = 0; i < 400; i++) {
                await zxnProtocol.connect(user1).burnXenBatch(1);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await expect(zxnProtocol.connect(user1).burnXenBatch(1)).to.be.revertedWith("ZXNProtocol: Active burn cycles finished.");
        }); 

        it("Should not allow to burn after 400 active burn cycles, multiple users", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));

            for (let i = 0; i < 400; i++) {
                if (i % 3 == 1) {
                    await zxnProtocol.connect(user1).burnXenBatch(1);
                } else if (i % 2 == 0) {
                    await zxnProtocol.connect(user2).burnXenBatch(1);
                } else {
                    await zxnProtocol.connect(user3).burnXenBatch(1);
                }
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("0"));

            await zxnProtocol.connect(user1).claimRewards();
            await zxnProtocol.connect(user2).claimRewards();
            await zxnProtocol.connect(user3).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("1000000000"));

            await expect(zxnProtocol.connect(user1).burnXenBatch(1)).to.be.revertedWith("ZXNProtocol: Active burn cycles finished.");
        });

        it("Should not allow to burn after 400 active burn cycles burning XEN and DXN, multiple users", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("10000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("10000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("10000000000"));

            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("2000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("2000"));
            await dxn.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("2000"));

            for (let i = 0; i < 400; i++) {
                if (i % 9 == 1) {
                    await zxnProtocol.connect(user1).burnXenBatch(1);
                    await zxnProtocol.connect(user2).burnXenBatch(1);
                    await zxnProtocol.connect(user2).burnDxnBatch(4);
                } else if (i % 3 == 1) {
                    await zxnProtocol.connect(user2).burnXenBatch(1);
                    await zxnProtocol.connect(user2).burnDxnBatch(10);
                    await zxnProtocol.connect(user3).burnXenBatch(2);
                    await zxnProtocol.connect(user3).burnDxnBatch(4);
                } else if (i % 4 == 1) {
                    await zxnProtocol.connect(user1).burnXenBatch(1);
                    await zxnProtocol.connect(user3).burnXenBatch(1);
                } else if (i % 5 == 1) {
                    await zxnProtocol.connect(user1).burnXenBatch(1);
                    await zxnProtocol.connect(user2).burnXenBatch(1);
                } else if (i % 7 == 1) {
                    await zxnProtocol.connect(user1).burnXenBatch(1);
                    await zxnProtocol.connect(user1).burnDxnBatch(2);
                    await zxnProtocol.connect(user2).burnXenBatch(3);
                    await zxnProtocol.connect(user2).burnDxnBatch(4);
                } else {
                    await zxnProtocol.connect(user1).burnXenBatch(1);
                    await zxnProtocol.connect(user3).burnXenBatch(1);
                }
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("0"));

            await zxnProtocol.connect(user1).claimRewards();
            await zxnProtocol.connect(user2).claimRewards();
            await zxnProtocol.connect(user3).claimRewards();

            await expect(zxnProtocol.connect(user1).burnXenBatch(1)).to.be.revertedWith("ZXNProtocol: Active burn cycles finished.");
        });

        it("All supply should be minted after 800 cycles (400 active cycles) and claim", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));

            for (let i = 0; i < 400; i++) {
                await zxnProtocol.connect(user1).burnXenBatch(1);
                await ethers.provider.send("evm_increaseTime", [60*60*24*2]);
                await ethers.provider.send("evm_mine");
            }

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("1000000000"));
        });

        it("Should show unclaimed rewards", async function () {
            let totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));

            // Cycle 1 - ACTIVE
            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);
            await zxnProtocol.connect(user3).burnXenBatch(1);
            await zxnProtocol.connect(user4).burnXenBatch(1);
            await zxnProtocol.connect(user5).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("0"));

            // Cycle 2 - ACTIVE
            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24*3]);
            await ethers.provider.send("evm_mine");

            // Cycle 5 - INACTIVE

            await zxnProtocol.connect(user1).claimRewards();

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("1750000"));

            let user1ZXNBalace = await zxn.balanceOf(user1.address);
            expect(user1ZXNBalace).to.equal(ethers.utils.parseEther("1750000"));

            await zxnProtocol.connect(user3).claimRewards();

            let user3ZXNBalace = await zxn.balanceOf(user3.address);
            expect(user3ZXNBalace).to.equal(ethers.utils.parseEther("500000"));

            totalZxnSupply = await zxn.totalSupply();
            expect(totalZxnSupply).to.equal(ethers.utils.parseEther("2250000"));

            await ethers.provider.send("evm_increaseTime", [60*60*24*3]);
            await ethers.provider.send("evm_mine");

            // Cycle 8 - ACTIVE

            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await ethers.provider.send("evm_increaseTime", [60*60*24*3]);
            await ethers.provider.send("evm_mine");

            // Cycle 11 - ACTIVE

            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);

            let cycleDetails = await zxnProtocol.cycleDetails();
            expect(cycleDetails.activeCycleCount).to.equal(4);
        });

        it("User should be able to burn maximum XEN and DXN batches", async function () {
            await xen.approve(deployer.address, ethers.utils.parseEther("1000000000000"));
            await xen.transferFrom(deployer.address, user1.address, ethers.utils.parseEther("1000000000000"));
            await dxn.approve(deployer.address, ethers.utils.parseEther("10000"));
            await dxn.transferFrom(deployer.address, user1.address, ethers.utils.parseEther("10000"));


            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("10000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("10000000"));

            await zxnProtocol.connect(user1).burnXenBatch(1000000);
            await zxnProtocol.connect(user1).burnDxnBatch(10000);
            await zxnProtocol.connect(user2).burnXenBatch(10);
        });

        it("When user burns 5 DXN batches, the contract should own 5 DXN", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("5"));

            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user1).burnDxnBatch(5);

            let dxnAmount = await dxn.balanceOf(zxnProtocolAddress);
            expect(dxnAmount).to.equal(ethers.utils.parseEther("5"));
        });

        it("When user burns XEN total XEN burned should be updated", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("100000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("100000000"));

            await zxnProtocol.connect(user1).burnXenBatch(1);

            let totalXenBurned = await zxnProtocol.totalXenBurned();

            expect(totalXenBurned).to.equal(ethers.utils.parseEther("1000000"));

            await zxnProtocol.connect(user2).burnXenBatch(2);

            totalXenBurned = await zxnProtocol.totalXenBurned();
            expect(totalXenBurned).to.equal(ethers.utils.parseEther("3000000"));

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).burnXenBatch(5);

            totalXenBurned = await zxnProtocol.totalXenBurned();
            expect(totalXenBurned).to.equal(ethers.utils.parseEther("8000000"));

            await zxnProtocol.connect(user2).burnXenBatch(10);

            totalXenBurned = await zxnProtocol.totalXenBurned();
            expect(totalXenBurned).to.equal(ethers.utils.parseEther("18000000"));
        });

        it("When user burns XEN cycle XEN burned should be updated for every cycle", async function () {
            let currentCycle = await zxnProtocol.getCurrentCycle();
            expect(currentCycle).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("100000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("100000000"));

            await zxnProtocol.connect(user1).burnXenBatch(1);

            let cycleXenBurned = await zxnProtocol.cycleXenBurned(currentCycle);
            expect(cycleXenBurned).to.equal(ethers.utils.parseEther("1000000"));
            
            await zxnProtocol.connect(user2).burnXenBatch(2);

            cycleXenBurned = await zxnProtocol.cycleXenBurned(currentCycle);
            expect(cycleXenBurned).to.equal(ethers.utils.parseEther("3000000"));

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            currentCycle = await zxnProtocol.getCurrentCycle();
            expect(currentCycle).to.equal(1);

            cycleXenBurned = await zxnProtocol.cycleXenBurned(currentCycle);
            expect(cycleXenBurned).to.equal(0);

            await zxnProtocol.connect(user1).burnXenBatch(5);

            cycleXenBurned = await zxnProtocol.cycleXenBurned(currentCycle);
            expect(cycleXenBurned).to.equal(ethers.utils.parseEther("5000000"));

            await zxnProtocol.connect(user2).burnXenBatch(10);

            cycleXenBurned = await zxnProtocol.cycleXenBurned(currentCycle);
            expect(cycleXenBurned).to.equal(ethers.utils.parseEther("15000000"));

            await ethers.provider.send("evm_increaseTime", [60*60*24*5]);
            await ethers.provider.send("evm_mine");

            currentCycle = await zxnProtocol.getCurrentCycle();
            expect(currentCycle).to.equal(6);

            cycleXenBurned = await zxnProtocol.cycleXenBurned(currentCycle);
            expect(cycleXenBurned).to.equal(0);

            await zxnProtocol.connect(user1).burnXenBatch(5);

            cycleXenBurned = await zxnProtocol.cycleXenBurned(currentCycle);
            expect(cycleXenBurned).to.equal(ethers.utils.parseEther("5000000"));
        });

        it("When users burns DXN contract should collect it per cycle", async function () {
            let currentCycle = await zxnProtocol.getCurrentCycle();
            expect(currentCycle).to.equal(0);

            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("100000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("100000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await zxnProtocol.connect(user1).burnDxnBatch(5);
            await zxnProtocol.connect(user2).burnDxnBatch(5);

            let dxnCollectedThisCycle = await zxnProtocol.cycleDxnCollectedByContract(currentCycle);
            expect(dxnCollectedThisCycle).to.equal(ethers.utils.parseEther("10"));

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            currentCycle = await zxnProtocol.getCurrentCycle();
            expect(currentCycle).to.equal(1);

            dxnCollectedThisCycle = await zxnProtocol.cycleDxnCollectedByContract(currentCycle);
            expect(dxnCollectedThisCycle).to.equal(0);

            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await zxnProtocol.connect(user1).burnDxnBatch(15);
            await zxnProtocol.connect(user2).burnDxnBatch(4);

            dxnCollectedThisCycle = await zxnProtocol.cycleDxnCollectedByContract(currentCycle);
            expect(dxnCollectedThisCycle).to.equal(ethers.utils.parseEther("19"));

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            currentCycle = await zxnProtocol.getCurrentCycle();
            expect(currentCycle).to.equal(2);

            dxnCollectedThisCycle = await zxnProtocol.cycleDxnCollectedByContract(currentCycle);
            expect(dxnCollectedThisCycle).to.equal(0);

            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);

            await zxnProtocol.connect(user1).burnDxnBatch(25);
            await zxnProtocol.connect(user2).burnDxnBatch(5);

            dxnCollectedThisCycle = await zxnProtocol.cycleDxnCollectedByContract(currentCycle);
            expect(dxnCollectedThisCycle).to.equal(ethers.utils.parseEther("30"));
        });

        it("Should update total burn credits after every burn", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            let totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(0);

            await zxnProtocol.connect(user1).burnXenBatch(200);
            totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(200);

            await zxnProtocol.connect(user1).burnDxnBatch(2);
            totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(400);

            await zxnProtocol.connect(user2).burnXenBatch(100);
            totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(500);

            await zxnProtocol.connect(user2).burnDxnBatch(4);
            totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(800);

            await zxnProtocol.connect(user3).burnXenBatch(100);
            totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(900);

            await zxnProtocol.connect(user3).burnDxnBatch(10);
            totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(1800);

            await zxnProtocol.connect(user4).burnXenBatch(50);
            totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(1850);

            await zxnProtocol.connect(user5).burnXenBatch(10);
            totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(1860);

            await zxnProtocol.connect(user5).burnDxnBatch(10);
            totalBurnCredits = await zxnProtocol.totalBurnCredits();
            expect(totalBurnCredits).to.equal(1950);
        });

        it("Should update total DXN collected by the contract after every burn", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            let totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(0);

            await zxnProtocol.connect(user1).burnXenBatch(200);
            await zxnProtocol.connect(user1).burnDxnBatch(2);
            totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(ethers.utils.parseEther("2"));

            await zxnProtocol.connect(user2).burnXenBatch(100);
            await zxnProtocol.connect(user2).burnDxnBatch(4);
            totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(ethers.utils.parseEther("6"));

            await zxnProtocol.connect(user3).burnXenBatch(100);
            await zxnProtocol.connect(user3).burnDxnBatch(10);
            totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(ethers.utils.parseEther("16"));

            await zxnProtocol.connect(user4).burnXenBatch(50);
            await zxnProtocol.connect(user5).burnXenBatch(10);
            await zxnProtocol.connect(user5).burnDxnBatch(10);
            totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(ethers.utils.parseEther("26"));

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).burnXenBatch(100);
            await zxnProtocol.connect(user1).burnDxnBatch(10);
            totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(ethers.utils.parseEther("36"));

            await zxnProtocol.connect(user2).burnXenBatch(200);
            await zxnProtocol.connect(user2).burnDxnBatch(5);
            totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(ethers.utils.parseEther("41"));

            await zxnProtocol.connect(user3).burnXenBatch(400);
            await zxnProtocol.connect(user4).burnXenBatch(50);
            await zxnProtocol.connect(user4).burnDxnBatch(2);
            totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(ethers.utils.parseEther("43"));

            await zxnProtocol.connect(user5).burnXenBatch(100);
            await zxnProtocol.connect(user5).burnDxnBatch(3);
            totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(ethers.utils.parseEther("46"));
        });

        it("Should update total account burn credits after every burn", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user5).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            await zxnProtocol.connect(user1).burnXenBatch(200);
            let totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user1.address);
            expect(totalUserBurnCredits).to.equal(200);
            await zxnProtocol.connect(user1).burnDxnBatch(2);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user1.address);
            expect(totalUserBurnCredits).to.equal(400);

            await zxnProtocol.connect(user2).burnXenBatch(100);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user2.address);
            expect(totalUserBurnCredits).to.equal(100);
            await zxnProtocol.connect(user2).burnDxnBatch(4);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user2.address);
            expect(totalUserBurnCredits).to.equal(400);

            await zxnProtocol.connect(user3).burnXenBatch(100);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user3.address);
            expect(totalUserBurnCredits).to.equal(100);
            await zxnProtocol.connect(user3).burnDxnBatch(10);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user3.address);
            expect(totalUserBurnCredits).to.equal(1000);

            await zxnProtocol.connect(user4).burnXenBatch(50);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user4.address);
            expect(totalUserBurnCredits).to.equal(50);

            await zxnProtocol.connect(user5).burnXenBatch(10);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user5.address);
            expect(totalUserBurnCredits).to.equal(10);
            await zxnProtocol.connect(user5).burnDxnBatch(10);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user5.address);
            expect(totalUserBurnCredits).to.equal(100);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).burnXenBatch(100);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user1.address);
            expect(totalUserBurnCredits).to.equal(500);
            await zxnProtocol.connect(user1).burnDxnBatch(10);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user1.address);
            expect(totalUserBurnCredits).to.equal(1400);

            await zxnProtocol.connect(user2).burnXenBatch(200);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user2.address);
            expect(totalUserBurnCredits).to.equal(600);
            await zxnProtocol.connect(user2).burnDxnBatch(5);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user2.address);
            expect(totalUserBurnCredits).to.equal(1400);

            await zxnProtocol.connect(user3).burnXenBatch(400);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user3.address);
            expect(totalUserBurnCredits).to.equal(1400);

            await zxnProtocol.connect(user4).burnXenBatch(50);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user4.address);
            expect(totalUserBurnCredits).to.equal(100);
            await zxnProtocol.connect(user4).burnDxnBatch(2);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user4.address);
            expect(totalUserBurnCredits).to.equal(150);

            await zxnProtocol.connect(user5).burnXenBatch(100);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user5.address);
            expect(totalUserBurnCredits).to.equal(200);
            await zxnProtocol.connect(user5).burnDxnBatch(3);
            totalUserBurnCredits = await zxnProtocol.totalAccountBurnCredits(user5.address);
            expect(totalUserBurnCredits).to.equal(400);
        });

        it("Should not be able to claim DXN rewards before last active cycle", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            await zxnProtocol.connect(user1).burnXenBatch(200);
            await zxnProtocol.connect(user1).burnDxnBatch(2);

            await zxnProtocol.connect(user2).burnXenBatch(100);
            await zxnProtocol.connect(user2).burnDxnBatch(4);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await expect(zxnProtocol.connect(user1).claimDxnRewards()).to.be.revertedWith("ZXNProtocol: Rewards can be claimed only after all active cycles were finished.");
        });  

        it("Should not be able to claim DXN rewards", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            for (let i = 0; i < 200; i++) {
                await zxnProtocol.connect(user1).burnXenBatch(1);
                await zxnProtocol.connect(user1).burnDxnBatch(2);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            for (let i = 0; i < 200; i++) {
                await zxnProtocol.connect(user2).burnXenBatch(1);
                await zxnProtocol.connect(user2).burnDxnBatch(2);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            let cycleDetails = await zxnProtocol.cycleDetails();
            expect(cycleDetails.activeCycleCount).to.equal(400);

            await expect(zxnProtocol.connect(user1).claimDxnRewards()).to.be.revertedWith("ZXNProtocol: All ZXN rewards must be claimed first.");
        }); 

        it("Should be able to claim DXN rewards after last active cycle", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            for (let i = 0; i < 100; i++) {
                await zxnProtocol.connect(user1).burnXenBatch(10);
                await zxnProtocol.connect(user1).burnDxnBatch(2);
                await zxnProtocol.connect(user3).burnXenBatch(2);
                await zxnProtocol.connect(user3).burnDxnBatch(5);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            for (let i = 0; i < 100; i++) {
                await zxnProtocol.connect(user3).burnXenBatch(5);
                await zxnProtocol.connect(user3).burnDxnBatch(2);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            for (let i = 0; i < 100; i++) {
                await zxnProtocol.connect(user2).burnXenBatch(10);
                await zxnProtocol.connect(user2).burnDxnBatch(10);
                await zxnProtocol.connect(user4).burnXenBatch(2);
                await zxnProtocol.connect(user4).burnDxnBatch(5);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            for (let i = 0; i < 100; i++) {
                await zxnProtocol.connect(user4).burnXenBatch(2);
                await zxnProtocol.connect(user4).burnDxnBatch(2);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            let cycleDetails = await zxnProtocol.cycleDetails();
            expect(cycleDetails.activeCycleCount).to.equal(400);

            let user1DXNBalace = await dxn.balanceOf(user1.address);
            expect(user1DXNBalace).to.equal(ethers.utils.parseEther("1800"));

            let user2DXNBalace = await dxn.balanceOf(user2.address);
            expect(user2DXNBalace).to.equal(ethers.utils.parseEther("1000"));

            let user3DXNBalace = await dxn.balanceOf(user3.address);
            expect(user3DXNBalace).to.equal(ethers.utils.parseEther("1300"));

            let user4DXNBalace = await dxn.balanceOf(user4.address);
            expect(user4DXNBalace).to.equal(ethers.utils.parseEther("1300"));

            let totalDxnCollected = await zxnProtocol.totalDxnCollected();
            expect(totalDxnCollected).to.equal(ethers.utils.parseEther("2600"));

            await zxnProtocol.connect(user1).claimRewards();
            await zxnProtocol.connect(user1).claimDxnRewards();

            await zxnProtocol.connect(user2).claimRewards();
            await zxnProtocol.connect(user2).claimDxnRewards();

            await zxnProtocol.connect(user3).claimRewards();
            await zxnProtocol.connect(user3).claimDxnRewards();

            await zxnProtocol.connect(user4).claimRewards();
            await zxnProtocol.connect(user4).claimDxnRewards();

            user1DXNBalace = await dxn.balanceOf(user1.address);
            expect(user1DXNBalace).to.equal(ethers.utils.parseEther("2137.662337662337662337"));

            user2DXNBalace = await dxn.balanceOf(user2.address);
            expect(user2DXNBalace).to.equal(ethers.utils.parseEther("2688.311688311688311688"));

            user3DXNBalace = await dxn.balanceOf(user3.address);
            expect(user3DXNBalace).to.equal(ethers.utils.parseEther("1637.662337662337662337"));

            user4DXNBalace = await dxn.balanceOf(user4.address);
            expect(user4DXNBalace).to.equal(ethers.utils.parseEther("1536.363636363636363636")); 
        }); 

        it("Should not be able to claim DXN rewards after claiming ZXN once", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            for (let i = 0; i < 100; i++) {
                await zxnProtocol.connect(user1).burnXenBatch(10);
                await zxnProtocol.connect(user1).burnDxnBatch(2);
                await zxnProtocol.connect(user3).burnXenBatch(2);
                await zxnProtocol.connect(user3).burnDxnBatch(5);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            for (let i = 0; i < 100; i++) {
                await zxnProtocol.connect(user3).burnXenBatch(5);
                await zxnProtocol.connect(user3).burnDxnBatch(2);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            for (let i = 0; i < 100; i++) {
                await zxnProtocol.connect(user2).burnXenBatch(10);
                await zxnProtocol.connect(user2).burnDxnBatch(10);
                await zxnProtocol.connect(user4).burnXenBatch(2);
                await zxnProtocol.connect(user4).burnDxnBatch(5);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            for (let i = 0; i < 100; i++) {
                await zxnProtocol.connect(user4).burnXenBatch(2);
                await zxnProtocol.connect(user4).burnDxnBatch(2);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            await zxnProtocol.connect(user1).claimRewards();
            await zxnProtocol.connect(user1).claimDxnRewards();

            await zxnProtocol.connect(user2).claimRewards();
            await zxnProtocol.connect(user2).claimDxnRewards();

            await zxnProtocol.connect(user3).claimRewards();
            await zxnProtocol.connect(user3).claimDxnRewards();

            await zxnProtocol.connect(user4).claimRewards();
            await zxnProtocol.connect(user4).claimDxnRewards();

            await expect(zxnProtocol.connect(user1).claimDxnRewards()).to.be.revertedWith("ZXNProtocol: Address already claimed DXN rewards.");
        }); 

        it("Only projects participants can claim DXN rewards", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            for (let i = 0; i < 200; i++) {
                await zxnProtocol.connect(user1).burnXenBatch(1);
                await zxnProtocol.connect(user1).burnDxnBatch(2);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            for (let i = 0; i < 200; i++) {
                await zxnProtocol.connect(user2).burnXenBatch(5);
                await zxnProtocol.connect(user2).burnDxnBatch(2);
                await ethers.provider.send("evm_increaseTime", [60*60*24]);
                await ethers.provider.send("evm_mine");
            }

            await zxnProtocol.connect(user1).claimRewards();
            await zxnProtocol.connect(user1).claimDxnRewards();
            await zxnProtocol.connect(user2).claimRewards();
            await zxnProtocol.connect(user2).claimDxnRewards();

            await expect(zxnProtocol.connect(user3).claimDxnRewards()).to.be.revertedWith("ZXNProtocol: Only protocol participants can claim DXN rewards.");
        }); 

        it("Should correctly calculate unclaimed user's ZXN rewards", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            await zxnProtocol.connect(user1).burnXenBatch(1);

            let user1Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("2500000"));

            await zxnProtocol.connect(user1).burnDxnBatch(2);

            user1Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("2500000"));

            await zxnProtocol.connect(user2).burnXenBatch(2);

            user1Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("1250000"));

            let user2Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user2.address);
            expect(user2Zxn).to.equal(ethers.utils.parseEther("1250000"));

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            user1Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("1250000"));

            user2Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user2.address);
            expect(user2Zxn).to.equal(ethers.utils.parseEther("1250000"));

            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);
            await zxnProtocol.connect(user3).burnXenBatch(1);
            await zxnProtocol.connect(user4).burnXenBatch(1);

            user1Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("1875000"));

            user2Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user2.address);
            expect(user2Zxn).to.equal(ethers.utils.parseEther("1875000"));

            let user3Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user3.address);
            expect(user3Zxn).to.equal(ethers.utils.parseEther("625000"));

            let user4Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user4.address);
            expect(user4Zxn).to.equal(ethers.utils.parseEther("625000"));

            await zxnProtocol.connect(user1).claimRewards();

            user1Zxn = await zxnProtocol.getUnclaimedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("625000"));

        }); 

        it("Should correctly calculate unclaimed current cycle rewards", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            await zxnProtocol.connect(user1).burnXenBatch(1);

            let user1Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("2500000"));

            await zxnProtocol.connect(user1).burnDxnBatch(2);

            user1Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("2500000"));

            await zxnProtocol.connect(user2).burnXenBatch(2);

            user1Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("1250000"));

            let user2Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user2.address);
            expect(user2Zxn).to.equal(ethers.utils.parseEther("1250000"));

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            user1Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(0);

            user2Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user2.address);
            expect(user2Zxn).to.equal(0);

            await zxnProtocol.connect(user1).burnXenBatch(1);
            await zxnProtocol.connect(user2).burnXenBatch(1);
            await zxnProtocol.connect(user3).burnXenBatch(1);
            await zxnProtocol.connect(user4).burnXenBatch(1);

            user1Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("625000"));

            user2Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user2.address);
            expect(user2Zxn).to.equal(ethers.utils.parseEther("625000"));

            let user3Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user3.address);
            expect(user3Zxn).to.equal(ethers.utils.parseEther("625000"));

            let user4Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user4.address);
            expect(user4Zxn).to.equal(ethers.utils.parseEther("625000"));

            await zxnProtocol.connect(user1).claimRewards();

            user1Zxn = await zxnProtocol.currentCycleExpectedUserZxnRewards(user1.address);
            expect(user1Zxn).to.equal(ethers.utils.parseEther("625000"));

        }); 

        it("Should correctly show account statistics", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user3).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user4).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            await zxnProtocol.connect(user1).burnXenBatch(10);
            await zxnProtocol.connect(user1).burnDxnBatch(2);
            await zxnProtocol.connect(user2).burnXenBatch(20);
            await zxnProtocol.connect(user2).burnDxnBatch(5);
            await zxnProtocol.connect(user3).burnXenBatch(100);
            await zxnProtocol.connect(user4).burnXenBatch(50);
            await zxnProtocol.connect(user4).burnDxnBatch(2);

            let user1Stats = await zxnProtocol.getAccountStatistics(user1.address);
            let user2Stats = await zxnProtocol.getAccountStatistics(user2.address);
            let user3Stats = await zxnProtocol.getAccountStatistics(user3.address);
            let user4Stats = await zxnProtocol.getAccountStatistics(user4.address);

            expect(user1Stats[0]).to.equal(ethers.utils.parseEther("156250"));
            expect(user2Stats[0]).to.equal(ethers.utils.parseEther("781250"));
            expect(user3Stats[0]).to.equal(ethers.utils.parseEther("781250"));
            expect(user4Stats[0]).to.equal(ethers.utils.parseEther("781250"));

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).burnXenBatch(100);
            await zxnProtocol.connect(user1).burnDxnBatch(4);
            await zxnProtocol.connect(user2).burnXenBatch(200);
            await zxnProtocol.connect(user2).burnDxnBatch(5);
            await zxnProtocol.connect(user3).burnXenBatch(500);
            await zxnProtocol.connect(user4).burnXenBatch(50);
            await zxnProtocol.connect(user4).burnDxnBatch(2);

            user1Stats = await zxnProtocol.getAccountStatistics(user1.address);
            user2Stats = await zxnProtocol.getAccountStatistics(user2.address);
            user3Stats = await zxnProtocol.getAccountStatistics(user3.address);
            user4Stats = await zxnProtocol.getAccountStatistics(user4.address);

            console.log("STATS 1: " + user1Stats);
            console.log("STATS 2: " + user2Stats);
            console.log("STATS 3: " + user3Stats);
            console.log("STATS 4: " + user4Stats);

            expect(user1Stats[0]).to.equal(ethers.utils.parseEther("656250"));
            expect(user2Stats[0]).to.equal(ethers.utils.parseEther("2031250"));
            expect(user3Stats[0]).to.equal(ethers.utils.parseEther("1406250"));
            expect(user4Stats[0]).to.equal(ethers.utils.parseEther("906250"));

            expect(user1Stats[1]).to.equal(ethers.utils.parseEther("500000"));
            expect(user2Stats[1]).to.equal(ethers.utils.parseEther("1250000"));
            expect(user3Stats[1]).to.equal(ethers.utils.parseEther("625000"));
            expect(user4Stats[1]).to.equal(ethers.utils.parseEther("125000"));

            expect(user1Stats[2]).to.equal(ethers.utils.parseEther("3.620689655172413793"));
            expect(user2Stats[2]).to.equal(ethers.utils.parseEther("9.482758620689655172"));
            expect(user3Stats[2]).to.equal(ethers.utils.parseEther("5.172413793103448275"));
            expect(user4Stats[2]).to.equal(ethers.utils.parseEther("1.724137931034482758"));

            expect(user1Stats[3]).to.equal(0);
            expect(user2Stats[3]).to.equal(0);
            expect(user3Stats[3]).to.equal(0);
            expect(user4Stats[3]).to.equal(0);

            expect(user1Stats[4]).to.equal(420);
            expect(user2Stats[4]).to.equal(1100);
            expect(user3Stats[4]).to.equal(600);
            expect(user4Stats[4]).to.equal(200);
            
            expect(user1Stats[5]).to.equal(2320);
            expect(user2Stats[5]).to.equal(2320);
            expect(user3Stats[5]).to.equal(2320);
            expect(user4Stats[5]).to.equal(2320);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            user1Stats = await zxnProtocol.getAccountStatistics(user1.address);
            user2Stats = await zxnProtocol.getAccountStatistics(user2.address);
            user3Stats = await zxnProtocol.getAccountStatistics(user3.address);
            user4Stats = await zxnProtocol.getAccountStatistics(user4.address);
            
            expect(user1Stats[1]).to.equal(0);
            expect(user2Stats[1]).to.equal(0);
            expect(user3Stats[1]).to.equal(0);
            expect(user4Stats[1]).to.equal(0);
        }); 

        it("Should correctly show protocol statistics", async function () {
            await xen.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await xen.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000000000"));
            await dxn.connect(user1).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));
            await dxn.connect(user2).approve(zxnProtocolAddress, ethers.utils.parseEther("1000"));

            await zxnProtocol.connect(user1).burnXenBatch(10);
            await zxnProtocol.connect(user1).burnDxnBatch(10);
            await zxnProtocol.connect(user2).burnXenBatch(100);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).burnXenBatch(10);
            await zxnProtocol.connect(user1).burnDxnBatch(10);
            await zxnProtocol.connect(user2).burnXenBatch(20);
            await zxnProtocol.connect(user2).burnDxnBatch(35);

            await ethers.provider.send("evm_increaseTime", [60*60*24*4]);
            await ethers.provider.send("evm_mine");

            await zxnProtocol.connect(user1).burnXenBatch(100);
            await zxnProtocol.connect(user1).burnDxnBatch(10);
            await zxnProtocol.connect(user2).burnXenBatch(20);
            await zxnProtocol.connect(user2).burnDxnBatch(30);

            await ethers.provider.send("evm_increaseTime", [60*60*24]);
            await ethers.provider.send("evm_mine");

            cycle = await zxnProtocol.getCurrentCycle();
            protocolStats = await zxnProtocol.getProtocolStatistics();

            expect(protocolStats[0]).to.equal(6);
            expect(protocolStats[1]).to.equal(5);
            expect(protocolStats[2]).to.equal(3);
            expect(protocolStats[3]).to.equal(0);
            expect(protocolStats[4]).to.equal(ethers.utils.parseEther("260000000"));
            expect(protocolStats[5]).to.equal(0);
            expect(protocolStats[6]).to.equal(ethers.utils.parseEther("95"));
            expect(protocolStats[7]).to.equal(2600);
            expect(protocolStats[8]).to.equal(0);

            await zxnProtocol.connect(user1).burnXenBatch(5);
            await zxnProtocol.connect(user1).burnDxnBatch(10);
            await zxnProtocol.connect(user2).burnXenBatch(50);
            await zxnProtocol.connect(user2).burnDxnBatch(10);

            await zxnProtocol.connect(user1).claimRewards();

            cycle = await zxnProtocol.getCurrentCycle();
            protocolStats = await zxnProtocol.getProtocolStatistics();

            expect(protocolStats[0]).to.equal(6);
            expect(protocolStats[1]).to.equal(6);
            expect(protocolStats[2]).to.equal(4);
            expect(protocolStats[3]).to.equal(ethers.utils.parseEther("55000000"));
            expect(protocolStats[4]).to.equal(ethers.utils.parseEther("315000000"));
            expect(protocolStats[5]).to.equal(ethers.utils.parseEther("20"));
            expect(protocolStats[6]).to.equal(ethers.utils.parseEther("115"));
            expect(protocolStats[7]).to.equal(3150);
            expect(protocolStats[8]).to.equal(ethers.utils.parseEther("3125000"));
        }); 
        
    });
});

