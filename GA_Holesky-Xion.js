const { ethers, JsonRpcProvider } = require('ethers');
const axios = require('axios');
const moment = require('moment-timezone');
require('dotenv').config();

const log = (message, style) => {
  console.log(`%c${message}`, style);
}

const logger = {
  info: (msg) => {
    log(msg, 'color: magenta; font-weight: bold;');
    console.log(msg); // Fallback for non-browser environments
  },
  warn: (msg) => {
    log(msg, 'color: yellow; font-weight: bold;');
    console.log(`⚠️ ${msg}`);
  },
  error: (msg) => {
    log(msg, 'color: red; font-weight: bold;');
    console.error(`❌ ${msg}`);
  },
  success: (msg) => {
    log(msg, 'color: green; font-weight: bold;');
    console.log(`✅ ${msg}`);
  },
  loading: (msg) => {
    log(msg, 'color: teal; font-weight: bold;');
    console.log(`⏳ ${msg}`);
  },
  step: (msg) => {
    log(msg, 'color: white; font-weight: bold;');
    console.log(`👉 ${msg}`);
  },
};

const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: 'uint32', name: 'channelId', type: 'uint32' },
      { internalType: 'uint64', name: 'timeoutHeight', type: 'uint64' },
      { internalType: 'uint64', name: 'timeoutTimestamp', type: 'uint64' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
      {
        components: [
          { internalType: 'uint8', name: 'version', type: 'uint8' },
          { internalType: 'uint8', name: 'opcode', type: 'uint8' },
          { internalType: 'bytes', name: 'operand', type: 'bytes' },
        ],
        internalType: 'struct Instruction',
        name: 'instruction',
        type: 'tuple',
      },
    ],
    name: 'send',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const CHAINLINK_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "supplyAfterMint",
        "type": "uint256"
      }
    ],
    "name": "MaxSupplyExceeded",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "SenderNotBurner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "SenderNotMinter",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "burner",
        "type": "address"
      }
    ],
    "name": "BurnAccessGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "burner",
        "type": "address"
      }
    ],
    "name": "BurnAccessRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "minter",
        "type": "address"
      }
    ],
    "name": "MintAccessGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "minter",
        "type": "address"
      }
    ],
    "name": "MintAccessRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "acceptOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "burnFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "subtractedValue",
        "type": "uint256"
      }
    ],
    "name": "decreaseAllowance",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "subtractedValue",
        "type": "uint256"
      }
    ],
    "name": "decreaseApproval",
    "outputs": [
      {
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBurners",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMinters",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "burner",
        "type": "address"
      }
    ],
    "name": "grantBurnRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "burnAndMinter",
        "type": "address"
      }
    ],
    "name": "grantMintAndBurnRoles",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "minter",
        "type": "address"
      }
    ],
    "name": "grantMintRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "addedValue",
        "type": "uint256"
      }
    ],
    "name": "increaseAllowance",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "addedValue",
        "type": "uint256"
      }
    ],
    "name": "increaseApproval",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "burner",
        "type": "address"
      }
    ],
    "name": "isBurner",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "minter",
        "type": "address"
      }
    ],
    "name": "isMinter",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "burner",
        "type": "address"
      }
    ],
    "name": "revokeBurnRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "minter",
        "type": "address"
      }
    ],
    "name": "revokeMintRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "transferAndCall",
    "outputs": [
      {
        "internalType": "bool",
        "name": "success",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

// Configuration
const contractAddress = '0x5FbE74A283f7954f10AA04C2eDf55578811aeb03'; // Port section
const CHAINLINK_ADDRESS = '0x685ce6742351ae9b618f383883d6d1e0c5a31b4b'; // baseToken variable
const graphqlEndpoint = 'https://graphql.union.build/v1/graphql';
const baseExplorerUrl = 'https://holesky.etherscan.io';
const unionUrl = 'https://app.union.build/explorer';

// RPC Endpoints
const rpcProvider = [new JsonRpcProvider('https://ethereum-holesky-rpc.publicnode.com')];
let currentRpcProviderIndex = 0;

// Get current provider or rotate if needed
function provider() {
  return rpcProvider[currentRpcProviderIndex];
}

const explorer = {
  tx: (txHash) => `${baseExplorerUrl}/tx/${txHash}`,
  address: (address) => `${baseExplorerUrl}/address/${address}`,
};

const union = {
  tx: (txHash) => `${unionUrl}/transfers/${txHash}`,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function timelog() {
  return moment().tz('Asia/Jakarta').format('HH:mm:ss | DD-MM-YYYY');
}

// Enhanced with retries and backoff
async function waitForTransaction(txHash, maxRetries = 40, initialBackoff = 3000) {
  // let provider = provider();
  let retries = 0;
  let backoff = initialBackoff;

  while (retries < maxRetries) {
    try {
      logger.loading(`Waiting for transaction ${txHash} to be confirmed (attempt ${retries + 1}/${maxRetries})...`);
      const receipt = await provider().getTransactionReceipt(txHash);

      if (receipt) {
        logger.success(`Transaction confirmed with ${receipt.confirmations} confirmations`);
        return receipt;
      }
    } catch (error) {
      logger.warn(`Error checking transaction status: ${error.message}`);
    }

    retries++;
    await delay(backoff);

    // Exponential backoff with a cap
    backoff = Math.min(backoff * 1.5, 1000);
  }

  throw new Error(`Transaction ${txHash} not confirmed after ${maxRetries} attempts`);
}

async function pollPacketHash(txHash, retries = 50, initialIntervalMs = 5000) {
  const headers = {
    'accept': 'application/graphql-response+json, application/json',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json',
    'origin': 'https://app.union.build',
    'referer': 'https://app.union.build/',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };

  const data = {
    query: `
      query ($submission_tx_hash: String!) {
        v2_transfers(args: {p_transaction_hash: $submission_tx_hash}) {
          packet_hash
        }
      }
    `,
    variables: {
      submission_tx_hash: txHash.startsWith('0x') ? txHash : `0x${txHash}`,
    },
  };

  let intervalMs = initialIntervalMs;

  for (let i = 0; i < retries; i++) {
    try {
      logger.loading(`Polling for packet hash (attempt ${i + 1}/${retries})...`);
      const res = await axios.post(graphqlEndpoint, data, {
        headers,
        timeout: 15000 // 15 second timeout
      });

      const result = res.data?.data?.v2_transfers;
      if (result && result.length > 0 && result[0].packet_hash) {
        return result[0].packet_hash;
      }
    } catch (e) {
      logger.warn(`Packet polling error: ${e.message}`);
    }

    // Exponential backoff with maximum interval
    intervalMs = Math.min(intervalMs * 1.5, 20000);
    await delay(intervalMs);
  }

  logger.warn(`Could not find packet hash for transaction ${txHash} after ${retries} attempts`);
  return null;
}

async function checkBalanceAndApprove(wallet, chainlinkAddress, spenderAddress) {
  let retries = 0;
  const maxRetries = 5;

  while (retries < maxRetries) {
    try {
      const chainlinkContract = new ethers.Contract(chainlinkAddress, CHAINLINK_ABI, wallet);

      // Check balance
      const balance = await chainlinkContract.balanceOf(wallet.address);
      if (balance === 0n) {
        logger.error(`${wallet.address} does not have any LINK tokens. Please fund your wallet first!`);
        return false;
      }

      logger.info(`LINK balance: ${ethers.formatUnits(balance, 18)} LINK`);

      // Check allowance
      const allowance = await chainlinkContract.allowance(wallet.address, spenderAddress);
      if (allowance === 0n) {
        logger.loading(`LINK token not approved. Sending approval transaction...`);
        const approveAmount = ethers.MaxUint256;

        try {
          const tx = await chainlinkContract.approve(spenderAddress, approveAmount, {
            maxFeePerGas: ethers.parseUnits('5', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
            gasLimit: 100000,
          });

          logger.info(`Approval transaction sent: ${explorer.tx(tx.hash)}`);
          const receipt = await waitForTransaction(tx.hash);

          if (receipt && receipt.status === 1) {
            logger.success(`Approval confirmed: ${explorer.tx(receipt.hash)}`);
            await delay(3000);
            return true;
          } else {
            logger.error(`Approval transaction failed or reverted`);
            return false;
          }
        } catch (err) {
          logger.error(`Approval failed: ${err.message}`);

          if (err.message.includes('timeout') || err.code === 'TIMEOUT') {
            ;
            retries++;
            continue;
          }

          return false;
        }
      } else {
        logger.success(`LINK already approved for ${spenderAddress}`);
        return true;
      }
    } catch (err) {
      logger.error(`Error checking balance or allowance: ${err.message}`);

      if (err.message.includes('timeout') || err.code === 'TIMEOUT') {
        ;
        retries++;
        await delay(3000);
        continue;
      }

      return false;
    }
  }

  logger.error(`Failed to check balance and approve after ${maxRetries} attempts`);
  return false;
}

async function sendFromWallet(walletInfo, maxTransaction) {
  let wallet = new ethers.Wallet(walletInfo.privatekey, provider());
  logger.loading(`Sending from ${wallet.address} (${walletInfo.name || 'Unnamed'})`);

  // Check gas balance
  try {
    const balance = await wallet.provider.getBalance(wallet.address);
    logger.info(`ETH balance: ${ethers.formatEther(balance)} ETH`);

    if (balance < ethers.parseEther('0.01')) {
      logger.warn(`Low ETH balance (${ethers.formatEther(balance)} ETH). You may need more ETH for gas.`);
    }
  } catch (error) {
    logger.warn(`Error checking ETH balance: ${error.message}`);
  }

  const shouldProceed = await checkBalanceAndApprove(wallet, CHAINLINK_ADDRESS, contractAddress);
  if (!shouldProceed) return;

  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
  const addressHex = wallet.address.slice(2).toLowerCase();
  const channelId = 4;
  const timeoutHeight = 0;

  for (let i = 1; i <= maxTransaction; i++) {
    logger.step(`${walletInfo.name || 'Unnamed'} | Transaction ${i}/${maxTransaction}`);

    const now = BigInt(Date.now()) * 1_000_000n;
    const oneDayNs = 86_400_000_000_000n;
    const timeoutTimestamp = (now + oneDayNs).toString();
    const timestampNow = Math.floor(Date.now() / 1000);
    const salt = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [wallet.address, timestampNow]));

    const operand = '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e000000000000000000000000000000000000000000000000000005af3107a4000000000000000000000000000000000000000000000000000000000000000022000000000000000000000000000000000000000000000000000000000000002600000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002a000000000000000000000000000000000000000000000000000005af3107a40000000000000000000000000000000000000000000000000000000000000000014' +
      addressHex +
      '000000000000000000000000000000000000000000000000000000000000000000000000000000000000002b78696f6e316d32336c63736c683268723875633838686b733972716c79676c3677777373376832717066300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014685ce6742351ae9b618f383883d6d1e0c5a31b4b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000044c494e4b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f436861696e4c696e6b20546f6b656e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003f78696f6e31613866707239383530617a707868646a66787a7a786e6b6b3564736c36387436646d74727937757265766138727130727332647333723372777000';

    const instruction = {
      version: 0,
      opcode: 2,
      operand,
    };

    let txAttempts = 0;
    const maxTxAttempts = 5;
    let txSuccess = false;

    while (txAttempts < maxTxAttempts && !txSuccess) {
      try {
        const startTime = Date.now();

        const gasPrice = await wallet.provider.getFeeData();

        // Create transaction with gas estimates
        const tx = await contract.send(
          channelId,
          timeoutHeight,
          timeoutTimestamp,
          salt,
          instruction,
          {
            maxFeePerGas: gasPrice.maxFeePerGas * 120n / 100n, // Increase by 20% for faster confirmation
            maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas * 120n / 100n,
            gasLimit: 500000, // Set a reasonable gas limit
          }
        );

        logger.info(`Transaction sent: ${explorer.tx(tx.hash)}`);

        // Wait for confirmation with our improved wait function
        const receipt = await waitForTransaction(tx.hash);

        const endTime = Date.now();
        const txTime = endTime - startTime;

        if (receipt && receipt.status === 1) {
          logger.success(`${timelog()} | ${walletInfo.name || 'Unnamed'} | Transaction Confirmed: ${explorer.tx(tx.hash)} (${txTime}ms)`);

          // Get packet hash (Union bridge transfer info)
          const txHash = tx.hash.startsWith('0x') ? tx.hash : `0x${tx.hash}`;
          const packetHash = await pollPacketHash(txHash);

          if (packetHash) {
            logger.success(`${timelog()} | ${walletInfo.name || 'Unnamed'} | Packet Submitted: ${union.tx(packetHash)}`);
          } else {
            logger.warn(`${timelog()} | ${walletInfo.name || 'Unnamed'} | No packet hash found, but transaction confirmed`);
          }

          txSuccess = true;
        } else {
          logger.error(`Transaction failed or reverted`);
          txAttempts++;
        }
      } catch (err) {
        txAttempts++;
        logger.error(`Transaction attempt ${txAttempts} failed: ${err.message}`);
      }
    }

    if (!txSuccess) {
      logger.error(`Failed to send transaction ${i} after ${maxTxAttempts} attempts`);
    }

    // Wait between transactions
    if (i < maxTransaction && txSuccess) {
      // Use random delay between transactions for more human-like behavior
      const randomDelay = Math.floor(Math.random() * 2000) + 3000; // 3-8 seconds
      logger.info(`Waiting ${randomDelay}ms before next transaction...`);
      await delay(randomDelay);
    }
  }
}

async function main() {
  try {
    // Load environment variables
    const privateKey = process.env.PRIVATE_KEY;
    const walletName = process.env.WALLET_NAME || 'Unnamed';

    if (!privateKey) {
      logger.error('PRIVATE_KEY environment variable is not set');
      process.exit(1);
    }

    if (!privateKey.startsWith('0x') || !/^(0x)[0-9a-fA-F]{64}$/.test(privateKey)) {
      logger.error('Invalid private key format. It must be a 64-character hexadecimal string starting with 0x');
      process.exit(1);
    }

    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const maxTransaction = getRandomInt(50, 110); // Reduced from 100-200 for testing
    let walletInfo = {
      privatekey: privateKey,
      name: walletName,
    };

    logger.loading(`Sending ${maxTransaction} Transactions from Holesky to Xion Testnet from ${walletInfo.name || 'Unnamed'}`);

    await sendFromWallet(walletInfo, maxTransaction);

    logger.info("All transactions completed.");
  } catch (err) {
    logger.error(`Main error: ${err.message}`);
    setTimeout(() => process.exit(1), 5000);
  }
}

// Initialize the application
main().catch((err) => {
  logger.error(`Fatal error: ${err.message}`);
  setTimeout(() => process.exit(1), 5000);
});