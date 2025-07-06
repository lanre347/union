# Union Testnet Automation 🔄
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)
![License](https://img.shiel## 🔒 Security Considerationss.io/badge/license-MIT-blue?style=flat-square)

Automate your Union Testnet cross-chain transactions with this powerful NodeJS automation tool. Execute transactions between Holesky, Sepolia, Babylon, BSC, SEI, Corn, and Xion testnets using a convenient batch execution system.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Batch System](#-batch-system)
- [Security Considerations](#-security-considerations)
- [License](#-license)

## ✨ Features

- 🔄 **Cross-Chain Automation**: Automate transactions between multiple testnets
  - Holesky ↔️ Sepolia
  - Holesky ↔️ Babylon
  - Holesky ↔️ Xion
  - Sepolia ↔️ Babylon
  - Sepolia ↔️ Holesky
  - BSC ↔️ Babylon
  - Corn ↔️ SEI
  - SEI ↔️ BSC
- 🔍 **Transaction Tracking**: Monitor transaction status and packet confirmation
- 📊 **Smart Transaction Management**: Random number of transactions per run
- 🛡️ **Error Handling**: Robust error handling and retry mechanisms with multiple RPC endpoints
- 📝 **Detailed Logging**: Comprehensive logging with timestamps and transaction details
- 🔀 **Batch Execution**: Run scripts in organized batches (Ethereum networks, other networks)

## 🚀 Prerequisites

- Node.js >= 18.0.0
- Wallet with testnet tokens
- USDC, Chainlink Token, and Native Token for Gas

## 📥 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/orionnion/UnionTestnet_Automation.git
   cd union-auto
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your wallet info:
   ```
   PRIVATE_KEY=0xYourPrivateKeyHere
   WALLET_NAME=YourWalletName
   ```

## ⚙️ Configuration

Create a `.env` file with your wallet info:

- `PRIVATE_KEY`: Your wallet's private key
- `WALLET_NAME`: Your wallet's name (for logging purposes)

## 💻 Usage

### Execution

Run individual scripts:

```bash
node Holesky-Sepolia.js
node Holesky-Babylon.js
node Holesky-Xion.js
node Sepolia-Holesky.js
node Sepolia-Babylon.js
node BSC-Babylon.js
node Corn-Sei.js
node SEI-BSC.js
```

Run scripts in batches using the index.js:

```bash
# Run Ethereum-based scripts (Holesky, Sepolia)
node index.js ethereum

# Run other blockchain scripts (BSC, SEI, Corn)
node index.js other

# Run all scripts in sequence
node index.js all
```

Or with npm scripts:

```bash
npm run ethereum  # Run Ethereum batch
npm run other     # Run other blockchains batch
npm start         # Run all batches
```

## 📁 Project Structure

```
├── Holesky-Babylon.js      # Holesky to Babylon bridge script
├── Holesky-Sepolia.js      # Holesky to Sepolia bridge script
├── Holesky-Xion.js         # Holesky to Xion bridge script
├── Sepolia-Babylon.js      # Sepolia to Babylon bridge script
├── Sepolia-Holesky.js      # Sepolia to Holesky bridge script
├── BSC-Babylon.js          # BSC to Babylon bridge script
├── Corn-Sei.js             # Corn to SEI bridge script
├── SEI-BSC.js              # SEI to BSC bridge script 
├── index.js                # Script orchestration with batch execution
├── package.json            # Project dependencies
└── README.md               # Project documentation
```


## � Batch System

The project uses a batch system to organize and run scripts efficiently:

### Ethereum-based Batch
Scripts for Ethereum testnets (Holesky, Sepolia):
- `Holesky-Babylon.js`
- `Holesky-Sepolia.js`
- `Holesky-Xion.js`
- `Sepolia-Babylon.js`
- `Sepolia-Holesky.js`

### Other Blockchains Batch
Scripts for other blockchain testnets:
- `BSC-Babylon.js`
- `Corn-Sei.js`
- `SEI-BSC.js`

### Running Batches
You can run specific batches or all batches using:
```bash
node index.js ethereum   # Run Ethereum batch
node index.js other      # Run other blockchains batch
node index.js all        # Run all batches
```

## �🔒 Security Considerations

### Environment Variables
- Never commit `.env` files to version control

### Best Practices
- Keep dependencies updated
- Use checksummed addresses
- Implement proper error handling
- Follow secure coding practices

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
