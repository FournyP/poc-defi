import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { ethers } from "hardhat";

// ON BCS
const ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
const FACTORY = "0x6725f303b657a9451d8ba641348b6761a6cc7a17";
const WBNB_TOKEN = "0xae13d989dac2f0debff460ac112a837c89baa7cd";

const TOTAL_SUPPLY = ethers.utils.parseEther("100000000");

describe('Token', () => { 
  async function deploy() {
   const [owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");
      
    const token = await Token.deploy(
      "Token",
      TOTAL_SUPPLY,
      "PMJ"  
    );
    await token.deployed();

    await token.setPancakeRouter(ROUTER);

    const pancakeRouter = await ethers.getContractAt("IPancakeRouter02", ROUTER);
  
    await token.approve(pancakeRouter.address, TOTAL_SUPPLY);

    await pancakeRouter.addLiquidityETH(
      token.address,
      ethers.utils.parseEther("10000"),
      ethers.utils.parseEther("9999"),
      ethers.utils.parseEther("9.92"),
      owner.address,
      Date.now() + (60 * 10),
      { value: ethers.utils.parseEther("10"), gasLimit: 7600000 }
    );

    let factory = await ethers.getContractAt("IUniswapV2Factory", FACTORY);

    let liquidityPoolAddress = await factory.getPair(token.address, WBNB_TOKEN);
    await token.setLiquidityPool(liquidityPoolAddress);

    let wbnbToken = await ethers.getContractAt("IERC20", WBNB_TOKEN);
    
    return { token, wbnbToken, pancakeRouter };
  }

  describe("Deployment", () => {
    it("Should balance equal total supply", async () => {
      const [owner] = await ethers.getSigners();

      const { token } = await loadFixture(deploy);

      expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY.sub(ethers.utils.parseEther("10000")));
    });
  });

  describe("BlackList", () => {
    it("Whitelisted", async () => {
      const [owner] = await ethers.getSigners();

      const { token } = await loadFixture(deploy);
      
      expect(await token.isLpBlackListed(owner.address)).to.equal(false);
    });

    it("Blacklisted", async () => {
      const [owner] = await ethers.getSigners();

      const { token } = await loadFixture(deploy);

      await token.addToLpBlackList(owner.address);
      
      expect(await token.isLpBlackListed(owner.address)).to.equal(true);
    });
  });

  describe("Swap", () => {
    it("Should work", async () => {
      const [owner] = await ethers.getSigners();

      const { token, wbnbToken, pancakeRouter } = await loadFixture(deploy);

      let bnbInitialBalance = await owner.getBalance();
      let tokenInitialBalance = await token.balanceOf(owner.address);

      await pancakeRouter.swapETHForExactTokens(
        ethers.utils.parseEther("1"),
        [
          wbnbToken.address,
          token.address
        ],
        owner.address,
        Date.now() + (60 * 5),
        { value: ethers.utils.parseEther("0.01") }
      );

      let bnbFinalBalance = await owner.getBalance();
      let tokenFinalBalance = await token.balanceOf(owner.address);
      
      expect(bnbFinalBalance).to.be.lessThan(bnbInitialBalance);
      expect(tokenInitialBalance).to.be.lessThan(tokenFinalBalance);
    });

    it("Should fail", async () => {
      const [owner] = await ethers.getSigners();

      const { token, wbnbToken, pancakeRouter } = await loadFixture(deploy);

      await token.addToLpBlackList(owner.address);

      try {
        await pancakeRouter.swapETHForExactTokens(
          ethers.utils.parseEther("1"),
          [
            wbnbToken.address,
            token.address
          ],
          owner.address,
          Date.now() + (60 * 5),
          { value: ethers.utils.parseEther("0.01") }
        )
        assert.fail();
      } catch {
        
      }
    });
  })
});