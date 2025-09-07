# Foundry Deployment Guide

This guide explains how to deploy the Football Boxes contracts using Foundry instead of Hardhat.

## Prerequisites

1. **Install Foundry**: Follow the [official installation guide](https://book.getfoundry.sh/getting-started/installation)
2. **Set up API Keys**: You'll need a Basescan API key for contract verification
3. **Private Key**: Have your deployer private key ready (64 hex characters with 0x prefix)

## Environment Setup

Set your Basescan API key as an environment variable for automatic contract verification:

```bash
export BASESCAN_API_KEY="your_api_key_here"
```

**Note**: The API key is optional. If not provided, contracts will be deployed successfully but not automatically verified. Manual verification commands will be displayed instead.

## Deployment Methods

### Method 1: Using the Shell Script (Recommended)

The shell script provides the easiest way to deploy with comprehensive error checking and colored output.

```bash
# Deploy to Base Sepolia (testnet)
./scripts/deploy_foundry.sh 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef base-sepolia

# Deploy to Base Mainnet
./scripts/deploy_foundry.sh 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef base
```

### Method 2: Using Make Commands

```bash
# Deploy to Base Sepolia
make deploy-base-sepolia PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Deploy to Base Mainnet
make deploy-base PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Generic deployment (specify network)
make deploy-foundry PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef NETWORK=base-sepolia
```

### Method 3: Direct Forge Command

```bash
# Set environment variables
export PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
export BASESCAN_API_KEY="your_api_key_here"  # Optional for auto-verification

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

## Deployment Process

The script performs these steps in order:

1. **Deploy Boxes Contract** - NFT contract for box ownership
2. **Deploy GameScoreOracle Contract** - Chainlink Functions oracle for game scores
3. **Deploy ContestsReader Contract** - Read-only contract for contest data
4. **Deploy RandomNumbers Contract** - Chainlink VRF for random number generation
5. **Add GameScoreOracle to Functions Subscription** - Register oracle with Chainlink
6. **Deploy Contests Contract** - Main contest management contract
7. **Configure Contract Relationships** - Set up inter-contract dependencies
8. **Auto-Verify Contracts** - Automatically verify all contracts on block explorer (if BASESCAN_API_KEY is set)

## Supported Networks

| Network | Chain ID | RPC URL | Block Explorer |
|---------|----------|---------|----------------|
| Base Sepolia | 84532 | https://sepolia.base.org | https://sepolia.basescan.org |
| Base Mainnet | 8453 | https://mainnet.base.org | https://basescan.org |

## Advantages over Hardhat Deployment

1. **Speed**: Foundry is significantly faster than Hardhat for deployment
2. **Reliability**: Native Solidity execution with better error handling
3. **Security**: Private key passed as argument, never stored in code
4. **Simplicity**: Single script handles entire deployment process
5. **Auto-Verification**: Automatic contract verification if BASESCAN_API_KEY is set
6. **Gas Optimization**: Better gas estimation and optimization
7. **Error Handling**: Graceful handling of verification failures

## Output

Upon successful deployment, you'll see:

- Contract addresses for all deployed contracts
- Automatic contract verification (if BASESCAN_API_KEY is set)
- Manual verification commands (if BASESCAN_API_KEY is not set)
- Transaction hashes and gas usage
- Deployment artifacts saved to `broadcast/` directory

## Troubleshooting

### Common Issues

1. **Insufficient Balance**: Ensure your deployer account has enough ETH for gas
2. **API Key Issues**: Verify your Basescan API key is valid (optional for deployment)
3. **Network Issues**: Check RPC endpoint availability
4. **Private Key Format**: Must be 64 hex characters with 0x prefix
5. **FFI Permission**: Ensure `--ffi` flag is used for automatic verification

### Verification Failures

If automatic verification fails:
1. The deployment will continue successfully
2. Manual verification commands will be displayed
3. You can run verification separately using the provided commands

```bash
forge verify-contract <CONTRACT_ADDRESS> contracts/src/<CONTRACT_NAME>.sol:<CONTRACT_NAME> --constructor-args <ARGS> --etherscan-api-key $BASESCAN_API_KEY --verifier-url <VERIFIER_URL> --watch
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
