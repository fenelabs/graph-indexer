# Fene Labs Validator Indexer - Deployment Guide

## 📋 Overview

This subgraph indexes the Fene Labs Validators contract at `0x0000000000000000000000000000000000001000`.

## 🚀 Quick Start - Local Development

### Prerequisites

- Docker & Docker Compose installed
- Node.js and npm installed
- Access to a Fene Labs RPC endpoint

### Step 1: Configure RPC Endpoint

Edit `docker-compose.yml` line 22 to point to your RPC endpoint:

```yaml
# For local node:
ethereum: "mainnet:http://host.docker.internal:8545"

# For remote RPC:
ethereum: "mainnet:https://rpc.fenelabs.com"

# For Linux users with local node:
ethereum: "mainnet:http://172.17.0.1:8545"
```

### Step 2: Start Graph Node Infrastructure

```bash
# Start all services (graph-node, postgres, ipfs)
docker-compose up -d

# Check logs to ensure everything is running
docker-compose logs -f graph-node

# You should see:
# ✓ Starting JSON-RPC admin server at: http://0.0.0.0:8020
# ✓ Starting GraphQL HTTP server at: http://0.0.0.0:8000
```

### Step 3: Generate Types & Build

```bash
# Generate TypeScript types from schema
npm run codegen

# Build the subgraph
npm run build
```

### Step 4: Create & Deploy Locally

```bash
# Create the subgraph in local graph-node
npm run create-local

# Deploy to local graph-node
npm run deploy-local
```

### Step 5: Access GraphQL Playground

Open your browser:
- **GraphQL Playground**: http://localhost:8000/subgraphs/name/fenelabs-indexer/graphql
- **GraphQL Endpoint**: http://localhost:8000/subgraphs/name/fenelabs-indexer

## 📊 Example Queries

### Get Protocol State

```graphql
{
  protocolState(id: "1") {
    admin
    isPaused
    totalStaking
    totalValidators
    activeValidators
    jailedValidators
    totalRewardsDistributed
    totalSlashed
  }
}
```

### Get All Validators

```graphql
{
  validators(first: 10, orderBy: stakingAmount, orderDirection: desc) {
    id
    rewardAddress
    status
    stakingAmount
    totalRewards
    slashedAmount
    isJailed
    totalStakers
    delegatorCount
    createdAtTimestamp
  }
}
```

### Get Stakes for a Specific Staker

```graphql
{
  stakes(where: { staker: "0xYOUR_ADDRESS" }) {
    id
    validator {
      id
      status
    }
    amount
    isActive
    totalStaked
    totalWithdrawn
    claimedRewards
  }
}
```

### Get Recent Reward Distributions

```graphql
{
  rewardDistributions(first: 10, orderBy: blockNumber, orderDirection: desc) {
    id
    validators
    rewards
    totalRewardsDistributed
    blockNumber
    timestamp
  }
}
```

### Get Validator Reward History

```graphql
{
  validatorRewards(
    where: { validator: "0xVALIDATOR_ADDRESS" }
    first: 100
    orderBy: blockNumber
    orderDirection: desc
  ) {
    amount
    blockNumber
    timestamp
    transactionHash
  }
}
```

### Get Slash Events

```graphql
{
  slashEvents(orderBy: blockNumber, orderDirection: desc) {
    id
    validator {
      id
      status
    }
    amount
    blockNumber
    timestamp
  }
}
```

### Get Unstake Events (with unlock tracking)

```graphql
{
  unstakeEvents(
    where: { staker: "0xYOUR_ADDRESS" }
    orderBy: blockNumber
    orderDirection: desc
  ) {
    staker
    validator {
      id
    }
    amount
    unlockHeight
    blockNumber
  }
}
```

## 🌐 Deploy to The Graph Studio (Production)

### Step 1: Create Subgraph on The Graph Studio

1. Go to https://thegraph.com/studio/
2. Connect your wallet
3. Click "Create a Subgraph"
4. Copy your deploy key

### Step 2: Authenticate

```bash
graph auth --studio <YOUR_DEPLOY_KEY>
```

### Step 3: Deploy

```bash
# Update package.json deploy script with your subgraph name
npm run deploy
```

## 🔧 Troubleshooting

### Issue: Docker can't connect to RPC

**Symptoms:**
```
ERROR Failed to connect to Ethereum node: connection refused
```

**Solution:**
1. Check if your RPC node is running
2. For local nodes on Linux, use `http://172.17.0.1:8545` instead of `host.docker.internal`
3. For remote RPC, ensure it's accessible from Docker container

### Issue: Subgraph deployment fails

**Symptoms:**
```
ERROR Failed to deploy: network not found
```

**Solution:**
Make sure the network name in `subgraph.yaml` matches the network name in `docker-compose.yml`:
- `subgraph.yaml`: `network: mainnet`
- `docker-compose.yml`: `ethereum: "mainnet:http://..."`

### Issue: No events being indexed

**Symptoms:**
Queries return empty arrays

**Solution:**
1. Check if the contract address is correct: `0x0000000000000000000000000000000000001000`
2. Verify `startBlock` in `subgraph.yaml` - set it to the block where the contract was deployed
3. Check graph-node logs: `docker-compose logs -f graph-node`

### Issue: RewardDistributed event not indexing properly

**Symptoms:**
Reward distributions are incomplete or missing

**This is handled!** The implementation uses deterministic array processing:
```typescript
let count = event.params.rewardCount.toI32()
for (let i = 0; i < count; i++) {
  // Safe, deterministic processing
}
```

## 📁 Project Structure

```
fene-indexer/
├── abis/
│   └── Validators.json          # Contract ABI
├── src/
│   └── validators.ts            # Event handlers
├── schema.graphql               # GraphQL schema (16 entities)
├── subgraph.yaml                # Subgraph manifest
├── docker-compose.yml           # Local graph-node setup
└── package.json                 # Scripts
```

## 🎯 Entity Overview

### Core Entities (Mutable)
- **Validator** - Validator state and metadata
- **Stake** - Individual staker positions
- **ProtocolState** - Global protocol state (singleton)

### Event Entities (Immutable)
- **RewardDistribution** - Batch reward distributions
- **ValidatorReward** - Individual validator rewards
- **DelegatorRewardClaim** - Delegator reward claims
- **SlashEvent** - Validator slashing events
- **UnstakeEvent** - Unstake requests
- **WithdrawEvent** - Withdrawal completions
- **ValidatorSetUpdate** - Active validator set changes
- **AdminChangeEvent** - Admin changes
- **PauseEvent** - Pause/unpause events

### Stats Entities (Immutable)
- **DailyValidatorStat** - Per-validator daily statistics
- **DailyProtocolStat** - Protocol-wide daily statistics

## 🔄 Development Workflow

### Making Changes

```bash
# 1. Edit schema.graphql or src/validators.ts
# 2. Regenerate types
npm run codegen

# 3. Rebuild
npm run build

# 4. Redeploy locally
npm run deploy-local
```

### Cleaning Up

```bash
# Stop and remove containers
docker-compose down

# Remove data (reset database)
rm -rf data/postgres data/ipfs

# Restart fresh
docker-compose up -d
```

## 📝 Notes

- **Contract Address**: `0x0000000000000000000000000000000000001000` (system contract)
- **Start Block**: Currently set to `0` - adjust in `subgraph.yaml` if needed
- **Network**: Configured as `mainnet` - ensure RPC endpoint matches
- **Deterministic Processing**: All array loops use explicit counts to ensure deterministic indexing

## 🆘 Support

For issues or questions:
1. Check graph-node logs: `docker-compose logs -f graph-node`
2. Review The Graph documentation: https://thegraph.com/docs/
3. Check contract events on block explorer

## ✅ Checklist Before Production Deploy

- [ ] RPC endpoint is stable and production-ready
- [ ] Start block is set correctly in `subgraph.yaml`
- [ ] Contract address is verified
- [ ] Tested locally with docker-compose
- [ ] Queries return expected data
- [ ] Deploy key is secured
- [ ] Monitoring is set up

---

**Built with The Graph Protocol**
