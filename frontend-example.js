// ============================================================================
// FRONTEND INTEGRATION EXAMPLE
// Contoh cara menggunakan queries di frontend dengan fetch/axios
// ============================================================================

// Configuration
const SUBGRAPH_URL = 'http://localhost:8000/subgraphs/name/your-subgraph-name';

// ============================================================================
// 1. Basic fetch function
// ============================================================================
async function querySubgraph(query, variables = {}) {
  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      throw new Error(data.errors[0].message);
    }
    
    return data.data;
  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  }
}


// ============================================================================
// 2. Example Functions - Ready to use in your frontend
// ============================================================================

/**
 * Get Dashboard Overview Data
 */
async function getDashboardOverview() {
  const query = `
    query {
      protocolState(id: "1") {
        totalValidators
        activeValidators
        jailedValidators
        totalStaking
        totalRewardsDistributed
        totalSlashed
        lastUpdatedBlock
        lastUpdatedTimestamp
      }
    }
  `;
  
  return await querySubgraph(query);
}


/**
 * Get Validator List with pagination
 */
async function getValidatorList(page = 1, perPage = 20, orderBy = 'uptime') {
  const skip = (page - 1) * perPage;
  
  const query = `
    query($first: Int!, $skip: Int!, $orderBy: Validator_orderBy!) {
      validators(
        first: $first
        skip: $skip
        orderBy: $orderBy
        orderDirection: desc
      ) {
        id
        moniker
        status
        stakingAmount
        signedBlocks
        missedBlocks
        uptime
        totalStakers
        commissionRate
        isJailed
      }
    }
  `;
  
  return await querySubgraph(query, {
    first: perPage,
    skip: skip,
    orderBy: orderBy
  });
}


/**
 * Get Single Validator Detail
 */
async function getValidatorDetail(validatorAddress) {
  const query = `
    query($validatorId: ID!) {
      validator(id: $validatorId) {
        id
        moniker
        website
        email
        details
        rewardAddress
        status
        isJailed
        stakingAmount
        totalStakers
        delegatorCount
        signedBlocks
        missedBlocks
        lastSignedBlock
        uptime
        totalRewards
        commissionRate
        delegatorRewardPool
        slashedAmount
        createdAtTimestamp
        updatedAtTimestamp
        
        stakes(first: 10, orderBy: amount, orderDirection: desc) {
          staker
          amount
          isActive
          claimedRewards
        }
        
        rewards(first: 20, orderBy: blockNumber, orderDirection: desc) {
          amount
          blockNumber
          timestamp
        }
      }
    }
  `;
  
  return await querySubgraph(query, { validatorId: validatorAddress });
}


/**
 * Get Recent Blocks with Proposer Info
 */
async function getRecentBlocks(limit = 50) {
  const query = `
    query($first: Int!) {
      validatorBlockPerformances(
        first: $first
        orderBy: blockNumber
        orderDirection: desc
      ) {
        blockNumber
        timestamp
        proposer
        signed
        validator {
          id
          moniker
          uptime
        }
      }
    }
  `;
  
  return await querySubgraph(query, { first: limit });
}


/**
 * Get Top Validators by different metrics
 */
async function getTopValidators() {
  const query = `
    query {
      topByUptime: validators(
        first: 10
        where: { status: Active }
        orderBy: uptime
        orderDirection: desc
      ) {
        id
        moniker
        uptime
        signedBlocks
        stakingAmount
      }
      
      topByStaking: validators(
        first: 10
        where: { status: Active }
        orderBy: stakingAmount
        orderDirection: desc
      ) {
        id
        moniker
        stakingAmount
        totalStakers
        uptime
      }
    }
  `;
  
  return await querySubgraph(query);
}


/**
 * Get User's Stakes (for logged-in users)
 */
async function getUserStakes(userAddress) {
  const query = `
    query($userAddress: Bytes!) {
      stakes(
        where: { staker: $userAddress }
        orderBy: amount
        orderDirection: desc
      ) {
        id
        validator {
          id
          moniker
          status
          uptime
          commissionRate
        }
        amount
        isActive
        totalStaked
        claimedRewards
        createdAtTimestamp
      }
    }
  `;
  
  return await querySubgraph(query, { userAddress });
}


/**
 * Get Real-time Stats (for live updates)
 */
async function getRealTimeStats() {
  const query = `
    query {
      protocolState(id: "1") {
        totalValidators
        activeValidators
        totalStaking
        lastUpdatedBlock
        lastUpdatedTimestamp
      }
      
      recentBlocks: validatorBlockPerformances(
        first: 10
        orderBy: blockNumber
        orderDirection: desc
      ) {
        blockNumber
        timestamp
        proposer
        validator {
          moniker
        }
      }
    }
  `;
  
  return await querySubgraph(query);
}


/**
 * Search Validators by name or address
 */
async function searchValidators(searchText) {
  const query = `
    query($searchText: String!) {
      validatorsByMoniker: validators(
        first: 20
        where: { moniker_contains_nocase: $searchText }
      ) {
        id
        moniker
        status
        stakingAmount
        uptime
        signedBlocks
      }
    }
  `;
  
  return await querySubgraph(query, { searchText });
}


/**
 * Get Validator Performance for a specific validator
 */
async function getValidatorPerformance(validatorAddress, blockLimit = 100) {
  const query = `
    query($validatorId: String!, $first: Int!) {
      validatorBlockPerformances(
        first: $first
        where: { validator: $validatorId }
        orderBy: blockNumber
        orderDirection: desc
      ) {
        blockNumber
        timestamp
        signed
        proposer
      }
    }
  `;
  
  return await querySubgraph(query, {
    validatorId: validatorAddress,
    first: blockLimit
  });
}


// ============================================================================
// 3. React Hook Example (untuk React apps)
// ============================================================================

/**
 * Custom React Hook untuk fetch validator list
 * Usage: const { validators, loading, error } = useValidators();
 */
function useValidators(page = 1, perPage = 20) {
  const [validators, setValidators] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const data = await getValidatorList(page, perPage);
        setValidators(data.validators);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [page, perPage]);

  return { validators, loading, error };
}


/**
 * Custom Hook untuk real-time updates (polling every 5 seconds)
 */
function useRealTimeStats(interval = 5000) {
  const [stats, setStats] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getRealTimeStats();
        setStats(data);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }

    // Initial fetch
    fetchStats();

    // Set up polling
    const intervalId = setInterval(fetchStats, interval);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [interval]);

  return { stats, loading };
}


// ============================================================================
// 4. Vue.js Composable Example (untuk Vue 3 apps)
// ============================================================================

/**
 * Vue Composable untuk validator list
 * Usage: const { validators, loading, error } = useValidators();
 */
function useValidatorsVue(page = 1, perPage = 20) {
  const validators = Vue.ref([]);
  const loading = Vue.ref(true);
  const error = Vue.ref(null);

  Vue.onMounted(async () => {
    try {
      loading.value = true;
      const data = await getValidatorList(page, perPage);
      validators.value = data.validators;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  });

  return { validators, loading, error };
}


// ============================================================================
// 5. Utility Functions
// ============================================================================

/**
 * Format uptime percentage
 */
function formatUptime(uptime) {
  return `${parseFloat(uptime).toFixed(2)}%`;
}

/**
 * Format staking amount (assuming 18 decimals)
 */
function formatStakingAmount(amount, decimals = 18) {
  const value = BigInt(amount) / BigInt(10 ** decimals);
  return value.toLocaleString();
}

/**
 * Format timestamp to readable date
 */
function formatTimestamp(timestamp) {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleString();
}

/**
 * Calculate time ago
 */
function timeAgo(timestamp) {
  const seconds = Math.floor(Date.now() / 1000 - parseInt(timestamp));
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Get status badge color
 */
function getStatusColor(status) {
  const colors = {
    Active: 'green',
    Created: 'blue',
    Jailed: 'red',
    Slashed: 'red',
    Inactive: 'gray'
  };
  return colors[status] || 'gray';
}


// ============================================================================
// 6. Example Usage in Component
// ============================================================================

/**
 * Example: Validator Dashboard Component
 */
async function renderValidatorDashboard() {
  // Get overview data
  const overview = await getDashboardOverview();
  console.log('Protocol State:', overview.protocolState);

  // Get top validators
  const topValidators = await getTopValidators();
  console.log('Top by Uptime:', topValidators.topByUptime);
  console.log('Top by Staking:', topValidators.topByStaking);

  // Get recent blocks
  const recentBlocks = await getRecentBlocks(20);
  console.log('Recent Blocks:', recentBlocks.validatorBlockPerformances);

  // Example: Render to DOM
  const validatorListHtml = topValidators.topByUptime
    .map(v => `
      <div class="validator-card">
        <h3>${v.moniker || 'Unknown'}</h3>
        <p>Address: ${v.id}</p>
        <p>Uptime: ${formatUptime(v.uptime)}</p>
        <p>Signed Blocks: ${v.signedBlocks}</p>
        <p>Staking: ${formatStakingAmount(v.stakingAmount)}</p>
      </div>
    `)
    .join('');

  document.getElementById('validator-list').innerHTML = validatorListHtml;
}


// ============================================================================
// 7. WebSocket / Subscription Example (if supported)
// ============================================================================

/**
 * Set up real-time subscription using WebSocket
 * Note: Requires graph-node with WebSocket support
 */
function subscribeToNewBlocks(callback) {
  const ws = new WebSocket('ws://localhost:8001/subgraphs/name/your-subgraph-name');
  
  ws.onopen = () => {
    const subscriptionQuery = {
      id: '1',
      type: 'start',
      payload: {
        query: `
          subscription {
            validatorBlockPerformances(
              orderBy: blockNumber
              orderDirection: desc
              first: 1
            ) {
              blockNumber
              timestamp
              proposer
              validator {
                moniker
              }
            }
          }
        `
      }
    };
    
    ws.send(JSON.stringify(subscriptionQuery));
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'data') {
      callback(data.payload.data);
    }
  };
  
  return () => ws.close();
}


// ============================================================================
// Export untuk digunakan di module lain
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    querySubgraph,
    getDashboardOverview,
    getValidatorList,
    getValidatorDetail,
    getRecentBlocks,
    getTopValidators,
    getUserStakes,
    getRealTimeStats,
    searchValidators,
    getValidatorPerformance,
    formatUptime,
    formatStakingAmount,
    formatTimestamp,
    timeAgo,
    getStatusColor
  };
}
