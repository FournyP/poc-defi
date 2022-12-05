import { ethers } from "hardhat";

async function main() {
  const Token = await ethers.getContractFactory("Token");
    
  const token = await Token.deploy(
    "0xae13d989dac2f0debff460ac112a837c89baa7cd", 
    "Token",
    1000000000000000,
    "PMJ",
    "0x6725f303b657a9451d8ba641348b6761a6cc7a17"
  );
  await token.deployed();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
