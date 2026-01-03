# Oracle Update Guide

This guide explains how to deploy a new `GameScoreOracle` contract and update the `Contests` and/or `Pickem` contracts to use it.

## Overview

When you need to deploy a new oracle contract (e.g., after fixing bugs or adding features), you can use the automated deployment script that:

1. Deploys the new oracle contract
2. Adds it as a consumer to the Chainlink Functions subscription
3. Updates the Contests contract to use the new oracle
4. Optionally updates the Pickem contract to use the new oracle

## Prerequisites

1. **Environment Setup**: Ensure your `.env` file has:
   ```bash
   PRIVATE_KEY=0x...
   ETHERSCAN_API_KEY=...  # Optional, for contract verification
   ```

2. **Contract Addresses**: Know the addresses of:
   - `CONTESTS_ADDRESS` - The Contests contract address (if updating Contests)
   - `PICKEM_ADDRESS` - The Pickem contract address (if updating Pickem)

## Method 1: Using the Shell Script (Recommended)

The easiest way is to use the shell script:

```bash
# Update Contests contract on Base Mainnet
./scripts/deploy_and_update_oracle.sh base <CONTESTS_ADDRESS>

# Update Pickem contract on Base Mainnet
./scripts/deploy_and_update_oracle.sh base <PICKEM_ADDRESS>

# Update both contracts
./scripts/deploy_and_update_oracle.sh base <CONTESTS_ADDRESS> <PICKEM_ADDRESS>

# For Base Sepolia (testnet)
./scripts/deploy_and_update_oracle.sh base-sepolia <CONTESTS_ADDRESS> <PICKEM_ADDRESS>
```

### Using Makefile

```bash
# Update Contests contract
make deploy-and-update-oracle NETWORK=base CONTESTS_ADDRESS=0x...

# Update Pickem contract
make deploy-and-update-oracle NETWORK=base PICKEM_ADDRESS=0x...

# Update both
make deploy-and-update-oracle NETWORK=base CONTESTS_ADDRESS=0x... PICKEM_ADDRESS=0x...
```

## Method 2: Using Forge Script Directly

```bash
# Set environment variables
export PRIVATE_KEY=0x...
export CONTESTS_ADDRESS=0x...  # Optional
export PICKEM_ADDRESS=0x...     # Optional

# Deploy and update on Base Mainnet
forge script script/DeployAndUpdateOracle.s.sol:DeployAndUpdateOracle \
    --rpc-url https://mainnet.base.org \
    --broadcast \
    -vvv

# Deploy and update on Base Sepolia
forge script script/DeployAndUpdateOracle.s.sol:DeployAndUpdateOracle \
    --rpc-url https://sepolia.base.org \
    --broadcast \
    -vvv
```

## Method 3: Manual Step-by-Step

If you prefer to do it manually or need more control:

### Step 1: Deploy the Oracle

```bash
forge script script/DeployOracleSimple.s.sol:DeployOracleSimple \
    --rpc-url https://mainnet.base.org \
    --broadcast \
    -vvv
```

Note the deployed oracle address from the output.

### Step 2: Add Oracle as Chainlink Consumer

```bash
# Base Mainnet (subscription ID: 6)
cast send 0xf9B8fc078197181C841c296C876945aaa425B278 \
    'addConsumer(uint64,address)' \
    6 <ORACLE_ADDRESS> \
    --rpc-url https://mainnet.base.org \
    --private-key $PRIVATE_KEY

# Base Sepolia (subscription ID: 208)
cast send 0xf9B8fc078197181C841c296C876945aaa425B278 \
    'addConsumer(uint64,address)' \
    208 <ORACLE_ADDRESS> \
    --rpc-url https://sepolia.base.org \
    --private-key $PRIVATE_KEY
```

### Step 3: Update Contests Contract

```bash
cast send <CONTESTS_ADDRESS> \
    'setGameScoreOracle(address)' \
    <ORACLE_ADDRESS> \
    --rpc-url https://mainnet.base.org \
    --private-key $PRIVATE_KEY
```

### Step 4: Update Pickem Contract (if needed)

```bash
cast send <PICKEM_ADDRESS> \
    'setGameScoreOracle(address)' \
    <ORACLE_ADDRESS> \
    --rpc-url https://mainnet.base.org \
    --private-key $PRIVATE_KEY
```

### Step 5: Verify the Update

```bash
# Check Contests contract
cast call <CONTESTS_ADDRESS> 'gameScoreOracle()' --rpc-url https://mainnet.base.org

# Check Pickem contract
cast call <PICKEM_ADDRESS> 'gameScoreOracle()' --rpc-url https://mainnet.base.org
```

### Step 6: Verify Contract on BaseScan

```bash
make verify-oracle ADDRESS=<ORACLE_ADDRESS>
```

## Network Configuration

| Network | Chain ID | RPC URL | Subscription ID |
|---------|----------|---------|-----------------|
| Base Mainnet | 8453 | https://mainnet.base.org | 6 |
| Base Sepolia | 84532 | https://sepolia.base.org | 208 |

## Chainlink Functions Router

The Chainlink Functions Router address is the same for both networks:
- `0xf9B8fc078197181C841c296C876945aaa425B278`

## What Changed

### Contests Contract

Added a new `setGameScoreOracle` function that allows the owner to update the oracle address:

```solidity
function setGameScoreOracle(address gameScoreOracle_) external onlyOwner {
    if (gameScoreOracle_ == address(0)) revert ZeroAddress();
    gameScoreOracle = GameScoreOracle(gameScoreOracle_);
}
```

This follows the same pattern as `setTreasury` and `setRandomNumbers` functions.

## Security Notes

- Only the contract owner can call `setGameScoreOracle`
- The function validates that the new address is not zero
- Always verify the contract on BaseScan after deployment
- Test on testnet (Base Sepolia) before deploying to mainnet
- Keep your private key secure and never commit it to version control

## Troubleshooting

### "Must provide CONTESTS_ADDRESS or PICKEM_ADDRESS"

Make sure you provide at least one contract address when running the script.

### "Error: PRIVATE_KEY not set"

Ensure your `.env` file contains a `PRIVATE_KEY` variable.

### Transaction Fails

- Check that you have sufficient ETH for gas
- Verify you're using the correct network
- Ensure you're the owner of the Contests/Pickem contracts
- Check that the oracle address is valid

## Example Output

```
=== Deploy and Update Oracle ===
Network: Base Mainnet
Contests Address: 0x1234...

Running deployment script...

=== Step 1: Deploying New Oracle Contract ===
New Oracle deployed at: 0xABCD...

=== Step 2: Adding Oracle as Consumer ===
Oracle added to subscription 6

=== Step 3: Updating Contests Contract ===
Contests contract updated to use new oracle

=== Deployment Summary ===
New Oracle Address: 0xABCD...

Next Steps:
1. Verify the contract on BaseScan:
   make verify-oracle ADDRESS=0xABCD...
2. Verify the update:
   cast call 0x1234... 'gameScoreOracle()' --rpc-url https://mainnet.base.org
```

