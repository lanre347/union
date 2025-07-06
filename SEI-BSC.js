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
    {
        inputs: [
            { internalType: 'address', name: 'token', type: 'address' },
            { internalType: 'address', name: 'recipient', type: 'address' },
            { internalType: 'address', name: 'amount', type: 'address' },
            { internalType: 'uint256', name: 'fee', type: 'uint256' },
        ],
        name: 'mint_efficient_7e80c46e',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    }
];

// Configuration
const contractAddress = '0x5fbe74a283f7954f10aa04c2edf55578811aeb03'; // Port section
const graphqlEndpoint = 'https://graphql.union.build/v1/graphql';
const baseExplorerUrl = 'https://seitrace.com/';
const unionUrl = 'https://app.union.build/explorer';

// Define constants for the transaction amounts based on the decoded calldata
const baseAmount1 = BigInt('0x9184e72a000'); // This matches the decoded value
const baseAmount2 = BigInt('0x273b2149e602a02'); // This matches the decoded value

// Define a constant hardcoded address for the contract's expected format
// This is the address found in the decoded successful transaction
const hardcodedAddress = '0000000000000000000000007bdf2f4e590b5b9523d6d91b5a193aa503021381';

// RPC Endpoints
const rpcProvider = [new JsonRpcProvider('https://evm-rpc-testnet.sei-apis.com')];
let currentRpcProviderIndex = 0;

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
async function waitForTransaction(txHash, maxRetries = 60, initialBackoff = 3000) {
    let retries = 0;
    let backoff = initialBackoff;

    while (retries < maxRetries) {
        try {
            logger.loading(`Waiting for transaction ${txHash} to be confirmed (attempt ${retries + 1}/${maxRetries})...`);
            const receipt = await provider().getTransactionReceipt(txHash);

            if (receipt) {
                // Check if the transaction is successful
                if (receipt.status === 1) {
                    logger.success(`Transaction confirmed with ${receipt.confirmations} confirmations`);
                    return receipt;
                } else {
                    logger.warn(`Transaction confirmed but has failed status. Checking for details...`);
                    // For some testnets, a status of 0 might still be in process
                    if (retries > maxRetries / 2) {
                        throw new Error("Transaction failed or reverted on chain");
                    }
                }
            }
        } catch (error) {
            logger.warn(`Error checking transaction status: ${error.message}`);

            // If we're getting specific errors about the transaction being reverted
            if (error.message.includes("reverted") || error.message.includes("failed")) {
                throw error; // Propagate these errors up
            }
        }

        retries++;
        await delay(backoff);

        // Exponential backoff with a cap
        backoff = Math.min(backoff * 1.5, 15000); // Increased max backoff
    }

    throw new Error(`Transaction ${txHash} not confirmed after ${maxRetries} attempts`);
}

async function pollPacketHash(txHash, retries = 40, initialIntervalMs = 5000) {
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

async function sendFromWallet(walletInfo, maxTransaction) {
    const wallet = new ethers.Wallet(walletInfo.privatekey, provider());
    logger.loading(`Sending from ${wallet.address} (${walletInfo.name || 'Unnamed'})`);

    // Check gas balance
    // try {
    //     const balance = await wallet.provider.getBalance(wallet.address);
    //     logger.info(`BTCN balance: ${ethers.formatEther(balance)} BTCN`);

    //     if (balance < ethers.parseEther('0.00000135 ')) {
    //         logger.warn(`Low BTCN balance (${ethers.formatEther(balance)} BTCN). You may need more BTCN for gas.`);
    //     }
    // } catch (error) {
    //     logger.warn(`Error checking BTCN balance: ${error.message}`);
    // }

    //   const shouldProceed = await checkBalanceAndApprove(wallet, CHAINLINK_ADDRESS, contractAddress);
    //   if (!shouldProceed) return;      
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, wallet);
    // No need for seiAddressHex anymore since we're using the buildUnionBridgeOperand function
    const channelId = 5;
    const timeoutHeight = 0; // Convert to BigInt
    let currentNonce = await provider().getTransactionCount(wallet.address);

    for (let i = 1; i <= maxTransaction; i++) {
        logger.step(`${walletInfo.name || 'Unnamed'} | Transaction ${i}/${maxTransaction}`);

        const timestampNow = BigInt(Math.floor(Date.now() / 1000));
        const salt = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [wallet.address, timestampNow]));
        let txAttempts = 0;
        const maxTxAttempts = 5;
        let txSuccess = false;

        while (txAttempts < maxTxAttempts && !txSuccess) {
            try {
                // Use the new function to build the operand with proper encoding
                // const operand = buildUnionBridgeOperand(wallet);
                const operand = contract.interface.encodeFunctionData('mint_efficient_7e80c46e', [
                    '0x0000000000000000000000000000002000000000',
                    '0x0000000000000000000000000000000200000000',
                    '0x0000000000000000000000000000004000000000',
                    '3848290697216'
                ]);

                const addressHex = wallet.address.startsWith('0x') ? wallet.address.slice(2) : wallet.address;

                const instruction = {
                    version: 0,
                    opcode: 2,
                    operand: operand + `000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000009184e72a00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000240000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000280000000000000000000000000000000000000000000000000000009184e72a0000000000000000000000000000000000000000000000000000000000000000014${addressHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${addressHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000000000000000000000000000035345490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000353656900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014e86bed5b0813430df660d17363b89fe9bd8232d800000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000273b2149e602a020000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${addressHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014${addressHex}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000014eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000000000000000000000000000035345490000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000353656900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000014e86bed5b0813430df660d17363b89fe9bd8232d8000000000000000000000000`,
                };
                const startTime = Date.now();

                // For better transaction stability and success rate
                await delay(1000); // Add a small delay before each transaction attempt

                // Get fee data with fallbacks for networks that don't support EIP-1559
                const feeData = await wallet.provider.getFeeData();

                // Use higher gas prices for SEI testnet to ensure transaction confirmation
                let maxFeePerGas = feeData.maxFeePerGas ?
                    BigInt(feeData.maxFeePerGas) * 150n / 100n : // Increase by 50% if available
                    ethers.parseUnits('30', "gwei"); // Higher default for testnets

                let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?
                    BigInt(feeData.maxPriorityFeePerGas) * 150n / 100n : // Increase by 50%
                    ethers.parseUnits('2', "gwei"); // Higher priority fee

                if (maxPriorityFeePerGas > maxFeePerGas) {
                    maxPriorityFeePerGas = maxFeePerGas;
                }

                // Generate proper timeout timestamp for the transaction
                // Use a consistent format that matches the expected format in the decoded calldata
                const now = BigInt(Date.now()) * 1_000_000n;
                const oneDayNs = 86_400_000_000_000n;
                const timeoutTimestamp = now + oneDayNs;

                let data = contract.interface.encodeFunctionData('send', [
                    channelId,
                    timeoutHeight,
                    timeoutTimestamp,
                    salt,
                    instruction,
                ]);


                const tx = await wallet.sendTransaction({
                    to: contractAddress,
                    data: data, // data already has '0x' prefix from contract.interface.encodeFunctionData
                    value: baseAmount1 + baseAmount2, // Use the sum of both baseAmount values for the transaction
                    gasLimit: 1000000n, // Double the gas limit for more complex transactions
                    ...(maxFeePerGas && maxPriorityFeePerGas ? {
                        maxFeePerGas: maxFeePerGas * 2n, // Double the max fee
                        maxPriorityFeePerGas: maxPriorityFeePerGas * 2n // Double the priority fee
                    } : {
                        gasPrice: maxFeePerGas * 2n // Double the gas price if needed
                    }),
                    nonce: currentNonce,
                    chainId: 1328n // SEI Testnet chain ID as BigInt
                });
                logger.info(`Transaction sent: ${explorer.tx(tx.hash)} with nonce ${currentNonce}`);

                // Increment the nonce for next transaction
                currentNonce++;

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
                    // Attempt to get more detailed error information
                    logger.error(`Transaction failed or reverted on chain`);
                    try {
                        // Try to get detailed error by simulating the transaction
                        const errorDetails = await provider().call({
                            to: contractAddress,
                            data: data,
                            value: baseAmount1 + baseAmount2, // Use the same value as the actual transaction
                        });
                        logger.error(`Error details: ${errorDetails}`);
                    } catch (simulationError) {
                        logger.error(`Simulation error: ${simulationError.message}`);
                        if (simulationError.data) {
                            logger.error(`Error data: ${simulationError.data}`);
                        }
                    }
                    txAttempts++;
                }
            } catch (err) {
                txAttempts++;
                logger.error(`Transaction attempt ${txAttempts} failed: ${err.message}`);
            }
        }

        if (!txSuccess) {
            logger.error(`Failed to send transaction ${i} after ${maxTxAttempts} attempts`);
            // Add a longer delay after failed transactions
            logger.info(`Waiting 10 seconds before trying the next transaction...`);
            await delay(10000);
        }

        // Wait between transactions
        if (i < maxTransaction && txSuccess) {
            // Use random delay between transactions for more human-like behavior
            const randomDelay = Math.floor(Math.random() * 2000) + 2000; // Longer delay (2-4 seconds)
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

        const maxTransaction = getRandomInt(500, 600); // Reduced from 100-200 for testing
        let walletInfo = {
            privatekey: privateKey,
            name: walletName,
        };

        logger.loading(`Sending ${maxTransaction} Transactions from SEI Testnet to BSC Testnet from ${walletInfo.name || 'Unnamed'}`);

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