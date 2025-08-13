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
        console.log(msg);
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

// Configuration
const contractAddress = '0x5fbe74a283f7954f10aa04c2edf55578811aeb03'; // Port section
const graphqlEndpoint = 'https://graphql.union.build/v1/graphql';
const baseExplorerUrl = 'https://testnet.cornscan.io';
const unionUrl = 'https://app.union.build/explorer';

// RPC Endpoints
const rpcProvider = [new JsonRpcProvider('https://testnet.corn-rpc.com')];
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
async function waitForTransaction(txHash, maxRetries = 40, initialBackoff = 3000) {
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
    const addressHex = wallet.address.slice(2).toLowerCase();
    const channelId = 3;
    const timeoutHeight = 0;
    let currentNonce = await provider().getTransactionCount(wallet.address);
    const cornvalue = ethers.parseEther('0.00000000001'.toString());

    for (let i = 1; i <= maxTransaction; i++) {
        logger.step(`${walletInfo.name || 'Unnamed'} | Transaction ${i}/${maxTransaction}`);

        const now = BigInt(Date.now()) * 1_000_000n;
        const oneDayNs = 86_400_000_000_000n;
        const timeoutTimestamp = (now + oneDayNs).toString();
        const timestampNow = Math.floor(Date.now() / 1000);
        const salt = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [wallet.address, timestampNow]));

        const operand = '0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001c000000000000000000000000000000000000000000000000000000000009896800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000024000000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000028000000000000000000000000000000000000000000000000000000000009896800000000000000000000000000000000000000000000000000000000000000014' +
            addressHex +
            '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000147bdf2f4e590b5b9523d6d91b5a193aa5030213810000000000000000000000000000000000000000000000000000000000000000000000000000000000000014eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000000000000000000000000000044254434e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007426974636f726e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001492b3bc0bc3ac0ee60b04a0bbc4a09deb3914c886000000000000000000000000';

        const instruction = {
            version: 0,
            opcode: 2,
            operand,
        };

        let txAttempts = 0;
        const maxTxAttempts = 50000000000000000000000;
        let txSuccess = false;

        while (txAttempts < maxTxAttempts && !txSuccess) {
            try {
                const startTime = Date.now();

                const gasPrice = await wallet.provider.getFeeData();
                const maxFeePerGas = gasPrice.maxFeePerGas * 120n / 100n // Increase by 20% for faster confirmation
                const maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas * 120n / 100n

                // Create transaction with gas estimates
                // const tx = await contract.send(
                //     channelId,
                //     timeoutHeight,
                //     timeoutTimestamp,
                //     salt,
                //     instruction,
                //     {
                // maxFeePerGas: gasPrice.maxFeePerGas * 120n / 100n, // Increase by 20% for faster confirmation
                // maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas * 120n / 100n,
                //         gasLimit: 136400, // Set a reasonable gas limit
                //     }
                // );

                const tx = await wallet.sendTransaction({
                    to: contractAddress,
                    data: contract.interface.encodeFunctionData('send', [
                        channelId,
                        timeoutHeight,
                        timeoutTimestamp,
                        salt,
                        instruction,
                    ]), value: '0x' + cornvalue.toString(16),
                    gasLimit: 0x21534,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    nonce: currentNonce,
                    chainId: 21000001 // Corn Testnet chain ID
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
            const randomDelay = Math.floor(Math.random() * 1000) + 100;
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

        logger.loading(`Sending ${maxTransaction} Transactions from Corn Testnet to SEI Testnet from ${walletInfo.name || 'Unnamed'}`);

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
