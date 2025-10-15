#!/bin/bash

# Script to verify the deployed GameScoreOracle contract on BaseScan

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Oracle address is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Oracle address not provided${NC}"
    echo "Usage: ./scripts/verify_oracle.sh <ORACLE_ADDRESS>"
    exit 1
fi

ORACLE_ADDRESS=$1
CHAINLINK_ROUTER="0xf9B8fc078197181C841c296C876945aaa425B278"

echo -e "${YELLOW}Verifying GameScoreOracle at ${ORACLE_ADDRESS}...${NC}"

# Load environment variables if .env exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Check if ETHERSCAN_API_KEY is set
if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo -e "${RED}Error: ETHERSCAN_API_KEY not set in environment${NC}"
    echo "Please set ETHERSCAN_API_KEY in your .env file"
    exit 1
fi

# Create constructor arguments
CONSTRUCTOR_ARGS=$(cast abi-encode "constructor(address)" ${CHAINLINK_ROUTER})

echo "Constructor arguments: ${CONSTRUCTOR_ARGS}"

# Verify the contract
forge verify-contract \
    ${ORACLE_ADDRESS} \
    contracts/src/GameScoreOracle.sol:GameScoreOracle \
    --chain base \
    --constructor-args ${CONSTRUCTOR_ARGS} \
    --etherscan-api-key ${ETHERSCAN_API_KEY} \
    --watch

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Contract verification successful!${NC}"
    echo -e "View on BaseScan: https://basescan.org/address/${ORACLE_ADDRESS}#code"
else
    echo -e "${RED}❌ Contract verification failed${NC}"
    echo "Please check the error messages above and try again"
    exit 1
fi
