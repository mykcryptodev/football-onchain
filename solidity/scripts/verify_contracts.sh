#!/bin/bash

# Contract Verification Script
# Usage: ./scripts/verify_contracts.sh [NETWORK] [OWNER_ADDRESS]

set -e

# Configuration
VERIFICATION_DELAY=10  # Seconds to wait between contract verifications

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

NETWORK=${1:-"base-sepolia"}
OWNER_ADDRESS=${2:-""}

# Set chain ID and verifier URL based on network (using Etherscan V2 API)
case $NETWORK in
    "base-sepolia")
        CHAIN_ID="84532"
        VERIFIER_URL="https://api.etherscan.io/v2/api"
        ;;
    "base")
        CHAIN_ID="8453"
        VERIFIER_URL="https://api.etherscan.io/v2/api"
        ;;
    *)
        print_error "Unsupported network: $NETWORK"
        echo "Supported networks: base-sepolia, base"
        exit 1
        ;;
esac

# Change to solidity directory
cd "$(dirname "$0")/.."

# Load .env file if it exists
if [ -f .env ]; then
    print_info "Loading environment variables from .env file..."
    set -a  # automatically export all variables
    source .env
    set +a  # stop automatically exporting
fi

# Check for Etherscan API key (V2 API)
if [ -z "$ETHERSCAN_API_KEY" ]; then
    print_error "ETHERSCAN_API_KEY environment variable not set"
    print_info "You need an Etherscan API key for V2 API verification"
    print_info "1. Go to https://etherscan.io/ and create an account"
    print_info "2. Generate an API key in your account dashboard"
    print_info "3. Set the API key with: export ETHERSCAN_API_KEY=your_api_key"
    exit 1
fi

print_info "Using network: $NETWORK"
print_info "Verifier URL: $VERIFIER_URL"

# Get the latest deployment from broadcast directory
BROADCAST_DIR="broadcast/Deploy.s.sol"
if [ "$NETWORK" = "base-sepolia" ]; then
    CHAIN_DIR="$BROADCAST_DIR/84532"
elif [ "$NETWORK" = "base" ]; then
    CHAIN_DIR="$BROADCAST_DIR/8453"
fi

if [ ! -d "$CHAIN_DIR" ]; then
    print_error "No deployment found for $NETWORK"
    print_info "Expected directory: $CHAIN_DIR"
    exit 1
fi

# Find the latest run file
LATEST_RUN=$(find "$CHAIN_DIR" -name "run-*.json" | sort -V | tail -1)

if [ -z "$LATEST_RUN" ]; then
    print_error "No deployment run found in $CHAIN_DIR"
    exit 1
fi

print_info "Using deployment data from: $LATEST_RUN"

# Extract contract addresses from the deployment file
print_info "Extracting contract addresses from latest deployment..."

if command -v jq &> /dev/null; then
    # Use jq if available for robust JSON parsing
    BOXES_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "Boxes") | .contractAddress' "$LATEST_RUN" 2>/dev/null | head -1)
    ORACLE_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "GameScoreOracle") | .contractAddress' "$LATEST_RUN" 2>/dev/null | head -1)
    MANAGER_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "ContestsManager") | .contractAddress' "$LATEST_RUN" 2>/dev/null | head -1)
    RANDOM_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "RandomNumbers") | .contractAddress' "$LATEST_RUN" 2>/dev/null | head -1)
    QUARTERS_STRATEGY_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "QuartersOnlyPayoutStrategy") | .contractAddress' "$LATEST_RUN" 2>/dev/null | head -1)
    SCORE_CHANGES_STRATEGY_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "ScoreChangesPayoutStrategy") | .contractAddress' "$LATEST_RUN" 2>/dev/null | head -1)
    CONTESTS_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "Contests") | .contractAddress' "$LATEST_RUN" 2>/dev/null | head -1)
else
    print_warning "jq not found. Please install jq for automatic address extraction, or provide addresses manually."
fi

# Fallback: ask user for addresses if automatic extraction failed
if [ -z "$BOXES_ADDRESS" ] || [ "$BOXES_ADDRESS" = "null" ]; then
    echo ""
    print_warning "Could not auto-extract addresses. Please provide them manually:"
    echo -n "Boxes address: "
    read BOXES_ADDRESS
    echo -n "GameScoreOracle address: "
    read ORACLE_ADDRESS
    echo -n "ContestsManager address: "
    read MANAGER_ADDRESS
    echo -n "RandomNumbers address: "
    read RANDOM_ADDRESS
    echo -n "QuartersOnlyPayoutStrategy address: "
    read QUARTERS_STRATEGY_ADDRESS
    echo -n "ScoreChangesPayoutStrategy address: "
    read SCORE_CHANGES_STRATEGY_ADDRESS
    echo -n "Contests address: "
    read CONTESTS_ADDRESS
else
    print_success "Found contract addresses:"
    echo "  Boxes: $BOXES_ADDRESS"
    echo "  GameScoreOracle: $ORACLE_ADDRESS"
    echo "  ContestsManager: $MANAGER_ADDRESS"
    echo "  RandomNumbers: $RANDOM_ADDRESS"
    echo "  QuartersOnlyPayoutStrategy: $QUARTERS_STRATEGY_ADDRESS"
    echo "  ScoreChangesPayoutStrategy: $SCORE_CHANGES_STRATEGY_ADDRESS"
    echo "  Contests: $CONTESTS_ADDRESS"
fi

# Verify each contract
print_info "Starting contract verification..."

echo ""
print_info "Verifying Boxes..."
forge verify-contract "$BOXES_ADDRESS" \
    contracts/src/Boxes.sol:Boxes \
    --chain "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --verifier-url "$VERIFIER_URL" \
    --watch \
    --retries 15 \
    --delay 10

echo ""
print_info "Waiting $VERIFICATION_DELAY seconds to avoid rate limits..."
sleep $VERIFICATION_DELAY

echo ""
print_info "Verifying GameScoreOracle..."
if [ "$NETWORK" = "base-sepolia" ]; then
    FUNCTIONS_ROUTER="0xf9B8fc078197181C841c296C876945aaa425B278"
else
    FUNCTIONS_ROUTER="0xf9B8fc078197181C841c296C876945aaa425B278"
fi

forge verify-contract "$ORACLE_ADDRESS" \
    contracts/src/GameScoreOracle.sol:GameScoreOracle \
    --constructor-args $(cast abi-encode "constructor(address)" "$FUNCTIONS_ROUTER") \
    --chain "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --verifier-url "$VERIFIER_URL" \
    --watch \
    --retries 15 \
    --delay 10

echo ""
print_info "Waiting $VERIFICATION_DELAY seconds to avoid rate limits..."
sleep $VERIFICATION_DELAY

echo ""
print_info "Verifying ContestsManager..."
forge verify-contract "$MANAGER_ADDRESS" \
    contracts/src/ContestsManager.sol:ContestsManager \
    --chain "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --verifier-url "$VERIFIER_URL" \
    --watch \
    --retries 15 \
    --delay 10

echo ""
print_info "Waiting $VERIFICATION_DELAY seconds to avoid rate limits..."
sleep $VERIFICATION_DELAY

echo ""
print_info "Verifying RandomNumbers..."
if [ "$NETWORK" = "base-sepolia" ]; then
    VRF_WRAPPER="0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed"
else
    VRF_WRAPPER="0xb0407dbe851f8318bd31404A49e658143C982F23"
fi

forge verify-contract "$RANDOM_ADDRESS" \
    contracts/src/RandomNumbers.sol:RandomNumbers \
    --constructor-args $(cast abi-encode "constructor(address)" "$VRF_WRAPPER") \
    --chain "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --verifier-url "$VERIFIER_URL" \
    --watch \
    --retries 15 \
    --delay 10

echo ""
print_info "Waiting $VERIFICATION_DELAY seconds to avoid rate limits..."
sleep $VERIFICATION_DELAY

echo ""
print_info "Verifying QuartersOnlyPayoutStrategy..."
forge verify-contract "$QUARTERS_STRATEGY_ADDRESS" \
    contracts/src/QuartersOnlyPayoutStrategy.sol:QuartersOnlyPayoutStrategy \
    --chain "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --verifier-url "$VERIFIER_URL" \
    --watch \
    --retries 15 \
    --delay 10

echo ""
print_info "Waiting $VERIFICATION_DELAY seconds to avoid rate limits..."
sleep $VERIFICATION_DELAY

echo ""
print_info "Verifying ScoreChangesPayoutStrategy..."
forge verify-contract "$SCORE_CHANGES_STRATEGY_ADDRESS" \
    contracts/src/ScoreChangesPayoutStrategy.sol:ScoreChangesPayoutStrategy \
    --chain "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --verifier-url "$VERIFIER_URL" \
    --watch \
    --retries 15 \
    --delay 10

echo ""
print_info "Waiting $VERIFICATION_DELAY seconds to avoid rate limits..."
sleep $VERIFICATION_DELAY

echo ""
print_info "Verifying Contests..."

# Use provided owner address or extract from deployment data
if [ -z "$OWNER_ADDRESS" ]; then
    if command -v jq &> /dev/null; then
        OWNER_ADDRESS=$(jq -r '.transactions[0].transaction.from' "$LATEST_RUN" 2>/dev/null)
        print_info "Extracted owner address from deployment: $OWNER_ADDRESS"
    else
        print_error "Owner address not provided and jq not available for extraction"
        echo -n "Please enter the owner address: "
        read OWNER_ADDRESS
    fi
else
    print_info "Using provided owner address: $OWNER_ADDRESS"
fi

CONTESTS_ARGS=$(cast abi-encode "constructor(address,address,address,address,address)" \
    "$OWNER_ADDRESS" \
    "$BOXES_ADDRESS" \
    "$ORACLE_ADDRESS" \
    "$MANAGER_ADDRESS" \
    "$RANDOM_ADDRESS")

forge verify-contract "$CONTESTS_ADDRESS" \
    contracts/src/Contests.sol:Contests \
    --constructor-args "$CONTESTS_ARGS" \
    --chain "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --verifier-url "$VERIFIER_URL" \
    --watch \
    --retries 15 \
    --delay 10

print_success "All contracts verified!"
print_info "You can now view your verified contracts on the block explorer"
