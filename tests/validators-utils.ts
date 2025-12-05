import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
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
  WithdrawStaking
} from "../generated/Validators/Validators"

export function createAddToValidatorCandidateEvent(
  validator: Address
): AddToValidatorCandidate {
  let addToValidatorCandidateEvent =
    changetype<AddToValidatorCandidate>(newMockEvent())

  addToValidatorCandidateEvent.parameters = new Array()

  addToValidatorCandidateEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )

  return addToValidatorCandidateEvent
}

export function createAdminChangedEvent(
  previousAdmin: Address,
  newAdmin: Address
): AdminChanged {
  let adminChangedEvent = changetype<AdminChanged>(newMockEvent())

  adminChangedEvent.parameters = new Array()

  adminChangedEvent.parameters.push(
    new ethereum.EventParam(
      "previousAdmin",
      ethereum.Value.fromAddress(previousAdmin)
    )
  )
  adminChangedEvent.parameters.push(
    new ethereum.EventParam("newAdmin", ethereum.Value.fromAddress(newAdmin))
  )

  return adminChangedEvent
}

export function createDelegatorRewardsClaimedEvent(
  delegator: Address,
  validator: Address,
  amount: BigInt
): DelegatorRewardsClaimed {
  let delegatorRewardsClaimedEvent =
    changetype<DelegatorRewardsClaimed>(newMockEvent())

  delegatorRewardsClaimedEvent.parameters = new Array()

  delegatorRewardsClaimedEvent.parameters.push(
    new ethereum.EventParam("delegator", ethereum.Value.fromAddress(delegator))
  )
  delegatorRewardsClaimedEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )
  delegatorRewardsClaimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return delegatorRewardsClaimedEvent
}

export function createPausedEvent(): Paused {
  let pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = new Array()

  return pausedEvent
}

export function createRemoveFromValidatorCandidateEvent(
  validator: Address
): RemoveFromValidatorCandidate {
  let removeFromValidatorCandidateEvent =
    changetype<RemoveFromValidatorCandidate>(newMockEvent())

  removeFromValidatorCandidateEvent.parameters = new Array()

  removeFromValidatorCandidateEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )

  return removeFromValidatorCandidateEvent
}

export function createRewardDistributedEvent(
  validators: Array<Address>,
  rewards: Array<BigInt>,
  rewardCount: BigInt
): RewardDistributed {
  let rewardDistributedEvent = changetype<RewardDistributed>(newMockEvent())

  rewardDistributedEvent.parameters = new Array()

  rewardDistributedEvent.parameters.push(
    new ethereum.EventParam(
      "validators",
      ethereum.Value.fromAddressArray(validators)
    )
  )
  rewardDistributedEvent.parameters.push(
    new ethereum.EventParam(
      "rewards",
      ethereum.Value.fromUnsignedBigIntArray(rewards)
    )
  )
  rewardDistributedEvent.parameters.push(
    new ethereum.EventParam(
      "rewardCount",
      ethereum.Value.fromUnsignedBigInt(rewardCount)
    )
  )

  return rewardDistributedEvent
}

export function createStakingEvent(
  staker: Address,
  validator: Address,
  amount: BigInt
): Staking {
  let stakingEvent = changetype<Staking>(newMockEvent())

  stakingEvent.parameters = new Array()

  stakingEvent.parameters.push(
    new ethereum.EventParam("staker", ethereum.Value.fromAddress(staker))
  )
  stakingEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )
  stakingEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return stakingEvent
}

export function createUnpausedEvent(): Unpaused {
  let unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = new Array()

  return unpausedEvent
}

export function createUnstakeEvent(
  staker: Address,
  validator: Address,
  amount: BigInt,
  unLockHeight: BigInt
): Unstake {
  let unstakeEvent = changetype<Unstake>(newMockEvent())

  unstakeEvent.parameters = new Array()

  unstakeEvent.parameters.push(
    new ethereum.EventParam("staker", ethereum.Value.fromAddress(staker))
  )
  unstakeEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )
  unstakeEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  unstakeEvent.parameters.push(
    new ethereum.EventParam(
      "unLockHeight",
      ethereum.Value.fromUnsignedBigInt(unLockHeight)
    )
  )

  return unstakeEvent
}

export function createValidatorCreatedEvent(
  validator: Address,
  rewardAddr: Address
): ValidatorCreated {
  let validatorCreatedEvent = changetype<ValidatorCreated>(newMockEvent())

  validatorCreatedEvent.parameters = new Array()

  validatorCreatedEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )
  validatorCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "rewardAddr",
      ethereum.Value.fromAddress(rewardAddr)
    )
  )

  return validatorCreatedEvent
}

export function createValidatorSetUpdatedEvent(
  validators: Array<Address>
): ValidatorSetUpdated {
  let validatorSetUpdatedEvent = changetype<ValidatorSetUpdated>(newMockEvent())

  validatorSetUpdatedEvent.parameters = new Array()

  validatorSetUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "validators",
      ethereum.Value.fromAddressArray(validators)
    )
  )

  return validatorSetUpdatedEvent
}

export function createValidatorSlashEvent(
  validator: Address,
  amount: BigInt
): ValidatorSlash {
  let validatorSlashEvent = changetype<ValidatorSlash>(newMockEvent())

  validatorSlashEvent.parameters = new Array()

  validatorSlashEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )
  validatorSlashEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return validatorSlashEvent
}

export function createValidatorUnjailedEvent(
  validator: Address
): ValidatorUnjailed {
  let validatorUnjailedEvent = changetype<ValidatorUnjailed>(newMockEvent())

  validatorUnjailedEvent.parameters = new Array()

  validatorUnjailedEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )

  return validatorUnjailedEvent
}

export function createValidatorUpdatedEvent(
  validator: Address,
  rewardAddr: Address
): ValidatorUpdated {
  let validatorUpdatedEvent = changetype<ValidatorUpdated>(newMockEvent())

  validatorUpdatedEvent.parameters = new Array()

  validatorUpdatedEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )
  validatorUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "rewardAddr",
      ethereum.Value.fromAddress(rewardAddr)
    )
  )

  return validatorUpdatedEvent
}

export function createWithdrawRewardsEvent(
  validator: Address,
  rewardAddress: Address,
  amount: BigInt,
  nextWithdrawBlock: BigInt
): WithdrawRewards {
  let withdrawRewardsEvent = changetype<WithdrawRewards>(newMockEvent())

  withdrawRewardsEvent.parameters = new Array()

  withdrawRewardsEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )
  withdrawRewardsEvent.parameters.push(
    new ethereum.EventParam(
      "rewardAddress",
      ethereum.Value.fromAddress(rewardAddress)
    )
  )
  withdrawRewardsEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  withdrawRewardsEvent.parameters.push(
    new ethereum.EventParam(
      "nextWithdrawBlock",
      ethereum.Value.fromUnsignedBigInt(nextWithdrawBlock)
    )
  )

  return withdrawRewardsEvent
}

export function createWithdrawStakingEvent(
  staker: Address,
  validator: Address,
  amount: BigInt
): WithdrawStaking {
  let withdrawStakingEvent = changetype<WithdrawStaking>(newMockEvent())

  withdrawStakingEvent.parameters = new Array()

  withdrawStakingEvent.parameters.push(
    new ethereum.EventParam("staker", ethereum.Value.fromAddress(staker))
  )
  withdrawStakingEvent.parameters.push(
    new ethereum.EventParam("validator", ethereum.Value.fromAddress(validator))
  )
  withdrawStakingEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )

  return withdrawStakingEvent
}
