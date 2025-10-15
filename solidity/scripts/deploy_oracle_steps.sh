#!/bin/bash

# Deploy Oracle in Steps - Avoids nonce issues with delegated accounts
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

SUBSCRIPTION_ID=${1:-6}
echo -e "${YELLOW}Using Chainlink Subscription ID: $SUBSCRIPTION_ID${NC}"

# Step 1: Deploy the oracle contract only
echo -e "\n${YELLOW}Step 1: Deploying Oracle Contract...${NC}"
OUTPUT=$(forge script script/DeployOracleSimple.s.sol --rpc-url https://mainnet.base.org --broadcast 2>&1)

# Extract the oracle address from the output
ORACLE_ADDRESS=$(echo "$OUTPUT" | grep "Oracle deployed at:" | sed 's/.*Oracle deployed at: //')

if [ -z "$ORACLE_ADDRESS" ]; then
    echo -e "${RED}Failed to extract oracle address from deployment output${NC}"
    echo "$OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ Oracle deployed at: $ORACLE_ADDRESS${NC}"

# Wait a bit for the transaction to be mined
echo -e "\n${YELLOW}Waiting for transaction to be mined...${NC}"
sleep 5

# Step 2: Add oracle as consumer to Chainlink subscription
echo -e "\n${YELLOW}Step 2: Adding Oracle as Consumer to Chainlink Subscription...${NC}"
cast send 0xf9B8fc078197181C841c296C876945aaa425B278 \
    "addConsumer(uint64,address)" \
    $SUBSCRIPTION_ID $ORACLE_ADDRESS \
    --rpc-url https://mainnet.base.org \
    --private-key $PRIVATE_KEY

echo -e "${GREEN}✓ Oracle added as consumer${NC}"

# Wait for transaction
sleep 5

# Step 3: Update Pickem contract to use new oracle
echo -e "\n${YELLOW}Step 3: Updating Pickem Contract...${NC}"
cast send 0x602b49e4c54724ae53a491ae60cd8ecf5690e5c7 \
    "setGameScoreOracle(address)" \
    $ORACLE_ADDRESS \
    --rpc-url https://mainnet.base.org \
    --private-key $PRIVATE_KEY

echo -e "${GREEN}✓ Pickem contract updated${NC}"

# Step 4: Verify the update
echo -e "\n${YELLOW}Step 4: Verifying Configuration...${NC}"
CURRENT_ORACLE=$(cast call 0x602b49e4c54724ae53a491ae60cd8ecf5690e5c7 "gameScoreOracle()" --rpc-url https://mainnet.base.org)
CURRENT_ORACLE=$(echo $CURRENT_ORACLE | sed 's/^0x000000000000000000000000/0x/')

if [ "$CURRENT_ORACLE" = "$ORACLE_ADDRESS" ]; then
    echo -e "${GREEN}✓ Pickem contract successfully updated to use new oracle${NC}"
else
    echo -e "${RED}✗ Pickem contract not updated correctly${NC}"
    echo "Expected: $ORACLE_ADDRESS"
    echo "Got: $CURRENT_ORACLE"
    exit 1
fi

echo -e "\n${GREEN}=== Deployment Successful ===${NC}"
echo -e "Oracle Address: ${GREEN}$ORACLE_ADDRESS${NC}"
echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Verify the contract on BaseScan:"
echo "   make verify-oracle ADDRESS=$ORACLE_ADDRESS"
echo "2. Run the Contest 0 fix:"
echo "   make fix-contest-0"
