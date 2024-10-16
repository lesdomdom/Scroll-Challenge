import { config as loadEnvConfig } from "dotenv";
import {
  createWalletClient,
  http,
  getContract,
  erc20Abi,
  parseUnits,
  maxUint256,
  publicActions,
  concat,
  numberToHex,
  size,
} from "viem";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { scroll } from "viem/chains";
import { wethAbi } from "./abi/weth-abi";

// Instructions for the 0x Scroll Challenge

/* 
1. Show liquidity sources percentage
2. Enable affiliate fees and surplus collection
3. Show token buy/sell taxes
4. List all liquidity sources on Scroll chain
*/

const queryParams = require("qs");

// Load environment configuration
loadEnvConfig();
const { PRIVATE_KEY, ZERO_EX_API_KEY, ALCHEMY_HTTP_TRANSPORT_URL } = process.env;

// Ensure required environment variables are provided
if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is missing.");
if (!ZERO_EX_API_KEY) throw new Error("ZERO_EX_API_KEY is missing.");
if (!ALCHEMY_HTTP_TRANSPORT_URL) throw new Error("ALCHEMY_HTTP_TRANSPORT_URL is missing.");

// Define request headers
const fetchHeaders = new Headers({
  "Content-Type": "application/json",
  "0x-api-key": ZERO_EX_API_KEY,
  "0x-version": "v2",
});

// Initialize the wallet client
const wallet = createWalletClient({
  account: privateKeyToAccount(`0x${PRIVATE_KEY}` as `0x${string}`),
  chain: scroll,
  transport: http(ALCHEMY_HTTP_TRANSPORT_URL),
}).extend(publicActions); // Public actions added for additional operations

const [userAddress] = await wallet.getAddresses();

// Define contracts
const wethTokenContract = getContract({
  address: "0x5300000000000000000000000000000000000004",
  abi: wethAbi,
  client: wallet,
});

const wstEthContract = getContract({
  address: "0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32",
  abi: erc20Abi,
  client: wallet,
});

// Function to display liquidity sources percentage breakdown
function displayLiquidityBreakdown(routeDetails: any) {
  const sources = routeDetails.fills;
  const totalPercentage = sources.reduce(
    (sum: number, source: any) => sum + parseInt(source.proportionBps),
    0
  );

  console.log(`${sources.length} Liquidity Sources:`);
  sources.forEach((source: any) => {
    const percentage = (parseInt(source.proportionBps) / 100).toFixed(2);
    console.log(`${source.source}: ${percentage}%`);
  });
}

// Function to show taxes for buying and selling tokens
function displayTokenTaxDetails(tokenDetails: any) {
  const buyTokenBuyTax = (parseInt(tokenDetails.buyToken.buyTaxBps) / 100).toFixed(2);
  const buyTokenSellTax = (parseInt(tokenDetails.buyToken.sellTaxBps) / 100).toFixed(2);
  const sellTokenBuyTax = (parseInt(tokenDetails.sellToken.buyTaxBps) / 100).toFixed(2);
  const sellTokenSellTax = (parseInt(tokenDetails.sellToken.sellTaxBps) / 100).toFixed(2);

  if (buyTokenBuyTax > 0 || buyTokenSellTax > 0) {
    console.log(`Buy Token Tax (Buy): ${buyTokenBuyTax}%`);
    console.log(`Buy Token Tax (Sell): ${buyTokenSellTax}%`);
  }

  if (sellTokenBuyTax > 0 || sellTokenSellTax > 0) {
    console.log(`Sell Token Tax (Buy): ${sellTokenBuyTax}%`);
    console.log(`Sell Token Tax (Sell): ${sellTokenSellTax}%`);
  }
}

// Function to list liquidity sources on the Scroll chain
const listLiquiditySources = async () => {
  const chainId = wallet.chain.id.toString(); 
  const sourceParams = new URLSearchParams({
    chainId: chainId,
  });

  const response = await fetch(
    `https://api.0x.org/swap/v1/sources?${sourceParams.toString()}`,
    {
      headers: fetchHeaders,
    }
  );

  const data = await response.json();
  const liquiditySources = Object.keys(data.sources);
  console.log("Available liquidity sources on Scroll:");
  console.log(liquiditySources.join(", "));
};

// Main function
const executeMain = async () => {
  // Fetch and display all liquidity sources on Scroll
  await listLiquiditySources();

  // Define the amount to sell
  const tokenDecimals = (await wethTokenContract.read.decimals()) as number;
  const amountToSell = parseUnits("0.1", tokenDecimals);

  // Define affiliate fee and surplus collection settings
  const affiliateFeePercentage = "100"; // 1% fee
  const collectSurplus = "true";

  // Fetch price with monetization parameters
  const priceQuery = new URLSearchParams({
    chainId: wallet.chain.id.toString(),
    sellToken: wethTokenContract.address,
    buyToken: wstEthContract.address,
    sellAmount: amountToSell.toString(),
    taker: wallet.account.address,
    affiliateFee: affiliateFeePercentage,
    surplusCollection: collectSurplus,
  });

  const priceResult = await fetch(
    `https://api.0x.org/swap/permit2/price?${priceQuery.toString()}`,
    {
      headers: fetchHeaders,
    }
  );

  const priceData = await priceResult.json();
  console.log("Price for swapping 0.1 WETH for wstETH:");
  console.log(priceData);

  // Check if approval for Permit2 is required
  if (priceData.issues.allowance !== null) {
    try {
      const approvalRequest = await wethTokenContract.simulate.approve([
        priceData.issues.allowance.spender,
        maxUint256,
      ]);
      console.log("Setting up Permit2 approval...");
      const transactionHash = await wethTokenContract.write.approve(approvalRequest.args);
      console.log("Approval transaction hash:", transactionHash);
    } catch (approvalError) {
      console.error("Error during Permit2 approval:", approvalError);
    }
  } else {
    console.log("Permit2 approval not required for WETH.");
  }

  // Proceed with quote fetching, transaction signing, and submission...

  // Display liquidity sources breakdown, token taxes, affiliate fees, etc.
};

executeMain();
