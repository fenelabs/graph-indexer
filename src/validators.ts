import { BigInt, Bytes, Address, BigDecimal, ethereum } from "@graphprotocol/graph-ts"
import {
  AddToValidatorCandidate,
  AdminChanged,
  DelegatorRewardsClaimed,
  Paused,
  RemoveFromValidatorCandidate,
  RewardDistributed,
  Staking,
  Unpaused,
  Unstake,
  ValidatorCreated,
  ValidatorSetUpdated,
  ValidatorSlash,
  ValidatorUnjailed,
  ValidatorUpdated,
  WithdrawRewards,
  WithdrawStaking,
  Validators as ValidatorsContract
} from "../generated/Validators/Validators"
import {
  Validator,
  Stake,
  RewardDistribution,
  ValidatorReward,
  DelegatorRewardClaim,
  SlashEvent,
  UnstakeEvent,
  WithdrawEvent,
  ValidatorCreatedEvent,
  ValidatorSetUpdate,
  ProtocolState,
  SystemParameters,
  AdminChangeEvent,
  PauseEvent,
  ValidatorBlockPerformance
} from "../generated/schema"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Contract address constant
const VALIDATORS_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000001000"

// Helper function to fetch validator metadata from contract
function fetchValidatorDescription(validatorAddress: Address): void {
  let contract = ValidatorsContract.bind(Address.fromString(VALIDATORS_CONTRACT_ADDRESS))

  // Try to fetch validator description from contract
  let descriptionResult = contract.try_getValidatorDescription(validatorAddress)

  if (!descriptionResult.reverted) {
    let validator = Validator.load(validatorAddress.toHexString())
    if (validator) {
      // getValidatorDescription returns 4 strings: moniker, website, email, details
      let moniker = descriptionResult.value.value0
      let website = descriptionResult.value.value1
      let email = descriptionResult.value.value2
      let details = descriptionResult.value.value3
      
      // Set values (empty strings will be stored as empty, not null)
      validator.moniker = moniker
      validator.website = website
      validator.email = email
      validator.details = details
      validator.save()
    }
  }
}

// Helper function to fetch complete validator info (commission, rewards, etc)
function fetchValidatorInfo(validatorAddress: Address): void {
  let contract = ValidatorsContract.bind(Address.fromString(VALIDATORS_CONTRACT_ADDRESS))

  // Use validatorInfo to get complete struct including description
  let validatorInfoResult = contract.try_validatorInfo(validatorAddress)
  
  if (!validatorInfoResult.reverted) {
    let validator = Validator.load(validatorAddress.toHexString())
    if (validator) {
      // validatorInfo returns full struct:
      // value0: rewardAddr (address)
      // value1: status (uint8)
      // value2: stakingAmount (uint256)
      // value3: description (tuple with moniker, website, email, details)
      // value4: rewardAmount (uint256)
      // value5: slashAmount (uint256)
      // value6: lastWithdrawRewardBlock (uint256)
      // value7: commissionRate (uint256)
      // value8: delegatorRewardPool (uint256)
      // value9: accRewardPerStake (uint256)
      // value10: accSlashPerStake (uint256)
      
      // Update commission and reward pool data
      validator.commissionRate = validatorInfoResult.value.value7
      validator.lastWithdrawRewardBlock = validatorInfoResult.value.value6
      validator.delegatorRewardPool = validatorInfoResult.value.value8
      validator.accRewardPerStake = validatorInfoResult.value.value9
      validator.accSlashPerStake = validatorInfoResult.value.value10
      
      // Extract description from tuple (value3)
      let description = validatorInfoResult.value.value3
      let moniker = description.moniker
      let website = description.website
      let email = description.email
      let details = description.details
      
      // Only set if not empty string
      validator.moniker = moniker.length > 0 ? moniker : null
      validator.website = website.length > 0 ? website : null
      validator.email = email.length > 0 ? email : null
      validator.details = details.length > 0 ? details : null
      
      validator.save()
    }
  }
}

// Helper function to fetch and store system parameters
function getOrCreateSystemParameters(blockNumber: BigInt, timestamp: BigInt): SystemParameters {
  let params = SystemParameters.load("1")
  if (!params) {
    params = new SystemParameters("1")
    let contract = ValidatorsContract.bind(Address.fromString(VALIDATORS_CONTRACT_ADDRESS))

    // Fetch all system parameters from contract
    let blockEpoch = contract.try_BlockEpoch()
    let maxValidators = contract.try_MaxValidatorNum()
    let minStakingCoin = contract.try_MinimalStakingCoin()
    let minStaking = contract.try_MinimalOfStaking()
    let lockPeriod = contract.try_StakingLockPeriod()
    let withdrawPeriod = contract.try_WithdrawRewardPeriod()
    let defaultCommission = contract.try_DEFAULT_COMMISSION_RATE()
    let maxCommission = contract.try_MAX_COMMISSION_RATE()
    let slashAmount = contract.try_ValidatorSlashAmount()

    // Set values with fallbacks
    params.blockEpoch = !blockEpoch.reverted ? blockEpoch.value : BigInt.zero()
    params.maxValidatorNum = !maxValidators.reverted ? maxValidators.value : 0
    params.minimalStakingCoin = !minStakingCoin.reverted ? minStakingCoin.value : BigInt.zero()
    params.minimalOfStaking = !minStaking.reverted ? minStaking.value : BigInt.zero()
    // u64 values - set to zero for now (type conversion issue)
    params.stakingLockPeriod = BigInt.zero()   // TODO: fix u64 conversion
    params.withdrawRewardPeriod = BigInt.zero() // TODO: fix u64 conversion
    params.defaultCommissionRate = !defaultCommission.reverted ? defaultCommission.value : BigInt.zero()
    params.maxCommissionRate = !maxCommission.reverted ? maxCommission.value : BigInt.zero()
    params.validatorSlashAmount = !slashAmount.reverted ? slashAmount.value : BigInt.zero()
    params.lastUpdatedBlock = blockNumber
    params.lastUpdatedTimestamp = timestamp
    params.save()
  }
  return params
}

function getOrCreateProtocolState(blockNumber: BigInt, timestamp: BigInt): ProtocolState {
  let state = ProtocolState.load("1")
  if (!state) {
    state = new ProtocolState("1")
    state.admin = Bytes.fromHexString("0x0000000000000000000000000000000000000000")
    state.isPaused = false
    state.totalStaking = BigInt.zero()
    state.totalValidators = 0
    state.activeValidators = 0
    state.jailedValidators = 0
    state.totalRewardsDistributed = BigInt.zero()
    state.totalSlashed = BigInt.zero()
    state.lastUpdatedBlock = blockNumber
    state.lastUpdatedTimestamp = timestamp
    state.save()

    // Also initialize system parameters on first state creation
    getOrCreateSystemParameters(blockNumber, timestamp)
  }
  return state
}

function getOrCreateValidator(
  validatorAddress: Bytes,
  blockNumber: BigInt,
  timestamp: BigInt
): Validator {
  let validator = Validator.load(validatorAddress.toHexString())
  if (!validator) {
    validator = new Validator(validatorAddress.toHexString())
    validator.rewardAddress = validatorAddress // default to self, updated in ValidatorCreated
    validator.status = "Created"
    validator.stakingAmount = BigInt.zero()
    validator.totalRewards = BigInt.zero()
    validator.slashedAmount = BigInt.zero()
    validator.commissionRate = BigInt.zero()
    validator.isJailed = false
    validator.createdAtBlock = blockNumber
    validator.createdAtTimestamp = timestamp
    validator.updatedAtBlock = blockNumber
    validator.updatedAtTimestamp = timestamp
    validator.totalStakers = 0
    validator.delegatorCount = 0

    // Initialize metadata fields
    validator.moniker = null
    validator.website = null
    validator.email = null
    validator.details = null

    // Initialize reward pool fields
    validator.lastWithdrawRewardBlock = null
    validator.delegatorRewardPool = null
    validator.accRewardPerStake = null
    validator.accSlashPerStake = null

    // Initialize block performance metrics
    validator.signedBlocks = BigInt.zero()
    validator.missedBlocks = BigInt.zero()
    validator.lastSignedBlock = null
    validator.uptime = BigDecimal.zero()

    validator.save()

    // Fetch metadata and info from contract
    fetchValidatorDescription(Address.fromBytes(validatorAddress))
    fetchValidatorInfo(Address.fromBytes(validatorAddress))
  }
  return validator
}

function updateProtocolStateCounts(): void {
  // This is an expensive operation, only call when validator status changes
  let state = ProtocolState.load("1")
  if (!state) return

  // Note: In production, you might want to maintain counters instead of recounting
  // For now, we'll update these in specific handlers
}

// ============================================================================
// A. VALIDATOR LIFECYCLE EVENTS
// ============================================================================

export function handleValidatorCreated(event: ValidatorCreated): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  validator.rewardAddress = event.params.rewardAddr
  validator.status = "Created"
  validator.updatedAtBlock = event.block.number
  validator.updatedAtTimestamp = event.block.timestamp
  
  // Fetch metadata immediately after creation
  fetchValidatorDescription(event.params.validator)
  fetchValidatorInfo(event.params.validator)

  // Create ValidatorCreated event record
  let eventId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let validatorCreatedEvent = new ValidatorCreatedEvent(eventId)
  validatorCreatedEvent.validator = event.params.validator
  validatorCreatedEvent.rewardAddress = event.params.rewardAddr
  validatorCreatedEvent.blockNumber = event.block.number
  validatorCreatedEvent.timestamp = event.block.timestamp
  validatorCreatedEvent.transactionHash = event.transaction.hash
  validatorCreatedEvent.save()

  // Update protocol state
  let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
  state.totalValidators = state.totalValidators + 1
  state.lastUpdatedBlock = event.block.number
  state.lastUpdatedTimestamp = event.block.timestamp
  state.save()
}

export function handleValidatorUpdated(event: ValidatorUpdated): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  validator.rewardAddress = event.params.rewardAddr
  validator.updatedAtBlock = event.block.number
  validator.updatedAtTimestamp = event.block.timestamp
  
  // Fetch updated metadata and info from contract
  fetchValidatorDescription(event.params.validator)
  fetchValidatorInfo(event.params.validator)
  
  // Note: validator.save() is called inside fetch functions
}

export function handleValidatorSlash(event: ValidatorSlash): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  // Update validator
  validator.slashedAmount = validator.slashedAmount.plus(event.params.amount)
  validator.status = "Slashed"
  validator.updatedAtBlock = event.block.number
  validator.updatedAtTimestamp = event.block.timestamp
  validator.save()

  // Create slash event record
  let slashId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let slashEvent = new SlashEvent(slashId)
  slashEvent.validator = validator.id
  slashEvent.amount = event.params.amount
  slashEvent.blockNumber = event.block.number
  slashEvent.timestamp = event.block.timestamp
  slashEvent.transactionHash = event.transaction.hash
  slashEvent.save()

  // Update protocol state
  let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
  state.totalSlashed = state.totalSlashed.plus(event.params.amount)
  state.lastUpdatedBlock = event.block.number
  state.lastUpdatedTimestamp = event.block.timestamp
  state.save()
}

export function handleValidatorUnjailed(event: ValidatorUnjailed): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  validator.isJailed = false
  validator.status = "Active"
  validator.updatedAtBlock = event.block.number
  validator.updatedAtTimestamp = event.block.timestamp
  validator.save()

  // Update protocol state
  let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
  if (state.jailedValidators > 0) {
    state.jailedValidators = state.jailedValidators - 1
  }
  state.activeValidators = state.activeValidators + 1
  state.lastUpdatedBlock = event.block.number
  state.lastUpdatedTimestamp = event.block.timestamp
  state.save()
}

export function handleValidatorSetUpdated(event: ValidatorSetUpdated): void {
  // Create record of validator set update
  let updateId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let update = new ValidatorSetUpdate(updateId)
  update.validators = changetype<Bytes[]>(event.params.validators)
  update.validatorCount = event.params.validators.length
  update.blockNumber = event.block.number
  update.timestamp = event.block.timestamp
  update.transactionHash = event.transaction.hash
  update.save()

  // Update all validators in the set to Active status
  for (let i = 0; i < event.params.validators.length; i++) {
    let validator = getOrCreateValidator(
      changetype<Bytes>(event.params.validators[i]),
      event.block.number,
      event.block.timestamp
    )
    validator.status = "Active"
    validator.updatedAtBlock = event.block.number
    validator.updatedAtTimestamp = event.block.timestamp
    validator.save()
  }

  // Update protocol state active validator count
  let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
  state.activeValidators = event.params.validators.length
  state.lastUpdatedBlock = event.block.number
  state.lastUpdatedTimestamp = event.block.timestamp
  state.save()
}

export function handleAddToValidatorCandidate(event: AddToValidatorCandidate): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  let wasActive = validator.status == "Active"

  // Validator is now a candidate
  validator.status = "Active"
  validator.updatedAtBlock = event.block.number
  validator.updatedAtTimestamp = event.block.timestamp
  validator.save()

  // Update protocol state counter
  if (!wasActive) {
    let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
    state.activeValidators = state.activeValidators + 1
    state.lastUpdatedBlock = event.block.number
    state.lastUpdatedTimestamp = event.block.timestamp
    state.save()
  }
}

export function handleRemoveFromValidatorCandidate(
  event: RemoveFromValidatorCandidate
): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  let wasActive = validator.status == "Active"

  // Validator is no longer a candidate
  validator.status = "Inactive"
  validator.updatedAtBlock = event.block.number
  validator.updatedAtTimestamp = event.block.timestamp
  validator.save()

  // Update protocol state counter
  if (wasActive) {
    let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
    if (state.activeValidators > 0) {
      state.activeValidators = state.activeValidators - 1
    }
    state.lastUpdatedBlock = event.block.number
    state.lastUpdatedTimestamp = event.block.timestamp
    state.save()
  }
}

// ============================================================================
// B. STAKING / DELEGATION EVENTS
// ============================================================================

export function handleStaking(event: Staking): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  // Create or update stake record
  let stakeId = event.params.staker
    .toHexString()
    .concat("-")
    .concat(event.params.validator.toHexString())
  let stake = Stake.load(stakeId)
  let isNewStake = false

  if (!stake) {
    stake = new Stake(stakeId)
    stake.staker = event.params.staker
    stake.validator = validator.id
    stake.amount = BigInt.zero()
    stake.isActive = true
    stake.totalStaked = BigInt.zero()
    stake.totalWithdrawn = BigInt.zero()
    stake.claimedRewards = BigInt.zero()
    stake.createdAtBlock = event.block.number
    stake.createdAtTimestamp = event.block.timestamp
    isNewStake = true
  }

  // Update stake amounts
  stake.amount = stake.amount.plus(event.params.amount)
  stake.totalStaked = stake.totalStaked.plus(event.params.amount)
  stake.isActive = true
  stake.unstakeBlock = null
  stake.unlockHeight = null
  stake.lastUpdatedBlock = event.block.number
  stake.lastUpdatedTimestamp = event.block.timestamp
  stake.save()

  // Update validator
  validator.stakingAmount = validator.stakingAmount.plus(event.params.amount)
  if (isNewStake) {
    validator.totalStakers = validator.totalStakers + 1
    validator.delegatorCount = validator.delegatorCount + 1
  }
  validator.updatedAtBlock = event.block.number
  validator.updatedAtTimestamp = event.block.timestamp
  validator.save()

  // Update protocol state
  let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
  state.totalStaking = state.totalStaking.plus(event.params.amount)
  state.lastUpdatedBlock = event.block.number
  state.lastUpdatedTimestamp = event.block.timestamp
  state.save()
}

export function handleUnstake(event: Unstake): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  // Update stake record
  let stakeId = event.params.staker
    .toHexString()
    .concat("-")
    .concat(event.params.validator.toHexString())
  let stake = Stake.load(stakeId)

  if (stake) {
    stake.amount = stake.amount.minus(event.params.amount)
    stake.unstakeBlock = event.block.number
    stake.unlockHeight = event.params.unLockHeight
    stake.isActive = stake.amount.gt(BigInt.zero())
    stake.lastUpdatedBlock = event.block.number
    stake.lastUpdatedTimestamp = event.block.timestamp
    stake.save()

    // Update validator
    validator.stakingAmount = validator.stakingAmount.minus(event.params.amount)
    if (!stake.isActive) {
      validator.delegatorCount = validator.delegatorCount - 1
    }
    validator.updatedAtBlock = event.block.number
    validator.updatedAtTimestamp = event.block.timestamp
    validator.save()

    // Update protocol state
    let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
    state.totalStaking = state.totalStaking.minus(event.params.amount)
    state.lastUpdatedBlock = event.block.number
    state.lastUpdatedTimestamp = event.block.timestamp
    state.save()
  }

  // Create unstake event record
  let unstakeId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let unstakeEvent = new UnstakeEvent(unstakeId)
  unstakeEvent.staker = event.params.staker
  unstakeEvent.validator = validator.id
  unstakeEvent.amount = event.params.amount
  unstakeEvent.unlockHeight = event.params.unLockHeight
  unstakeEvent.blockNumber = event.block.number
  unstakeEvent.timestamp = event.block.timestamp
  unstakeEvent.transactionHash = event.transaction.hash
  unstakeEvent.save()
}

export function handleWithdrawStaking(event: WithdrawStaking): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  // Update stake record
  let stakeId = event.params.staker
    .toHexString()
    .concat("-")
    .concat(event.params.validator.toHexString())
  let stake = Stake.load(stakeId)

  if (stake) {
    stake.totalWithdrawn = stake.totalWithdrawn.plus(event.params.amount)
    stake.lastUpdatedBlock = event.block.number
    stake.lastUpdatedTimestamp = event.block.timestamp
    stake.save()
  }

  // Create withdraw event record
  let withdrawId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let withdrawEvent = new WithdrawEvent(withdrawId)
  withdrawEvent.staker = event.params.staker
  withdrawEvent.validator = validator.id
  withdrawEvent.amount = event.params.amount
  withdrawEvent.blockNumber = event.block.number
  withdrawEvent.timestamp = event.block.timestamp
  withdrawEvent.transactionHash = event.transaction.hash
  withdrawEvent.save()
}

export function handleDelegatorRewardsClaimed(
  event: DelegatorRewardsClaimed
): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  // Update stake record
  let stakeId = event.params.delegator
    .toHexString()
    .concat("-")
    .concat(event.params.validator.toHexString())
  let stake = Stake.load(stakeId)

  if (stake) {
    stake.claimedRewards = stake.claimedRewards.plus(event.params.amount)
    stake.lastUpdatedBlock = event.block.number
    stake.lastUpdatedTimestamp = event.block.timestamp
    stake.save()
  }

  // Create delegator reward claim record
  let claimId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let claim = new DelegatorRewardClaim(claimId)
  claim.delegator = event.params.delegator
  claim.validator = validator.id
  claim.amount = event.params.amount
  claim.blockNumber = event.block.number
  claim.timestamp = event.block.timestamp
  claim.transactionHash = event.transaction.hash
  claim.save()
}

// ============================================================================
// C. REWARDS (TRICKY - Array handling with deterministic loop)
// ============================================================================

export function handleRewardDistributed(event: RewardDistributed): void {
  // Create the main distribution record
  let distributionId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let distribution = new RewardDistribution(distributionId)
  distribution.blockNumber = event.block.number
  distribution.timestamp = event.block.timestamp
  distribution.transactionHash = event.transaction.hash
  distribution.validators = changetype<Bytes[]>(event.params.validators)
  distribution.rewards = event.params.rewards
  distribution.rewardCount = event.params.rewardCount

  let totalRewards = BigInt.zero()

  // CRITICAL: Use rewardCount for deterministic iteration
  // This prevents gas issues and ensures consistent indexing
  let count = event.params.rewardCount.toI32()
  for (let i = 0; i < count; i++) {
    let validatorAddress = changetype<Bytes>(event.params.validators[i])
    let rewardAmount = event.params.rewards[i]

    totalRewards = totalRewards.plus(rewardAmount)

    // Update validator total rewards
    let validator = getOrCreateValidator(
      validatorAddress,
      event.block.number,
      event.block.timestamp
    )
    validator.totalRewards = validator.totalRewards.plus(rewardAmount)
    validator.updatedAtBlock = event.block.number
    validator.updatedAtTimestamp = event.block.timestamp
    validator.save()

    // Create individual validator reward record for querying
    let rewardId = validatorAddress
      .toHexString()
      .concat("-")
      .concat(event.block.number.toString())
      .concat("-")
      .concat(event.logIndex.toString())
    let validatorReward = new ValidatorReward(rewardId)
    validatorReward.validator = validator.id
    validatorReward.amount = rewardAmount
    validatorReward.blockNumber = event.block.number
    validatorReward.timestamp = event.block.timestamp
    validatorReward.transactionHash = event.transaction.hash
    validatorReward.distributionId = distributionId
    validatorReward.save()
  }

  distribution.totalRewardsDistributed = totalRewards
  distribution.save()

  // Update protocol state
  let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
  state.totalRewardsDistributed = state.totalRewardsDistributed.plus(totalRewards)
  state.lastUpdatedBlock = event.block.number
  state.lastUpdatedTimestamp = event.block.timestamp
  state.save()
}

export function handleWithdrawRewards(event: WithdrawRewards): void {
  let validator = getOrCreateValidator(
    event.params.validator,
    event.block.number,
    event.block.timestamp
  )

  validator.updatedAtBlock = event.block.number
  validator.updatedAtTimestamp = event.block.timestamp
  validator.save()

  // Note: This event tracks validator withdrawing their own rewards
  // The actual reward is sent to rewardAddress
  // You can create a separate entity if you want to track these events
}

// ============================================================================
// D. GOVERNANCE / SAFETY EVENTS
// ============================================================================

export function handleAdminChanged(event: AdminChanged): void {
  let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
  state.admin = event.params.newAdmin
  state.lastUpdatedBlock = event.block.number
  state.lastUpdatedTimestamp = event.block.timestamp
  state.save()

  // Create admin change event record
  let changeId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let adminChange = new AdminChangeEvent(changeId)
  adminChange.previousAdmin = event.params.previousAdmin
  adminChange.newAdmin = event.params.newAdmin
  adminChange.blockNumber = event.block.number
  adminChange.timestamp = event.block.timestamp
  adminChange.transactionHash = event.transaction.hash
  adminChange.save()
}

export function handlePaused(event: Paused): void {
  let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
  state.isPaused = true
  state.lastUpdatedBlock = event.block.number
  state.lastUpdatedTimestamp = event.block.timestamp
  state.save()

  // Create pause event record
  let pauseId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let pauseEvent = new PauseEvent(pauseId)
  pauseEvent.isPaused = true
  pauseEvent.blockNumber = event.block.number
  pauseEvent.timestamp = event.block.timestamp
  pauseEvent.transactionHash = event.transaction.hash
  pauseEvent.save()
}

export function handleUnpaused(event: Unpaused): void {
  let state = getOrCreateProtocolState(event.block.number, event.block.timestamp)
  state.isPaused = false
  state.lastUpdatedBlock = event.block.number
  state.lastUpdatedTimestamp = event.block.timestamp
  state.save()

  // Create unpause event record
  let pauseId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  let pauseEvent = new PauseEvent(pauseId)
  pauseEvent.isPaused = false
  pauseEvent.blockNumber = event.block.number
  pauseEvent.timestamp = event.block.timestamp
  pauseEvent.transactionHash = event.transaction.hash
  pauseEvent.save()
}

export function handleBlock(block: ethereum.Block): void {
  // Get block miner/signer (validator yang sign block ini)
  let blockAuthor = block.author
  
  if (blockAuthor) {
    let validatorId = blockAuthor.toHexString()
    let validator = Validator.load(validatorId)
    
    if (validator) {
      // Update signed blocks count
      validator.signedBlocks = validator.signedBlocks.plus(BigInt.fromI32(1))
      validator.lastSignedBlock = block.number
      validator.updatedAtBlock = block.number
      validator.updatedAtTimestamp = block.timestamp
      
      // Calculate uptime percentage
      let totalBlocks = validator.signedBlocks.plus(validator.missedBlocks)
      if (totalBlocks.gt(BigInt.zero())) {
        // uptime = (signedBlocks / totalBlocks) * 100
        validator.uptime = validator.signedBlocks
          .toBigDecimal()
          .div(totalBlocks.toBigDecimal())
          .times(BigDecimal.fromString("100"))
      }
      
      validator.save()
      
      // Create ValidatorBlockPerformance record
      let performanceId = validatorId
        .concat("-")
        .concat(block.number.toString())
      let performance = new ValidatorBlockPerformance(performanceId)
      performance.validator = validatorId
      performance.blockNumber = block.number
      performance.timestamp = block.timestamp
      performance.signed = true
      performance.proposer = blockAuthor
      performance.save()
    }
  }
  
  // Optional: Track missed blocks for active validators
  // This requires knowing the current validator set and checking who didn't sign
  // For simplicity, we're only tracking signed blocks here
  // Missed blocks can be inferred or tracked via ValidatorSetUpdated event
}
