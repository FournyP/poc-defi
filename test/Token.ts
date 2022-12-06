import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

// ON BCS
const ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
const FACTORY = "0x6725f303b657a9451d8ba641348b6761a6cc7a17";
const WBNB_TOKEN = "0xae13d989dac2f0debff460ac112a837c89baa7cd";

const TOTAL_SUPPLY = ethers.utils.parseEther("100000000");

describe('PierroMojitoToken', () => { 
  async function deploy() {
    const Token = await ethers.getContractFactory("Token");
    
    const token = await Token.deploy(
      WBNB_TOKEN, 
      "Token",
      TOTAL_SUPPLY,
      "PMJ",
      FACTORY
    );

    const pancakeRouter = await ethers.getContractAt("IPancakeRouter02", ROUTER);

    const wbnbToken = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", WBNB_TOKEN);
    
    let liquidityPoolAddress = await token.getLiquidityPool();

    const liquidityPool = await ethers.getContractAt("IUniswapV2Pair", liquidityPoolAddress);

    return { token, wbnbToken, pancakeRouter, liquidityPool };
  }

  describe("Deployment", () => {
    it("Should balance equal total supply", async () => {
      const [owner] = await ethers.getSigners();

      const { token } = await loadFixture(deploy);

      expect(await token.balanceOf(owner.address)).to.equal(TOTAL_SUPPLY);
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

      const { token, wbnbToken, pancakeRouter, liquidityPool } = await loadFixture(deploy);

      await token.approve(liquidityPool.address, TOTAL_SUPPLY);
      await token.approve(pancakeRouter.address, TOTAL_SUPPLY);

      await pancakeRouter.addLiquidityETH(
        token.address,
        ethers.utils.parseEther("165.24686552377826655"),
        ethers.utils.parseEther("163.924890599588040417"),
        ethers.utils.parseEther("0.0992"),
        owner.address,
        Date.now() + (60 * 10),
        { value: ethers.utils.parseEther("0.1") }
      );

      let bnbInitialBalance = await owner.getBalance();
      let tokenInitialBalance = await token.balanceOf(owner.address);

      await pancakeRouter.swapETHForExactTokens(
        9, 
        [
          wbnbToken.address,
          token.address
        ],
        owner.address,
        Date.now() + (60 * 5),
        { value: 1 }
      );

      let bnbFinalBalance = await owner.getBalance();
      let tokenFinalBalance = await token.balanceOf(owner.address);
      
      expect(bnbFinalBalance).to.equal(bnbInitialBalance.add(-1))
      expect(tokenFinalBalance).to.equal(tokenInitialBalance.add(9))
    });

    it("Should fail", async () => {
      const [owner] = await ethers.getSigners();

      const { token, pancakeRouter, liquidityPool } = await loadFixture(deploy);

      await token.approve(liquidityPool.address, TOTAL_SUPPLY);
      await token.approve(pancakeRouter.address, TOTAL_SUPPLY);

      await token.addToLpBlackList(owner.address);

      await pancakeRouter.addLiquidityETH(
        token.address,
        ethers.utils.parseEther("165.24686552377826655"),
        ethers.utils.parseEther("163.924890599588040417"),
        ethers.utils.parseEther("0.0992"),
        owner.address,
        Date.now() + (60 * 10),
        { value: ethers.utils.parseEther("0.1") }
      );
    });
  })
});