# Foundry Deployment Guide

This guide explains how to deploy the Football Boxes contracts using Foundry instead of Hardhat.

## Prerequisites

1. **Install Foundry**: Follow the [official installation guide](https://book.getfoundry.sh/getting-started/installation)
2. **Set up API Keys**: You'll need an Etherscan API key for contract verification (get one at [etherscan.io](https://etherscan.io/))
3. **Private Key**: Have your deployer private key ready (64 hex characters with 0x prefix)

## Environment Setup

Set your Etherscan API key as an environment variable for automatic contract verification:

```bash
export ETHERSCAN_API_KEY="your_api_key_here"
```

**Important**: You need an **Etherscan API key** (not Basescan) for the V2 API. Get one at [etherscan.io](https://etherscan.io/).

**Note**: The API key is optional. If not provided, contracts will be deployed successfully but not automatically verified. Manual verification commands will be displayed instead.

## Deployment Methods

### Method 1: Using the Shell Script (Recommended)

The shell script provides the easiest way to deploy with comprehensive error checking, gas estimation, and colored output.

```bash
# Deploy to Base Sepolia (testnet) - fast deployment without verification
./scripts/deploy_foundry.sh 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef base-sepolia

# Deploy to Base Mainnet - fast deployment without verification
./scripts/deploy_foundry.sh 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef base

# Skip gas estimation for fastest deployment
./scripts/deploy_foundry.sh 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef base-sepolia --skip-estimation
```

### Method 2: Using Make Commands

```bash
# Fast deployment (with gas estimation, no verification)
make deploy-base-sepolia PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
make deploy-base PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Fastest deployment (skip gas estimation and verification)
make deploy-base-sepolia-fast PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Slower deployment (with verification during deployment)
make deploy-base-sepolia-verify PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Verify contracts after deployment
make verify-contracts-sepolia
make verify-contracts-base

# Gas estimation only (no deployment)
make estimate-gas PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef RPC_URL=https://sepolia.base.org
```

### Method 3: Direct Forge Command

```bash
# Set environment variables
export PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
export ETHERSCAN_API_KEY="your_api_key_here"  # Optional for auto-verification

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:Deploy \
    --rpc-url https://sepolia.base.org \
    --broadcast \
    --ffi \
    -vvvv

# Deploy to Base Mainnet
forge script script/Deploy.s.sol:Deploy \
    --rpc-url https://mainnet.base.org \
    --broadcast \
    --ffi \
    -vvvv
```

**Note**: The `--ffi` flag is required for automatic contract verification.

## Gas Estimation Feature

The deployment script includes built-in gas estimation to help you understand costs before deploying:

### How It Works

1. **Pre-Deployment Analysis**: Calculates gas costs for each contract based on bytecode size
2. **Setup Cost Estimation**: Estimates gas for configuration transactions
3. **Real-Time Gas Price**: Uses current network gas price for accurate cost calculation
4. **Balance Verification**: Checks if you have sufficient funds before proceeding
5. **User Control**: Requires explicit approval before spending funds

### Example Output

```
=== Gas Estimation Mode ===
Estimating deployment costs...

Current gas price: 0.02 gwei

Boxes: ~ 1250000 gas
GameScoreOracle: ~ 2100000 gas
ContestsReader: ~ 980000 gas
RandomNumbers: ~ 1800000 gas
Contests: ~ 3200000 gas
Setup transactions: ~ 300000 gas

=== Cost Summary ===
Total estimated gas:     14668200
Gas price (fallback):    1 gwei
Total estimated cost:   0.014668 ETH
Your current balance:   10.000000 ETH
Remaining balance:      9.985332 ETH

Note: These are estimates and actual costs may vary due to network conditions.

This will broadcast transactions to base-sepolia
Do you want to proceed with the deployment? [y/N]:
```

### Skipping Gas Estimation

If you want to deploy immediately without estimation:

```bash
# Skip estimation for faster deployment
./scripts/deploy_foundry.sh 0x1234... base-sepolia --skip-estimation

# Or use the fast make commands
make deploy-base-sepolia-fast PRIVATE_KEY=0x1234...
```

## Contract Verification

### Automatic Verification (Recommended)

```bash
# Deploy with automatic verification after deployment
SKIP_VERIFICATION=false make deploy-base-sepolia-verify PRIVATE_KEY=0x...
```

### Manual Verification (Default)

```bash
# 1. Deploy (fast)
make deploy-base-sepolia PRIVATE_KEY=0x...

# 2. Verify separately (owner address auto-detected)
make verify-contracts-sepolia
```

### Custom Verification

```bash
# Verify with specific owner address
./scripts/verify_contracts.sh base-sepolia 0x9036464e4ecD2d40d21EE38a0398AEdD6805a09B
```

**Verification Features:**
- ✅ **Auto-detects owner address** from deployment data
- ✅ **Configurable delays** (10 seconds between contracts by default)
- ✅ **Enhanced retry logic** (15 retries with 10-second delays)
- ✅ **Rate limit protection** with delays between contracts
- ✅ **Etherscan V2 API** for better reliability

## Deployment Process

The script performs these steps in order:

1. **Deploy Boxes Contract** - NFT contract for box ownership
2. **Deploy GameScoreOracle Contract** - Chainlink Functions oracle for game scores
3. **Deploy ContestsReader Contract** - Read-only contract for contest data
4. **Deploy RandomNumbers Contract** - Chainlink VRF for random number generation
5. **Add GameScoreOracle to Functions Subscription** - Register oracle with Chainlink
6. **Deploy Contests Contract** - Main contest management contract
7. **Configure Contract Relationships** - Set up inter-contract dependencies
8. **Auto-Verify Contracts** - Call external verification script (if SKIP_VERIFICATION=false and ETHERSCAN_API_KEY is set)

**Gas Estimation Process** (runs before deployment by default):
1. **Estimate Contract Sizes** - Calculate deployment gas for each contract
2. **Calculate Setup Costs** - Estimate gas for configuration transactions
3. **Show Cost Breakdown** - Display total estimated cost in ETH
4. **Check Balance** - Verify sufficient funds for deployment
5. **User Approval** - Wait for confirmation before proceeding

## Supported Networks

| Network | Chain ID | RPC URL | Block Explorer | Verification API |
|---------|----------|---------|----------------|------------------|
| Base Sepolia | 84532 | https://sepolia.base.org | https://sepolia.basescan.org | Etherscan V2 API |
| Base Mainnet | 8453 | https://mainnet.base.org | https://basescan.org | Etherscan V2 API |

## Advantages over Hardhat Deployment

1. **Speed**: Foundry is significantly faster than Hardhat for deployment
2. **Reliability**: Native Solidity execution with better error handling
3. **Security**: Private key passed as argument, never stored in code
4. **Simplicity**: Single script handles entire deployment process
5. **Gas Estimation**: Pre-deployment cost estimation with user approval
6. **Auto-Verification**: Automatic contract verification if BASESCAN_API_KEY is set
7. **Gas Optimization**: Better gas estimation and optimization
8. **Error Handling**: Graceful handling of verification failures
9. **Cost Control**: Never deploy without knowing the cost upfront

## Output

Upon successful deployment, you'll see:

**Gas Estimation Phase**:
- Individual contract deployment cost estimates
- Setup transaction cost estimates
- Total estimated cost in ETH
- Current account balance check
- User approval prompt

**Deployment Phase**:
- Contract addresses for all deployed contracts
- Automatic contract verification (if BASESCAN_API_KEY is set)
- Manual verification commands (if BASESCAN_API_KEY is not set)
- Transaction hashes and actual gas usage
- Deployment artifacts saved to `broadcast/` directory

## Troubleshooting

### Common Issues

1. **Insufficient Balance**: Ensure your deployer account has enough ETH for gas
2. **API Key Issues**: Verify your Basescan API key is valid (optional for deployment)
3. **Network Issues**: Check RPC endpoint availability
4. **Private Key Format**: Must be 64 hex characters with 0x prefix
5. **FFI Permission**: Ensure `--ffi` flag is used for automatic verification
6. **API Rate Limits**: Uses Etherscan V2 API to avoid rate limiting issues

### Verification Failures

If automatic verification fails:
1. The deployment will continue successfully
2. Manual verification commands will be displayed
3. You can run verification separately using the provided commands

**API V2 Migration**: The scripts now use [Etherscan's V2 API](https://docs.etherscan.io/etherscan-v2/v2-quickstart) which provides better rate limits and unified access across all chains.

```bash
# V2 API format with chainId parameter
forge verify-contract <CONTRACT_ADDRESS> contracts/src/<CONTRACT_NAME>.sol:<CONTRACT_NAME> --constructor-args <ARGS> --chain 84532 --etherscan-api-key $ETHERSCAN_API_KEY --verifier-url "https://api.etherscan.io/v2/api" --watch
```

## Security Notes

- Never commit private keys to version control
- Use environment variables or secure key management
- Verify contract addresses after deployment
- Test on testnet before mainnet deployment

## Deployment Artifacts

All deployment data is saved to:
- `broadcast/Deploy.s.sol/<network>/` - Transaction details and contract addresses
- `cache/` - Compilation cache
- `out/` - Compiled contracts and ABIs
