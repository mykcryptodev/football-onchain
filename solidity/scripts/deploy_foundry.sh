#!/bin/bash

# Football Boxes Foundry Deployment Script
# Usage: ./scripts/deploy_foundry.sh <PRIVATE_KEY> [NETWORK] [--skip-estimation]

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
    echo "Usage: $0 <PRIVATE_KEY> [NETWORK]"
    echo ""
    echo "Supported networks:"
    echo "  - base-sepolia (default)"
    echo "  - base"
    echo ""
    echo "Example:"
    echo "  $0 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef base-sepolia"
    exit 1
fi

PRIVATE_KEY=$1
NETWORK=${2:-"base-sepolia"}
SKIP_ESTIMATION=false

# Check for --skip-estimation flag
for arg in "$@"; do
    case $arg in
        --skip-estimation)
            SKIP_ESTIMATION=true
            shift
            ;;
    esac
done

# Validate private key format
if [[ ! $PRIVATE_KEY =~ ^0x[0-9a-fA-F]{64}$ ]]; then
    print_error "Invalid private key format. Must be 64 hex characters prefixed with 0x"
    exit 1
fi

# Set RPC URLs based on network
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

print_info "Starting deployment on $NETWORK..."
print_info "RPC URL: $RPC_URL"

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
forge script script/Deploy.s.sol:Deploy \
    --rpc-url $RPC_URL \
    --broadcast \
    --ffi \
    -vvvv

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
