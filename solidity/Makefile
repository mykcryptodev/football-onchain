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

# deployment
deploy-foundry  :; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) $(NETWORK)
deploy-base-sepolia :; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base-sepolia
deploy-base     :; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base
deploy-foundry-env :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) $(NETWORK)
deploy-base-sepolia-env :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base-sepolia
deploy-base-env :; [ -f .env ] && set -a && source .env && set +a; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base

# deployment without gas estimation
deploy-foundry-fast  :; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) $(NETWORK) --skip-estimation
deploy-base-sepolia-fast :; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base-sepolia --skip-estimation
deploy-base-fast     :; ./scripts/deploy_foundry.sh $(PRIVATE_KEY) base --skip-estimation

# gas estimation only
estimate-gas    :; ESTIMATE_GAS_ONLY=true forge script script/Deploy.s.sol:Deploy --rpc-url $(RPC_URL) --ffi -v

# fork mainnet with Hardhat
mainnet-fork    :; npx hardhat node --fork ${ETH_MAINNET_RPC_URL}
