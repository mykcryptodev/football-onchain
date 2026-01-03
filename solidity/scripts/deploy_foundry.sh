#!/bin/bash

# Football Boxes Foundry Deployment Script
# Usage: ./scripts/deploy_foundry.sh <PRIVATE_KEY> [NETWORK] [RPC_URL] [--skip-estimation] [--resume] [--no-delays]
# 
# Environment variables:
#   ADD_DEPLOYMENT_DELAYS=true|false  - Enable/disable delays between deployments (default: true)
#   DEPLOYMENT_DELAY_SECONDS=N       - Seconds to wait between deployments (default: 10)

set -e

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

# Check if private key is provided
if [ -z "$1" ]; then
    print_error "Private key is required!"
    echo "Usage: $0 <PRIVATE_KEY> [NETWORK] [RPC_URL] [--skip-estimation]"
    echo ""
    echo "Supported networks:"
    echo "  - base-sepolia (default)"
    echo "  - base"
    echo ""
    echo "Examples:"
    echo "  $0 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef base-sepolia"
    echo "  $0 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef base https://mainnet.base.org"
    echo "  $0 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef base https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
    exit 1
fi

PRIVATE_KEY=$1
NETWORK=${2:-"base-sepolia"}
SKIP_ESTIMATION=false
RESUME_FLAG=""
CUSTOM_RPC_URL=""

# Parse all arguments for flags and RPC URL
for arg in "$@"; do
    case $arg in
        --skip-estimation)
            SKIP_ESTIMATION=true
            ;;
        --resume)
            RESUME_FLAG="--resume"
            ;;
        --no-delays)
            ADD_DEPLOYMENT_DELAYS=false
            ;;
        http*)
            # If it looks like a URL, treat it as custom RPC URL
            CUSTOM_RPC_URL="$arg"
            ;;
    esac
done

# If NETWORK is a flag, reset it
if [[ "$NETWORK" == --* ]]; then
    NETWORK="base-sepolia"
fi

# Validate private key format
if [[ ! $PRIVATE_KEY =~ ^0x[0-9a-fA-F]{64}$ ]]; then
    print_error "Invalid private key format. Must be 64 hex characters prefixed with 0x"
    exit 1
fi

# Set RPC URLs based on network or custom URL
if [ -n "$CUSTOM_RPC_URL" ]; then
    RPC_URL="$CUSTOM_RPC_URL"
    print_info "Using custom RPC URL: $RPC_URL"
else
    case $NETWORK in
        "base-sepolia")
            RPC_URL="https://sepolia.base.org"
            ;;
        "base")
            RPC_URL="https://mainnet.base.org"
            ;;
        *)
            print_error "Unsupported network: $NETWORK"
            echo "Supported networks: base-sepolia, base"
            exit 1
            ;;
    esac
    print_info "Using default RPC URL for $NETWORK: $RPC_URL"
fi

print_info "Starting deployment on $NETWORK..."

# Change to solidity directory
cd "$(dirname "$0")/.."

# Load .env file if it exists
if [ -f .env ]; then
    print_info "Loading environment variables from .env file..."
    set -a  # automatically export all variables
    source .env
    set +a  # stop automatically exporting
fi

# Check for Etherscan API key (after loading .env)
if [ -z "$ETHERSCAN_API_KEY" ]; then
    print_warning "ETHERSCAN_API_KEY environment variable not set"
    print_info "Contracts will be deployed but not automatically verified"
    print_info "You need an Etherscan API key for V2 API verification"
    print_info "1. Go to https://etherscan.io/ and create an account"
    print_info "2. Generate an API key and set: export ETHERSCAN_API_KEY=your_api_key"
else
    print_info "ETHERSCAN_API_KEY found - contracts will be automatically verified"
fi

# Check if foundry is installed
if ! command -v forge &> /dev/null; then
    print_error "Forge not found. Please install Foundry: https://book.getfoundry.sh/getting-started/installation"
    exit 1
fi

# Build contracts
print_info "Building contracts..."
forge build

if [ $? -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

print_success "Build completed"

export PRIVATE_KEY=$PRIVATE_KEY

if [ "$SKIP_ESTIMATION" = false ]; then
    # Run gas estimation first
    print_info "Estimating deployment costs..."
    export ESTIMATE_GAS_ONLY=true

    forge script script/Deploy.s.sol:Deploy \
        --rpc-url $RPC_URL \
        --ffi \
        -v

    # Reset the estimation flag
    unset ESTIMATE_GAS_ONLY

    echo ""
    print_warning "This will broadcast transactions to $NETWORK"
    echo -n "Do you want to proceed with the deployment? [y/N]: "
    read -r response

    case $response in
        [yY][eE][sS]|[yY])
            print_info "Proceeding with deployment..."
            ;;
        *)
            print_info "Deployment cancelled by user"
            exit 0
            ;;
    esac
else
    print_info "Skipping gas estimation (--skip-estimation flag provided)"
    print_warning "This will broadcast transactions to $NETWORK"
fi

# Run the actual deployment
print_info "Deploying contracts..."

# Check if we should resume from previous deployment
if [ -z "$RESUME_FLAG" ]; then
    if [ -f "broadcast/Deploy.s.sol/8453/run-latest.json" ] || [ -f "broadcast/Deploy.s.sol/84532/run-latest.json" ]; then
        print_warning "Previous deployment artifacts found."
        print_info "If deployment failed due to nonce gap, use --resume flag to continue."
        print_info "If you want to start fresh, delete the broadcast directory first."
    fi
else
    print_info "Resuming from previous deployment..."
fi

# Build forge arguments
# Use --slow flag to add delays between transactions (helps prevent nonce gaps)
FORGE_ARGS="--rpc-url $RPC_URL --broadcast --ffi --slow -vvvv"

print_info "Using --slow flag to add delays between transactions"
print_info "This helps prevent 'gapped-nonce' errors with smart contract wallets"
print_info ""
print_warning "If you still encounter nonce gaps:"
print_info "  1. Wait 2-5 minutes for pending transactions to be mined"
print_info "  2. Use --resume flag to continue from last successful transaction"
print_info "  3. Check your account's nonce: cast nonce <ADDRESS> --rpc-url $RPC_URL"
print_info ""

# Add --resume flag if specified
if [ -n "$RESUME_FLAG" ]; then
    FORGE_ARGS="$FORGE_ARGS $RESUME_FLAG"
    print_info "Using --resume flag to continue from previous deployment"
fi

print_info "Deploying with sequential transaction delays to prevent nonce gaps..."

forge script script/Deploy.s.sol:Deploy $FORGE_ARGS

if [ $? -eq 0 ]; then
    print_success "Deployment completed successfully!"
    print_info "Check the broadcast directory for deployment artifacts and transaction details"
    print_info "Deployment artifacts: broadcast/Deploy.s.sol/$NETWORK/"
else
    print_error "Deployment failed"
    exit 1
fi

# Clean up environment variable
unset PRIVATE_KEY

print_success "Script completed!"
