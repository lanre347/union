# Union Testnet Automation 🔄
![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

Automate your Union Testnet cross-chain transactions with this powerful NodeJS automation tool. Schedule and execute transactions between Holesky, Sepolia, Babylon, BSC, SEI, Corn, and Xion testnets using GitHub Actions.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Adding New Bridge Routes](#adding-new-bridge-routes)
- [Security Considerations](#security-considerations)
- [License](#license)

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
- ⏱️ **Scheduled Execution**: Run transactions automatically every 12 hours using GitHub Actions
- 🔍 **Transaction Tracking**: Monitor transaction status and packet confirmation
- 📊 **Smart Transaction Management**: Random number of transactions per run (50-110)
- 🛡️ **Error Handling**: Robust error handling and retry mechanisms with multiple RPC endpoints
- 📝 **Detailed Logging**: Comprehensive logging with timestamps and transaction details

## 🚀 Prerequisites

- Node.js >= 18.0.0
- GitHub account (for automated runs)
- Wallet with testnet tokens
- USDC or native tokens on respective testnets

## 📥 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/union-auto.git
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

Set up the following GitHub Secrets for automated runs:

- `PRIVATE_KEY`: Your wallet's private key
- `WALLET_NAME`: Your wallet's name (for logging purposes)

## 💻 Usage

### Manual Execution

Run individual scripts:

```bash
node GA_Holesky-Sepolia.js
node GA_Holesky-Babylon.js
node GA_Holesky-Xion.js
node GA_Sepolia-Holesky.js
node GA_Sepolia-Babylon.js
node BSC-Babylon.js
node Corn-Sei.js
node SEI-BSC.js
```

Or run all scripts with the index:

```bash
npm start
```

### Automated Execution

The GitHub Action workflow runs automatically every 12 hours. You can also trigger it manually from the Actions tab.

## 📁 Project Structure

```
├── .github/workflows/
│   └── run_bridge.yml      # GitHub Actions workflow configuration
├── GA_Holesky-Babylon.js   # Holesky to Babylon bridge script
├── GA_Holesky-Sepolia.js   # Holesky to Sepolia bridge script
├── GA_Holesky-Xion.js      # Holesky to Xion bridge script
├── GA_Sepolia-Babylon.js   # Sepolia to Babylon bridge script
├── GA_Sepolia-Holesky.js   # Sepolia to Holesky bridge script
├── package.json            # Project dependencies
└── README.md              # Project documentation
```

## 🤖 GitHub Actions

The project uses GitHub Actions for automation:

- Runs every 12 hours automatically
- Executes all bridge scripts sequentially
- Manages dependencies and environment setup
- Provides execution logs and status updates

View the workflow file: [.github/workflows/run_bridge.yml](.github/workflows/run_bridge.yml)

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env` files to version control
- Use secure secrets management in GitHub Actions
- Rotate private keys regularly

### API Security
- Use private RPC endpoints when possible
- Implement rate limiting for API calls
- Monitor for unusual transaction patterns

### Best Practices
- Keep dependencies updated
- Monitor GitHub security alerts
- Use checksummed addresses
- Follow secure Docker practices

### Limitations
- Maximum transactions per run: 50-110
- RPC endpoint rate limits apply
- API timeouts after 15 seconds

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
