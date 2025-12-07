# 📊 Frontend Query Documentation - Validator Subgraph

Complete GraphQL queries untuk integrasi frontend dashboard realtime validator performance.

## 🚀 Quick Start

### 1. Configuration

Ganti URL subgraph sesuai deployment Anda:

```javascript
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/your-subgraph-name';
// atau
const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/your-username/your-subgraph';
```

### 2. Basic Usage

```javascript
// Import functions
import { getValidatorList, getValidatorDetail, getRealTimeStats } from './frontend-example.js';

// Get validator list
const validators = await getValidatorList(1, 20, 'uptime');

// Get specific validator
const validator = await getValidatorDetail('0x123...');

// Get real-time stats
const stats = await getRealTimeStats();
```

---

## 📋 Available Queries

### 1. **DashboardOverview** - Overview protocol state
```graphql
query DashboardOverview
```
**Returns:** Protocol statistics, system parameters

**Use Case:** Homepage dashboard, header stats

---

### 2. **ValidatorList** - Daftar validator dengan pagination
```graphql
query ValidatorList($first: Int, $skip: Int, $orderBy: Validator_orderBy)
```
**Variables:**
- `first`: Number of validators (default: 50)
- `skip`: Offset for pagination (default: 0)
- `orderBy`: Sort field (uptime, stakingAmount, signedBlocks, etc.)

**Use Case:** Validator list table, leaderboard

---

### 3. **ActiveValidators** - Hanya validator aktif
```graphql
query ActiveValidators
```
**Returns:** All active, non-jailed validators

**Use Case:** Dropdown selector untuk staking, filter options

---

### 4. **TopValidators** - Top performers
```graphql
query TopValidators
```
**Returns:** 
- Top 10 by uptime
- Top 10 by staking amount
- Top 10 by rewards

**Use Case:** Featured validators section, leaderboards

---

### 5. **ValidatorDetail** - Detail lengkap satu validator
```graphql
query ValidatorDetail($validatorId: ID!)
```
**Variables:**
- `validatorId`: Validator address

**Returns:** Complete validator info + recent stakes, rewards, slash events

**Use Case:** Validator detail page

---

### 6. **RecentBlockPerformance** - Block terbaru dengan proposer
```graphql
query RecentBlockPerformance($first: Int, $validatorId: String)
```
**Variables:**
- `first`: Number of blocks (default: 100)
- `validatorId`: Filter by specific validator (optional)

**Use Case:** Block explorer, recent activity feed

---

### 7. **LatestBlocksByProposer** - Siapa propose block terakhir
```graphql
query LatestBlocksByProposer($first: Int)
```
**Returns:** Recent blocks with proposer info

**Use Case:** Block proposer timeline, activity heatmap

---

### 8. **ValidatorPerformanceSummary** - Performance stats per validator
```graphql
query ValidatorPerformanceSummary($validatorId: ID!)
```
**Returns:** Detailed performance metrics + last 100 block history

**Use Case:** Validator analytics page, performance charts

---

### 9. **StakersByValidator** - List staker di validator tertentu
```graphql
query StakersByValidator($validatorId: ID!, $first: Int, $skip: Int)
```
**Use Case:** Validator's delegator list

---

### 10. **RecentRewards** - Reward distribution terbaru
```graphql
query RecentRewards($first: Int)
```
**Use Case:** Rewards timeline, distribution history

---

### 11. **ValidatorRewardsHistory** - Reward history per validator
```graphql
query ValidatorRewardsHistory($validatorId: ID!, $first: Int)
```
**Use Case:** Validator earnings chart

---

### 12. **RecentEvents** - Activity feed
```graphql
query RecentEvents($first: Int)
```
**Returns:** Recent staking, unstakes, slashes, claims

**Use Case:** Activity feed, transaction history

---

### 13. **ValidatorSetHistory** - Validator set changes
```graphql
query ValidatorSetHistory($first: Int)
```
**Use Case:** Validator set timeline, governance tracking

---

### 14. **SearchValidators** - Search by name or address
```graphql
query SearchValidators($searchText: String!)
```
**Use Case:** Search bar, autocomplete

---

### 15. **ValidatorUptimeAnalysis** - Uptime breakdown
```graphql
query ValidatorUptimeAnalysis
```
**Returns:** 
- Excellent (>99%)
- Good (95-99%)
- Needs improvement (<95%)

**Use Case:** Health dashboard, alerts

---

### 16. **RealTimeStats** - Live updates
```graphql
query RealTimeStats
```
**Returns:** Latest protocol state + recent blocks + rewards

**Use Case:** Live dashboard (poll every 5s)

---

### 17. **CompareValidators** - Compare 2-3 validators
```graphql
query CompareValidators($validator1: ID!, $validator2: ID!, $validator3: ID)
```
**Use Case:** Validator comparison tool

---

### 18. **UserStakes** - Stakes milik user tertentu
```graphql
query UserStakes($userAddress: Bytes!)
```
**Use Case:** User's portfolio, "My Stakes" page

---

### 19. **JailedValidators** - Monitor jailed validators
```graphql
query JailedValidators
```
**Use Case:** Alert system, validator health monitoring

---

### 20. **ValidatorsPaginated** - With full filter support
```graphql
query ValidatorsPaginated($first: Int, $skip: Int, $where: Validator_filter)
```
**Use Case:** Advanced filtering, custom queries

---

## 🎯 Common Use Cases

### Use Case 1: Homepage Dashboard
```javascript
// Fetch all data for homepage
async function loadHomepage() {
  const [overview, topValidators, recentBlocks] = await Promise.all([
    getDashboardOverview(),
    getTopValidators(),
    getRecentBlocks(10)
  ]);
  
  return { overview, topValidators, recentBlocks };
}
```

### Use Case 2: Validator Detail Page
```javascript
async function loadValidatorPage(validatorAddress) {
  const [detail, performance, stakes] = await Promise.all([
    getValidatorDetail(validatorAddress),
    getValidatorPerformance(validatorAddress, 100),
    getStakersByValidator(validatorAddress, 20)
  ]);
  
  return { detail, performance, stakes };
}
```

### Use Case 3: Live Block Feed
```javascript
// Poll every 3 seconds
setInterval(async () => {
  const blocks = await getRecentBlocks(10);
  updateBlockFeed(blocks);
}, 3000);
```

### Use Case 4: User Portfolio
```javascript
async function loadUserPortfolio(walletAddress) {
  const stakes = await getUserStakes(walletAddress);
  
  // Calculate total staked
  const totalStaked = stakes.stakes.reduce((sum, stake) => {
    return sum + BigInt(stake.amount);
  }, BigInt(0));
  
  return { stakes: stakes.stakes, totalStaked };
}
```

---

## 🔧 Helper Functions

### Format Uptime
```javascript
formatUptime('98.5432') // "98.54%"
```

### Format Staking Amount
```javascript
formatStakingAmount('1000000000000000000', 18) // "1,000"
```

### Format Timestamp
```javascript
formatTimestamp('1701936000') // "Dec 7, 2025, 12:00:00 PM"
```

### Time Ago
```javascript
timeAgo('1701936000') // "5m ago"
```

### Status Badge Color
```javascript
getStatusColor('Active') // "green"
getStatusColor('Jailed') // "red"
```

---

## 📊 Data Visualization Examples

### Uptime Chart Data
```javascript
async function getUptimeChartData(validatorId) {
  const performance = await getValidatorPerformance(validatorId, 100);
  
  const chartData = performance.validatorBlockPerformances.map(block => ({
    x: block.blockNumber,
    y: block.signed ? 1 : 0,
    timestamp: block.timestamp
  }));
  
  return chartData;
}
```

### Staking Distribution
```javascript
async function getStakingDistribution() {
  const validators = await getValidatorList(1, 100, 'stakingAmount');
  
  const pieData = validators.validators.map(v => ({
    name: v.moniker || v.id,
    value: parseInt(v.stakingAmount),
    percentage: 0 // calculate after
  }));
  
  const total = pieData.reduce((sum, item) => sum + item.value, 0);
  pieData.forEach(item => {
    item.percentage = (item.value / total * 100).toFixed(2);
  });
  
  return pieData;
}
```

---

## 🎨 Frontend Framework Examples

### React Component
```jsx
function ValidatorList() {
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function load() {
      const data = await getValidatorList(1, 20);
      setValidators(data.validators);
      setLoading(false);
    }
    load();
  }, []);
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {validators.map(v => (
        <div key={v.id}>
          <h3>{v.moniker}</h3>
          <p>Uptime: {formatUptime(v.uptime)}</p>
          <p>Signed: {v.signedBlocks}</p>
        </div>
      ))}
    </div>
  );
}
```

### Vue Component
```vue
<template>
  <div>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <div v-for="validator in validators" :key="validator.id">
        <h3>{{ validator.moniker }}</h3>
        <p>Uptime: {{ formatUptime(validator.uptime) }}</p>
        <p>Signed: {{ validator.signedBlocks }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      validators: [],
      loading: true
    }
  },
  async mounted() {
    const data = await getValidatorList(1, 20);
    this.validators = data.validators;
    this.loading = false;
  }
}
</script>
```

---

## 🔄 Real-time Updates

### Polling Strategy
```javascript
// Light polling for critical stats (every 3s)
const statsInterval = setInterval(async () => {
  const stats = await getRealTimeStats();
  updateDashboard(stats);
}, 3000);

// Heavy polling for less critical data (every 30s)
const validatorsInterval = setInterval(async () => {
  const validators = await getValidatorList(1, 20);
  updateValidatorTable(validators);
}, 30000);

// Cleanup on unmount
onUnmount(() => {
  clearInterval(statsInterval);
  clearInterval(validatorsInterval);
});
```

---

## 📱 Mobile Optimization

### Reduce data for mobile
```javascript
async function getValidatorListMobile(page = 1) {
  const query = `
    query {
      validators(first: 10, skip: ${(page-1)*10}, orderBy: uptime, orderDirection: desc) {
        id
        moniker
        uptime
        signedBlocks
        stakingAmount
      }
    }
  `;
  
  return await querySubgraph(query);
}
```

---

## ⚡ Performance Tips

1. **Use pagination** - Don't fetch all data at once
2. **Cache responses** - Use React Query, SWR, or localStorage
3. **Debounce search** - Wait 300ms before searching
4. **Lazy load** - Load detail pages on demand
5. **Optimize polling** - Different intervals for different data
6. **Use indexes** - Filter by indexed fields (status, isJailed)

---

## 🐛 Error Handling

```javascript
async function safeQuery(queryFunc, fallback = null) {
  try {
    return await queryFunc();
  } catch (error) {
    console.error('Query failed:', error);
    // Show toast notification
    showErrorToast('Failed to load data');
    return fallback;
  }
}

// Usage
const validators = await safeQuery(
  () => getValidatorList(1, 20),
  { validators: [] }
);
```

---

## 📦 Testing

```javascript
// Mock data for testing
const mockValidator = {
  id: '0x123...',
  moniker: 'Test Validator',
  uptime: '99.5',
  signedBlocks: '1000',
  missedBlocks: '5',
  stakingAmount: '1000000000000000000'
};

// Test query
test('getValidatorDetail returns correct data', async () => {
  const result = await getValidatorDetail('0x123...');
  expect(result.validator).toBeDefined();
  expect(result.validator.id).toBe('0x123...');
});
```

---

## 🔗 Resources

- **GraphQL Playground**: `http://localhost:8000/subgraphs/name/your-subgraph-name`
- **Subgraph Studio**: https://thegraph.com/studio
- **Graph Protocol Docs**: https://thegraph.com/docs

---

## 📞 Support

Jika ada pertanyaan atau butuh custom query, silakan buka issue atau hubungi tim development.

---

**Last Updated**: December 2025
