# Fresh Deployment Guide - All Contracts

This guide explains how to do a complete fresh deployment of all Football Boxes contracts.

## Prerequisites

1. **Install Foundry**: Follow the [official installation guide](https://book.getfoundry.sh/getting-started/installation)
2. **Set up API Keys**: You'll need an Etherscan API key for contract verification (get one at [etherscan.io](https://etherscan.io/))
3. **Private Key**: Have your deployer private key ready (64 hex characters with 0x prefix)
4. **Sufficient Balance**: Ensure your deployer account has enough ETH for gas fees

## Environment Setup

Create a `.env` file in the `solidity/` directory (optional but recommended):

```bash
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
```

**Note**: The API key is optional. If not provided, contracts will be deployed successfully but not automatically verified.

## Quick Start - Method 1: Using Shell Script (Recommended)

The easiest way to deploy all contracts:

```bash
cd solidity

# Deploy to Base Sepolia (testnet)
./scripts/deploy_foundry.sh 0x<YOUR_PRIVATE_KEY> base-sepolia

# Deploy to Base Mainnet
./scripts/deploy_foundry.sh 0x<YOUR_PRIVATE_KEY> base

# Skip gas estimation for faster deployment
./scripts/deploy_foundry.sh 0x<YOUR_PRIVATE_KEY> base-sepolia --skip-estimation
```

## Method 2: Using Makefile Commands

```bash
cd solidity

# Deploy to Base Sepolia (with gas estimation)
make deploy-base-sepolia PRIVATE_KEY=0x<YOUR_PRIVATE_KEY>

# Deploy to Base Mainnet (with gas estimation)
make deploy-base PRIVATE_KEY=0x<YOUR_PRIVATE_KEY>

# Fastest deployment (skip gas estimation)
make deploy-base-sepolia-fast PRIVATE_KEY=0x<YOUR_PRIVATE_KEY>
make deploy-base-fast PRIVATE_KEY=0x<YOUR_PRIVATE_KEY>

# Deploy with automatic verification (slower)
make deploy-base-sepolia-verify PRIVATE_KEY=0x<YOUR_PRIVATE_KEY>
make deploy-base-verify PRIVATE_KEY=0x<YOUR_PRIVATE_KEY>
```

## Method 3: Direct Forge Command

```bash
cd solidity

# Set environment variables
export PRIVATE_KEY=0x<YOUR_PRIVATE_KEY>
export ETHERSCAN_API_KEY="your_api_key_here"  # Optional

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

## What Gets Deployed

The deployment script deploys **9 contracts** in this order:

1. **Boxes** - NFT contract for box ownership
2. **GameScoreOracle** - Oracle contract for fetching NFL game scores
3. **ContestsManager** - Read-only contract for contest data
4. **RandomNumbers** - Chainlink VRF for random number generation
5. **QuartersOnlyPayoutStrategy** - Payout strategy for quarter-based contests
6. **ScoreChangesPayoutStrategy** - Payout strategy for score-change-based contests
7. **Contests** - Main contest management contract
8. **PickemNFT** - NFT contract for Pickem entries
9. **Pickem** - Pickem contest contract

After deployment, the script also:
- Adds GameScoreOracle to Chainlink Functions subscription
- Configures all contract relationships
- Sets up inter-contract dependencies

## Gas Estimation

By default, the script estimates gas costs before deploying. You'll see:

```
=== Gas Estimation Mode ===
Estimating deployment costs...

Current gas price: 0.02 gwei

Boxes: ~ 1250000 gas
GameScoreOracle: ~ 2100000 gas
ContestsManager: ~ 980000 gas
RandomNumbers: ~ 1800000 gas
QuartersOnlyPayoutStrategy: ~ 800000 gas
ScoreChangesPayoutStrategy: ~ 1200000 gas
Contests: ~ 3200000 gas
PickemNFT: ~ 1500000 gas
Pickem: ~ 1800000 gas
Setup transactions: ~ 300000 gas

=== Cost Summary ===
Total estimated gas:     16668200
Gas price:               0.02 gwei
Total estimated cost:   0.016668 ETH
Your current balance:   10.000000 ETH
Remaining balance:      9.983332 ETH

Do you want to proceed with the deployment? [y/N]:
```

To skip gas estimation for faster deployment:
```bash
./scripts/deploy_foundry.sh 0x<PRIVATE_KEY> base-sepolia --skip-estimation
```

## Contract Verification

**By default, verification is skipped during deployment for faster deployments.**

### Option 1: Verify During Deployment (Slower)

To verify contracts automatically during deployment, set `SKIP_VERIFICATION=false`:

```bash
# Using shell script
SKIP_VERIFICATION=false ./scripts/deploy_foundry.sh 0x<PRIVATE_KEY> base

# Using Makefile
SKIP_VERIFICATION=false make deploy-base PRIVATE_KEY=0x...
```

**Note**: Requires `ETHERSCAN_API_KEY` to be set in your `.env` file.

### Option 2: Verify After Deployment (Recommended - Faster)

Deploy first, then verify separately:

```bash
# 1. Deploy (fast, no verification)
./scripts/deploy_foundry.sh 0x<PRIVATE_KEY> base

# 2. Verify contracts separately (deployer address auto-detected)
make verify-contracts-base
```

The verification script automatically detects the deployer address from deployment artifacts, so you don't need to specify it manually.

The verification script automatically detects the deployer address from deployment artifacts.

## Network Configuration

| Network | Chain ID | RPC URL | Subscription ID |
|---------|----------|---------|-----------------|
| Base Sepolia | 84532 | https://sepolia.base.org | 208 |
| Base Mainnet | 8453 | https://mainnet.base.org | 6 |

## Deployment Output

After successful deployment, you'll see:

```
=== Deployment Summary ===
Boxes:                      0x...
GameScoreOracle:            0x...
ContestsManager:            0x...
RandomNumbers:              0x...
QuartersOnlyPayoutStrategy: 0x...
ScoreChangesPayoutStrategy: 0x...
Contests:                   0x...
PickemNFT:                  0x...
Pickem:                     0x...
```

All deployment data is saved to:
- `broadcast/Deploy.s.sol/<network>/` - Transaction details and contract addresses
- `cache/` - Compilation cache
- `out/` - Compiled contracts and ABIs

## Post-Deployment Steps

1. **Save Contract Addresses**: Copy all contract addresses from the deployment output
2. **Verify Contracts**: Run verification if you skipped it during deployment
3. **Update Frontend**: Update your frontend configuration with the new contract addresses
4. **Test Contracts**: Test the contracts on testnet before using on mainnet

## Troubleshooting

### Insufficient Balance

Ensure your deployer account has enough ETH:
- Base Sepolia: ~0.01 ETH should be sufficient
- Base Mainnet: ~0.02 ETH should be sufficient (varies with gas prices)

### Network Issues

If RPC endpoint is unavailable:
- Use a custom RPC URL: `./scripts/deploy_foundry.sh 0x<PRIVATE_KEY> base https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY`
- Or use Infura: `https://base-mainnet.infura.io/v3/YOUR_API_KEY`

### Verification Failures

If verification fails:
1. Deployment still succeeds - contracts are deployed
2. Run verification separately: `make verify-contracts-base`
3. Check that `ETHERSCAN_API_KEY` is set correctly

### Private Key Format

Private key must be:
- 64 hex characters
- Prefixed with `0x`
- Example: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

## Security Notes

- ⚠️ **Never commit private keys to version control**
- ✅ Use environment variables or secure key management
- ✅ Test on testnet (Base Sepolia) before mainnet deployment
- ✅ Verify all contract addresses after deployment
- ✅ Keep your private key secure

## Example: Complete Fresh Deployment

```bash
# 1. Navigate to solidity directory
cd solidity

# 2. Set up environment (optional)
export PRIVATE_KEY=0x...
export ETHERSCAN_API_KEY=...

# 3. Deploy to testnet first
./scripts/deploy_foundry.sh $PRIVATE_KEY base-sepolia

# 4. Test the contracts on testnet

# 5. Deploy to mainnet
./scripts/deploy_foundry.sh $PRIVATE_KEY base

# 6. Verify contracts
make verify-contracts-base

# 7. Save contract addresses for frontend configuration
```

## Need Help?

- Check `FOUNDRY_DEPLOYMENT.md` for detailed deployment documentation
- Review `script/Deploy.s.sol` to understand the deployment process
- Check deployment artifacts in `broadcast/Deploy.s.sol/<network>/`

