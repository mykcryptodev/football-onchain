# dependencies
update          :; forge update

# install latest stable solc version
solc            :; sudo add-apt-repository ppa:ethereum/ethereum && sudo apt-get update && sudo apt-get install solc

# build & test
build           :; forge build
build-optimised :; forge build --optimize
test-forge      :; forge test
test-gasreport 	:; forge test --gas-report
trace           :; forge test -vvvvv
clean           :; forge clean
snapshot        :; forge snapshot

# chmod scripts
scripts         :; chmod +x ./scripts/*

# deployment (auto-loads .env if it exists)
# Usage: make deploy-foundry PRIVATE_KEY=0x... NETWORK=base RPC_URL=https://mainnet.base.org
deploy-foundry  :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) $(NETWORK) $(RPC_URL)
deploy-base-sepolia :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base-sepolia $(RPC_URL)
deploy-base     :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base $(RPC_URL)
deploy-foundry-env :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) $(NETWORK) $(RPC_URL)
deploy-base-sepolia-env :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base-sepolia $(RPC_URL)
deploy-base-env :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base $(RPC_URL)

# deployment without gas estimation (auto-loads .env if it exists)
deploy-foundry-fast  :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) $(NETWORK) $(RPC_URL) --skip-estimation
deploy-base-sepolia-fast :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base-sepolia $(RPC_URL) --skip-estimation
deploy-base-fast     :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base $(RPC_URL) --skip-estimation

# gas estimation only
estimate-gas    :; ESTIMATE_GAS_ONLY=true forge script script/Deploy.s.sol:Deploy --rpc-url $(RPC_URL) --ffi -v

# verification
verify-contracts-sepolia :; ./scripts/verify_contracts.sh base-sepolia
verify-contracts-base    :; ./scripts/verify_contracts.sh base

# deployment with verification (slower)
deploy-base-sepolia-verify :; [ -f .env ] && set -a && source .env && set +a; SKIP_VERIFICATION=false ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base-sepolia $(RPC_URL)
deploy-base-verify         :; [ -f .env ] && set -a && source .env && set +a; SKIP_VERIFICATION=false ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base $(RPC_URL)

# fork mainnet with Hardhat
mainnet-fork    :; npx hardhat node --fork ${ETH_MAINNET_RPC_URL}
