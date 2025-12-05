import { BigInt, Bytes, Address } from "@graphprotocol/graph-ts"
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
  AdminChangeEvent,
  PauseEvent
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
      // getValidatorDescription returns 4 strings: moniker, website, identity, details
      validator.moniker = descriptionResult.value.value0
      validator.website = descriptionResult.value.value1
      validator.identity = descriptionResult.value.value2
      validator.details = descriptionResult.value.value3
      validator.save()
    }
  }
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
    validator.identity = null
    validator.details = null

    validator.save()

    // Fetch metadata from contract
    fetchValidatorDescription(Address.fromBytes(validatorAddress))
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
  validator.save()

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
  validator.save()

  // Fetch updated metadata from contract
  fetchValidatorDescription(event.params.validator)
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
