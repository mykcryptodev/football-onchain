#!/bin/bash

# Deploy new oracle and update Contests/Pickem contracts
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Check required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env${NC}"
    exit 1
fi

# Get network from argument or use default
NETWORK=${1:-base}
RPC_URL=""

case $NETWORK in
    base|mainnet)
        RPC_URL="https://mainnet.base.org"
        NETWORK_NAME="Base Mainnet"
        ;;
    base-sepolia|sepolia|testnet)
        RPC_URL="https://sepolia.base.org"
        NETWORK_NAME="Base Sepolia"
        ;;
    *)
        echo -e "${RED}Error: Unknown network '$NETWORK'${NC}"
        echo "Usage: $0 [base|base-sepolia] [CONTESTS_ADDRESS] [PICKEM_ADDRESS]"
        exit 1
        ;;
esac

# Get contract addresses from arguments or environment
CONTESTS_ADDRESS=${2:-${CONTESTS_ADDRESS:-""}}
PICKEM_ADDRESS=${3:-${PICKEM_ADDRESS:-""}}

if [ -z "$CONTESTS_ADDRESS" ] && [ -z "$PICKEM_ADDRESS" ]; then
    echo -e "${RED}Error: Must provide at least one contract address${NC}"
    echo "Usage: $0 [base|base-sepolia] [CONTESTS_ADDRESS] [PICKEM_ADDRESS]"
    echo "Or set CONTESTS_ADDRESS and/or PICKEM_ADDRESS in .env"
    exit 1
fi

echo -e "${BLUE}=== Deploy and Update Oracle ===${NC}"
echo -e "Network: ${YELLOW}$NETWORK_NAME${NC}"
if [ -n "$CONTESTS_ADDRESS" ]; then
    echo -e "Contests Address: ${GREEN}$CONTESTS_ADDRESS${NC}"
fi
if [ -n "$PICKEM_ADDRESS" ]; then
    echo -e "Pickem Address: ${GREEN}$PICKEM_ADDRESS${NC}"
fi
echo ""

# Build the forge command with environment variables
ENV_VARS="CONTESTS_ADDRESS=$CONTESTS_ADDRESS PICKEM_ADDRESS=$PICKEM_ADDRESS"

# Run the deployment script
echo -e "${YELLOW}Running deployment script...${NC}"
cd "$(dirname "$0")/.."
$ENV_VARS forge script script/DeployAndUpdateOracle.s.sol:DeployAndUpdateOracle \
    --rpc-url "$RPC_URL" \
    --broadcast \
    -vvv

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}=== Deployment Successful ===${NC}"
    echo -e "\n${YELLOW}Next Steps:${NC}"
    echo "1. Verify the contract on BaseScan:"
    echo "   make verify-oracle ADDRESS=<ORACLE_ADDRESS>"
    echo ""
    echo "2. Verify the update:"
    if [ -n "$CONTESTS_ADDRESS" ]; then
        echo "   cast call $CONTESTS_ADDRESS 'gameScoreOracle()' --rpc-url $RPC_URL"
    fi
    if [ -n "$PICKEM_ADDRESS" ]; then
        echo "   cast call $PICKEM_ADDRESS 'gameScoreOracle()' --rpc-url $RPC_URL"
    fi
else
    echo -e "\n${RED}=== Deployment Failed ===${NC}"
    exit 1
fi

