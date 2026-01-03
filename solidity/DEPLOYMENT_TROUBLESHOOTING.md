# Deployment Troubleshooting Guide

## Common Errors and Solutions

### 1. "gapped-nonce tx from delegated accounts"

**Cause**: Your account has pending transactions or is a smart contract wallet with transaction limits. Forge tries to send all transactions at once, causing nonce gaps.

**Solutions**:

#### Option A: Use `--resume` flag (Recommended)
```bash
# Wait 2-5 minutes for pending transactions to be mined, then:
./scripts/deploy_foundry.sh 0x<PRIVATE_KEY> base --resume
```

#### Option B: Wait and retry
```bash
# Check current nonce
cast nonce 0x<YOUR_ADDRESS> --rpc-url https://mainnet.base.org

# Wait for pending transactions to be mined (check on BaseScan)
# Then retry deployment
./scripts/deploy_foundry.sh 0x<PRIVATE_KEY> base
```

#### Option C: Use `--slow` flag (Already enabled by default)
The deployment script now uses `--slow` flag which adds delays between transactions. This helps but doesn't guarantee prevention of nonce gaps.

### 2. "in-flight transaction limit reached for delegated accounts"

**Cause**: Too many pending transactions from your account.

**Solution**: 
1. Wait 5-10 minutes for pending transactions to be mined
2. Check transaction status on BaseScan
3. Use `--resume` to continue from last successful transaction

### 3. Contract Size Limit Exceeded

**Error**: `Error: <Contract> is above the contract size limit (24597 > 24576)`

**Solution**: The contract has been optimized. If you still see this error:
1. Check contract size: `forge build --sizes`
2. Further optimize by removing unused code or splitting into libraries

## Best Practices

### 1. Check Account Status Before Deployment
```bash
# Check current nonce
cast nonce 0x<YOUR_ADDRESS> --rpc-url https://mainnet.base.org

# Check balance
cast balance 0x<YOUR_ADDRESS> --rpc-url https://mainnet.base.org
```

### 2. Monitor Pending Transactions
- Use BaseScan to check for pending transactions
- Wait for them to be mined before deploying new contracts

### 3. Use `--resume` for Interrupted Deployments
If deployment fails partway through:
```bash
./scripts/deploy_foundry.sh 0x<PRIVATE_KEY> base --resume
```

### 4. Deploy During Low Network Activity
- Deploy during off-peak hours for faster confirmation
- Use higher gas prices if needed (though Base is usually cheap)

## Deployment Workflow

### Successful Deployment Flow
1. **Estimate gas** (optional but recommended)
2. **Deploy contracts** - Script uses `--slow` flag automatically
3. **Wait for confirmations** - Each transaction needs to be mined
4. **Verify contracts** - Run verification separately

### If Deployment Fails Partway Through
1. **Check what was deployed** - Look at broadcast artifacts
2. **Wait for pending transactions** - 2-5 minutes
3. **Resume deployment** - Use `--resume` flag
4. **Verify deployed contracts** - Use `make verify-contracts-base`

## Smart Contract Wallet Considerations

If you're using a smart contract wallet (like Safe, Argent, etc.):
- These wallets have stricter transaction limits
- Use `--resume` flag more frequently
- Consider deploying contracts one at a time
- Wait longer between deployments (15-30 seconds)

## Getting Help

If you continue to experience issues:
1. Check the broadcast artifacts: `broadcast/Deploy.s.sol/8453/run-latest.json`
2. Verify transaction hashes on BaseScan
3. Check account nonce matches expected values
4. Ensure sufficient balance for gas fees

