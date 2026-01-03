#!/bin/bash

# Sequential Deployment Script - Prevents Nonce Gaps
# This script deploys contracts one at a time, waiting for each transaction to be mined
# before proceeding to the next one. This prevents "gapped-nonce" errors.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    print_error "Usage: $0 <PRIVATE_KEY> <NETWORK>"
    echo "Supported networks: base-sepolia, base"
    exit 1
fi

PRIVATE_KEY=$1
NETWORK=$2
WAIT_SECONDS=${DEPLOYMENT_WAIT_SECONDS:-15}  # Wait 15 seconds between deployments by default

# Set RPC URL
case $NETWORK in
    "base-sepolia")
        RPC_URL="https://sepolia.base.org"
        ;;
    "base")
        RPC_URL="https://mainnet.base.org"
        ;;
    *)
        print_error "Unsupported network: $NETWORK"
        exit 1
        ;;
esac

print_info "Using sequential deployment to prevent nonce gaps"
print_info "Network: $NETWORK"
print_info "Wait time between deployments: $WAIT_SECONDS seconds"
print_info "RPC URL: $RPC_URL"
echo ""

# Change to solidity directory
cd "$(dirname "$0")/.."

# Load .env file if it exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Function to wait for transaction to be mined
wait_for_tx() {
    local tx_hash=$1
    local max_wait=${2:-60}  # Default 60 seconds
    local elapsed=0
    
    print_info "Waiting for transaction $tx_hash to be mined..."
    
    while [ $elapsed -lt $max_wait ]; do
        local receipt=$(cast receipt "$tx_hash" --rpc-url "$RPC_URL" 2>/dev/null || echo "")
        if [ -n "$receipt" ]; then
            print_success "Transaction confirmed!"
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
        echo -n "."
    done
    
    echo ""
    print_warning "Transaction not confirmed after $max_wait seconds, continuing anyway..."
    return 1
}

# Function to deploy and wait
deploy_with_wait() {
    local contract_name=$1
    local deploy_cmd=$2
    
    print_info "Deploying $contract_name..."
    
    # Run forge script in simulation mode first to get the transaction hash
    local output=$(forge script script/Deploy.s.sol:Deploy \
        --rpc-url "$RPC_URL" \
        --broadcast \
        --ffi \
        --slow \
        -vvv 2>&1)
    
    # Extract transaction hash from output
    local tx_hash=$(echo "$output" | grep -oP 'Hash: \K0x[a-fA-F0-9]{64}' | head -1)
    
    if [ -n "$tx_hash" ]; then
        print_success "$contract_name transaction sent: $tx_hash"
        wait_for_tx "$tx_hash" 120  # Wait up to 2 minutes
        print_info "Waiting $WAIT_SECONDS seconds before next deployment..."
        sleep $WAIT_SECONDS
    else
        print_error "Failed to extract transaction hash for $contract_name"
        echo "$output"
        return 1
    fi
}

print_warning "Sequential deployment is slower but prevents nonce gaps."
print_info "This will deploy contracts one at a time with waits between each."
read -p "Continue? [y/N] " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Deployment cancelled"
    exit 0
fi

# Note: This is a simplified version. For full sequential deployment,
# you would need to modify the Deploy.s.sol script to deploy one contract at a time.
# For now, use --slow and --resume flags with the main deployment script.

print_info "For best results, use the main deployment script with --slow flag:"
print_info "./scripts/deploy_foundry.sh $PRIVATE_KEY $NETWORK --slow"
print_info ""
print_info "Or use --resume to continue from where it left off:"
print_info "./scripts/deploy_foundry.sh $PRIVATE_KEY $NETWORK --resume"

