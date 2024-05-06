import { BigInt, BigDecimal, Bytes } from '@graphprotocol/graph-ts'
import {
  StakeDeposited,
  StakeWithdrawn,
  StakeLocked,
  StakeSlashed,
  AllocationCreated,
  AllocationClosed,
  RebateClaimed,
  Staking,
  StakeDelegated,
  StakeDelegatedLocked,
  StakeDelegatedWithdrawn,
  AllocationCollected,
  DelegationParametersUpdated,
  AllocationClosed1,
  RebateCollected,
} from '../types/Staking/Staking'
import { ParameterUpdated, StakingExtension } from '../types/StakingExtension/StakingExtension'
import {
  Indexer,
  Allocation,
  GraphNetwork,
  Pool,
  SubgraphDeployment,
  Delegator,
  DelegatedStake,
  IndexerDelegatedStakeRelation,
} from '../types/schema'

import {
  createOrLoadSubgraphDeployment,
  createOrLoadIndexer,
  createOrLoadPool,
  createOrLoadDelegator,
  createOrLoadDelegatedStake,
  updateAdvancedIndexerMetrics,
  updateDelegationExchangeRate,
  createOrLoadGraphNetwork,
  getAndUpdateIndexerDailyData,
  calculatePricePerShare,
  getAndUpdateSubgraphDeploymentDailyData,
  batchUpdateDelegatorsForIndexer,
  getAndUpdateNetworkDailyData,
  calculateCapacities,
  compoundId,
} from './helpers'
import { avoidNegativeRoundingError } from './utils'

export function handleDelegationParametersUpdated(event: DelegationParametersUpdated): void {
  let id = event.params.indexer
  let indexer = createOrLoadIndexer(id, event.block.timestamp)
  indexer.indexingRewardCut = event.params.indexingRewardCut.toI32()
  indexer.queryFeeCut = event.params.queryFeeCut.toI32()
  indexer.delegatorParameterCooldown = event.params.cooldownBlocks.toI32()
  indexer.lastDelegationParameterUpdate = event.block.number.toI32()
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer.save()
}

/**
 * @dev handleStakeDeposited
 * - creates an Indexer if it is the first time they have staked
 * - updated the Indexers stake
 * - updates the GraphNetwork total stake
 */
export function handleStakeDeposited(event: StakeDeposited): void {
  // update indexer
  let id = event.params.indexer
  let indexer = createOrLoadIndexer(id, event.block.timestamp)
  let previousStake = indexer.stakedTokens
  indexer.stakedTokens = indexer.stakedTokens.plus(event.params.tokens)
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  // Update graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalTokensStaked = graphNetwork.totalTokensStaked.plus(event.params.tokens)
  if (previousStake == BigInt.fromI32(0)) {
    graphNetwork.stakedIndexersCount = graphNetwork.stakedIndexersCount + 1
  }
  graphNetwork.save()

  // analytics
  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleStakeLocked
 * - updated the Indexers stake
 * - note - the contracts work by not changing the tokensStaked amount, so here, capacity does not
 *          get changed
 */
export function handleStakeLocked(event: StakeLocked): void {
  // update indexer
  let id = event.params.indexer
  let indexer = Indexer.load(id)!
  let oldLockedTokens = indexer.lockedTokens
  indexer.lockedTokens = event.params.tokens
  indexer.tokensLockedUntil = event.params.until.toI32()
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  // update graph network
  // the tokens from the event replace the previously locked tokens
  // from this indexer
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalUnstakedTokensLocked = graphNetwork.totalUnstakedTokensLocked
    .plus(event.params.tokens)
    .minus(oldLockedTokens)
  if (indexer.stakedTokens == indexer.lockedTokens) {
    graphNetwork.stakedIndexersCount = graphNetwork.stakedIndexersCount - 1
  }
  graphNetwork.save()

  // analytics
  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleStakeWithdrawn
 * - updated the Indexers stake
 * - updates the GraphNetwork total stake
 */
export function handleStakeWithdrawn(event: StakeWithdrawn): void {
  // update indexer
  let id = event.params.indexer
  let indexer = Indexer.load(id)!
  indexer.stakedTokens = indexer.stakedTokens.minus(event.params.tokens)
  indexer.lockedTokens = indexer.lockedTokens.minus(event.params.tokens)
  indexer.tokensLockedUntil = 0 // always set to 0 when withdrawn
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  // Update graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalTokensStaked = graphNetwork.totalTokensStaked.minus(event.params.tokens)
  graphNetwork.totalUnstakedTokensLocked = graphNetwork.totalUnstakedTokensLocked.minus(
    event.params.tokens,
  )
  graphNetwork.save()

  // analytics
  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleStakeSlashed
 * - update the Indexers stake
 */
export function handleStakeSlashed(event: StakeSlashed): void {
  let id = event.params.indexer
  let indexer = Indexer.load(id)!

  indexer.stakedTokens = indexer.stakedTokens.minus(event.params.tokens)

  // We need to call into stakes mapping, because locked tokens might have been
  // decremented, and this is not released in the event
  // To fix this we would need to indicate in the event how many locked tokens were released
  let graphNetwork = createOrLoadGraphNetwork()
  let staking = Staking.bind(event.address)
  let indexerStored = staking.stakes(event.params.indexer)
  indexer.lockedTokens = indexerStored.tokensLocked
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  // Update graph network
  graphNetwork.totalTokensStaked = graphNetwork.totalTokensStaked.minus(event.params.tokens)
  graphNetwork.save()

  // analytics
  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
  // Also update net slashed stake?
}

export function handleStakeDelegated(event: StakeDelegated): void {
  let zeroShares = event.params.shares.equals(BigInt.fromI32(0))

  // update indexer
  let indexerID = event.params.indexer
  let indexer = createOrLoadIndexer(indexerID, event.block.timestamp)
  indexer.delegatedTokens = indexer.delegatedTokens.plus(event.params.tokens)
  indexer.delegatorShares = indexer.delegatorShares.plus(event.params.shares)

  if (indexer.delegatorShares != BigInt.fromI32(0)) {
    indexer = updateDelegationExchangeRate(indexer as Indexer)
  }
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  // update delegator
  let delegatorID = event.params.delegator
  let delegator = createOrLoadDelegator(delegatorID, event.block.timestamp)
  delegator.totalStakedTokens = delegator.totalStakedTokens.plus(event.params.tokens)
  delegator.stakedTokens = delegator.stakedTokens.plus(event.params.tokens)

  // update delegated stake
  let delegatedStake = createOrLoadDelegatedStake(
    delegator as Delegator,
    indexerID,
    event.block.timestamp.toI32(),
  )
  let oldOriginalDelegation = delegatedStake.originalDelegation
  let oldCurrentDelegation = delegatedStake.currentDelegation
  let oldUnrealizedRewards = delegatedStake.unrealizedRewards
  let isStakeBecomingActive = delegatedStake.shareAmount.isZero() && !event.params.shares.isZero()

  if (!zeroShares) {
    let previousExchangeRate = delegatedStake.personalExchangeRate
    let previousShares = delegatedStake.shareAmount
    let averageCostBasisTokens = previousExchangeRate
      .times(previousShares.toBigDecimal())
      .plus(event.params.tokens.toBigDecimal())
    let averageCostBasisShares = previousShares.plus(event.params.shares)
    if (averageCostBasisShares.gt(BigInt.fromI32(0))) {
      delegatedStake.personalExchangeRate = averageCostBasisTokens
        .div(averageCostBasisShares.toBigDecimal())
        .truncate(18)
    }
  }

  delegatedStake.stakedTokens = delegatedStake.stakedTokens.plus(event.params.tokens)
  delegatedStake.totalStakedTokens = delegatedStake.totalStakedTokens.plus(event.params.tokens)
  delegatedStake.shareAmount = delegatedStake.shareAmount.plus(event.params.shares)
  delegatedStake.lastDelegatedAt = event.block.timestamp.toI32()
  delegatedStake.originalDelegation = delegatedStake.personalExchangeRate.times(
    delegatedStake.shareAmount.toBigDecimal(),
  )
  delegatedStake.latestIndexerExchangeRate = indexer.delegationExchangeRate
  delegatedStake.currentDelegation = delegatedStake.latestIndexerExchangeRate.times(
    delegatedStake.shareAmount.toBigDecimal(),
  )
  delegatedStake.unrealizedRewards = avoidNegativeRoundingError(
    delegatedStake.currentDelegation.minus(delegatedStake.originalDelegation),
  )
  delegatedStake.save()

  delegator.lastDelegatedAt = event.block.timestamp.toI32()
  delegator.lastDelegation = delegatedStake.id
  delegator.originalDelegation = delegator.originalDelegation.plus(
    delegatedStake.originalDelegation.minus(oldOriginalDelegation),
  )
  delegator.currentDelegation = delegator.currentDelegation.plus(
    delegatedStake.currentDelegation.minus(oldCurrentDelegation),
  )
  delegator.totalUnrealizedRewards = avoidNegativeRoundingError(
    delegator.totalUnrealizedRewards.plus(
      delegatedStake.unrealizedRewards.minus(oldUnrealizedRewards),
    ),
  )

  if (isStakeBecomingActive) {
    delegator.activeStakesCount = delegator.activeStakesCount + 1
  }

  delegator.save()

  // Re-activate relation with indexer before batch update, so new datapoints are created properly
  // We check for 0 shares, in case there's a minimal signalling that doesn't really mint Shares
  // We wouldn't want to re-activate the relation in that case
  if (!delegatedStake.shareAmount.equals(BigInt.fromI32(0))) {
    let relation = IndexerDelegatedStakeRelation.load(delegatedStake.relation)!
    relation.active = true
    relation.save()
  }

  // upgrade graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalDelegatedTokens = graphNetwork.totalDelegatedTokens.plus(event.params.tokens)
  graphNetwork.save()

  // batchUpdateDelegatorsForIndexer(indexer.id, event.block.timestamp)

  // analytics
  let indexerDailyData = getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  indexerDailyData.netDailyDelegatedTokens = indexerDailyData.netDailyDelegatedTokens.plus(
    event.params.tokens,
  )
  indexerDailyData.save()
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

export function handleStakeDelegatedLocked(event: StakeDelegatedLocked): void {
  // update indexer
  let indexerID = event.params.indexer
  let indexer = Indexer.load(indexerID)!
  indexer.delegatedTokens = indexer.delegatedTokens.minus(event.params.tokens)
  indexer.delegatorShares = indexer.delegatorShares.minus(event.params.shares)

  let beforeUpdateDelegationExchangeRate = indexer.delegationExchangeRate

  if (indexer.delegatorShares != BigInt.fromI32(0)) {
    indexer = updateDelegationExchangeRate(indexer as Indexer)
  }
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  // update delegated stake
  let delegatorID = event.params.delegator
  let id = compoundId(delegatorID, indexerID)
  let delegatedStake = DelegatedStake.load(id)!
  let isStakeBecomingInactive =
    !delegatedStake.shareAmount.isZero() && delegatedStake.shareAmount == event.params.shares
  delegatedStake.totalUnstakedTokens = delegatedStake.totalUnstakedTokens.plus(event.params.tokens)
  delegatedStake.stakedTokens = delegatedStake.stakedTokens.minus(event.params.tokens)
  delegatedStake.shareAmount = delegatedStake.shareAmount.minus(event.params.shares)
  delegatedStake.lockedTokens = delegatedStake.lockedTokens.plus(event.params.tokens)
  delegatedStake.lockedUntil = event.params.until.toI32() // until always updates and overwrites the past lockedUntil time
  delegatedStake.lastUndelegatedAt = event.block.timestamp.toI32()

  let currentBalance = event.params.shares.toBigDecimal().times(beforeUpdateDelegationExchangeRate)
  let oldBalance = event.params.shares.toBigDecimal().times(delegatedStake.personalExchangeRate)
  let realizedRewards = currentBalance.minus(oldBalance)
  let oldOriginalDelegation = delegatedStake.originalDelegation

  delegatedStake.realizedRewards = delegatedStake.realizedRewards.plus(realizedRewards)
  delegatedStake.originalDelegation = delegatedStake.personalExchangeRate.times(
    delegatedStake.shareAmount.toBigDecimal(),
  )
  delegatedStake.latestIndexerExchangeRate = indexer.delegationExchangeRate
  delegatedStake.currentDelegation = delegatedStake.latestIndexerExchangeRate.times(
    delegatedStake.shareAmount.toBigDecimal(),
  )
  delegatedStake.unrealizedRewards = avoidNegativeRoundingError(
    delegatedStake.currentDelegation.minus(delegatedStake.originalDelegation),
  )
  delegatedStake.save()

  // update delegator
  let delegator = Delegator.load(delegatorID)!
  delegator.totalUnstakedTokens = delegator.totalUnstakedTokens.plus(event.params.tokens)
  delegator.totalRealizedRewards = delegator.totalRealizedRewards.plus(realizedRewards)
  delegator.totalUnrealizedRewards = avoidNegativeRoundingError(
    delegator.totalUnrealizedRewards.minus(realizedRewards),
  )
  delegator.originalDelegation = delegator.originalDelegation.plus(
    delegatedStake.originalDelegation.minus(oldOriginalDelegation),
  )
  delegator.currentDelegation = delegator.currentDelegation.minus(currentBalance)
  delegator.stakedTokens = delegator.stakedTokens.minus(event.params.tokens)
  delegator.lockedTokens = delegator.lockedTokens.plus(event.params.tokens)
  delegator.lastUndelegatedAt = event.block.timestamp.toI32()
  delegator.lastUndelegation = delegatedStake.id

  if (isStakeBecomingInactive) {
    delegator.activeStakesCount = delegator.activeStakesCount - 1
  }

  delegator.save()

  // upgrade graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalDelegatedTokens = graphNetwork.totalDelegatedTokens.minus(event.params.tokens)
  graphNetwork.save()

  // analytics
  let indexerDailyData = getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  indexerDailyData.netDailyDelegatedTokens = indexerDailyData.netDailyDelegatedTokens.minus(
    event.params.tokens,
  )
  indexerDailyData.save()

  // De-activate relation with indexer after batch update, so last datapoints are created properly
  if (delegatedStake.shareAmount.equals(BigInt.fromI32(0))) {
    let relation = IndexerDelegatedStakeRelation.load(delegatedStake.relation)!
    relation.active = false
    relation.save()
  }
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

export function handleStakeDelegatedWithdrawn(event: StakeDelegatedWithdrawn): void {
  let indexerID = event.params.indexer
  let indexer = Indexer.load(indexerID)!
  let delegatorID = event.params.delegator
  let delegator = Delegator.load(delegatorID)!
  let id = compoundId(delegatorID, indexerID)
  let delegatedStake = DelegatedStake.load(id)!
  let lockedBefore = delegatedStake.lockedTokens

  delegator.lockedTokens = delegatedStake.lockedTokens.minus(lockedBefore)
  delegator.save()

  delegatedStake.lockedTokens = BigInt.fromI32(0)
  delegatedStake.lockedUntil = 0
  delegatedStake.save()

  // analytics
  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
}

/**
 * @dev handleAllocationUpdated
 * - update the indexers stake
 * - update the subgraph total stake
 * - update the named subgraph aggregate stake
 * - update the specific allocation
 * - create a new channel
 */
export function handleAllocationCreated(event: AllocationCreated): void {
  let subgraphDeploymentID = event.params.subgraphDeploymentID
  let indexerID = event.params.indexer
  let channelID = event.params.allocationID
  let allocationID = channelID

  // update indexer
  let indexer = Indexer.load(indexerID)!
  indexer.allocatedTokens = indexer.allocatedTokens.plus(event.params.tokens)
  indexer.totalAllocationCount = indexer.totalAllocationCount.plus(BigInt.fromI32(1))
  indexer.allocationCount = indexer.allocationCount + 1
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  // update graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalTokensAllocated = graphNetwork.totalTokensAllocated.plus(event.params.tokens)
  graphNetwork.save()

  // update subgraph deployment
  let deployment = createOrLoadSubgraphDeployment(subgraphDeploymentID, event.block.timestamp)
  deployment.stakedTokens = deployment.stakedTokens.plus(event.params.tokens)
  deployment.save()

  // create allocation
  let allocation = new Allocation(allocationID)
  allocation.indexer = indexerID
  allocation.creator = event.transaction.from
  allocation.activeForIndexer = indexerID
  allocation.subgraphDeployment = subgraphDeploymentID
  allocation.allocatedTokens = event.params.tokens
  allocation.effectiveAllocation = BigInt.fromI32(0)
  allocation.createdAtEpoch = event.params.epoch.toI32()
  allocation.closedAtEpoch = 0
  allocation.createdAtBlockHash = event.block.hash
  allocation.queryFeesCollected = BigInt.fromI32(0)
  allocation.queryFeeRebates = BigInt.fromI32(0)
  allocation.distributedRebates = BigInt.fromI32(0)
  allocation.curatorRewards = BigInt.fromI32(0)
  allocation.indexingRewards = BigInt.fromI32(0)
  allocation.indexingIndexerRewards = BigInt.fromI32(0)
  allocation.indexingDelegatorRewards = BigInt.fromI32(0)
  allocation.delegationFees = BigInt.fromI32(0)
  allocation.status = 'Active'
  allocation.totalReturn = BigDecimal.fromString('0')
  allocation.annualizedReturn = BigDecimal.fromString('0')
  allocation.createdAt = event.block.timestamp.toI32()
  allocation.save()

  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleAllocationCollected
 * Note: this handler is for the AllocationCollected event prior to exponential rebates upgrade
 * - Transfers tokens from a state channel to the staking contract
 * - Burns fees if protocolPercentage > 0
 * - Collects curationFees to go to curator rewards
 * - calls collect() on curation, which is handled in curation.ts
 * - adds to the allocations collected fees
 * - if closed, it will add fees to the rebate pool
 * - Note - the name event.param.rebateFees is confusing. Rebate fees are better described
 * as query Fees. rebate is from cobbs douglas, which we get from claim()
 */
export function handleAllocationCollected(event: AllocationCollected): void {
  let subgraphDeploymentID = event.params.subgraphDeploymentID
  let indexerID = event.params.indexer
  let allocationID = event.params.allocationID

  // update indexer
  let indexer = Indexer.load(indexerID)!
  indexer.queryFeesCollected = indexer.queryFeesCollected.plus(event.params.rebateFees)
  indexer.save()

  // update allocation
  // rebateFees is the total token value minus the curation and protocol fees, as can be seen in the contracts
  let allocation = Allocation.load(allocationID)!
  allocation.queryFeesCollected = allocation.queryFeesCollected.plus(event.params.rebateFees)
  allocation.curatorRewards = allocation.curatorRewards.plus(event.params.curationFees)
  allocation.save()

  // Update epoch - none

  // update pool
  let pool = createOrLoadPool(event.params.epoch)
  // ONLY if allocation is closed. Otherwise it gets collected into an allocation, and it will
  // get added to the pool where the allocation gets closed
  if (allocation.status == 'Closed') {
    pool.totalQueryFees = pool.totalQueryFees.plus(event.params.rebateFees)
  }
  // Curator rewards in pool is not stored in the contract, so we take the actual value of it
  // happening. Every time an allocation is collected, curator rewards get transferred into
  // bonding curves. Hence why it is not dependant on status being closed
  pool.curatorRewards = pool.curatorRewards.plus(event.params.curationFees)
  pool.save()

  // update subgraph deployment
  let deployment = SubgraphDeployment.load(subgraphDeploymentID)!
  deployment.queryFeesAmount = deployment.queryFeesAmount.plus(event.params.rebateFees)
  deployment.signalledTokens = deployment.signalledTokens.plus(event.params.curationFees)
  deployment.curatorFeeRewards = deployment.curatorFeeRewards.plus(event.params.curationFees)
  deployment.pricePerShare = calculatePricePerShare(deployment as SubgraphDeployment)
  deployment.save()

  // since we don't get the protocol tax explicitly, we will use tokens - (curation + rebate) to calculate it
  // This could also be calculated by doing: protocolPercentage * event.params.tokens
  let taxedFees = event.params.tokens.minus(event.params.rebateFees.plus(event.params.curationFees))

  // update graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalQueryFees = graphNetwork.totalQueryFees.plus(event.params.tokens)
  graphNetwork.totalIndexerQueryFeesCollected = graphNetwork.totalIndexerQueryFeesCollected.plus(
    event.params.rebateFees,
  )
  graphNetwork.totalCuratorQueryFees = graphNetwork.totalCuratorQueryFees.plus(
    event.params.curationFees,
  )
  graphNetwork.totalTaxedQueryFees = graphNetwork.totalTaxedQueryFees.plus(taxedFees)
  graphNetwork.totalUnclaimedQueryFeeRebates = graphNetwork.totalUnclaimedQueryFeeRebates.plus(
    event.params.rebateFees,
  )
  graphNetwork.save()

  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  getAndUpdateSubgraphDeploymentDailyData(deployment as SubgraphDeployment, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleAllocationClosed
 * - update the indexers stake
 * - update the subgraph total stake
 * - update the named subgraph aggregate stake
 * - update the specific allocation
 * - update and close the channel
 */
export function handleAllocationClosed(event: AllocationClosed): void {
  let indexerID = event.params.indexer
  let allocationID = event.params.allocationID

  // update indexer
  let indexer = Indexer.load(indexerID)!
  if (event.params.sender != event.params.indexer) {
    indexer.forcedClosures = indexer.forcedClosures + 1
  }
  indexer.allocatedTokens = indexer.allocatedTokens.minus(event.params.tokens)
  indexer.allocationCount = indexer.allocationCount - 1
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  // update allocation
  let allocation = Allocation.load(allocationID)!
  allocation.poolClosedIn = changetype<Bytes>(Bytes.fromBigInt(event.params.epoch))
  allocation.activeForIndexer = null
  allocation.closedAtEpoch = event.params.epoch.toI32()
  allocation.closedAtBlockHash = event.block.hash
  allocation.closedAtBlockNumber = event.block.number.toI32()
  allocation.status = 'Closed'
  allocation.poi = event.params.poi
  allocation.save()

  // update subgraph deployment. Pretty sure this should be done here, if not
  // it would be done in handleRebateClaimed
  let subgraphDeploymentID = event.params.subgraphDeploymentID
  let deployment = createOrLoadSubgraphDeployment(subgraphDeploymentID, event.block.timestamp)
  deployment.stakedTokens = deployment.stakedTokens.minus(event.params.tokens)
  deployment.save()

  // update graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalTokensAllocated = graphNetwork.totalTokensAllocated.minus(event.params.tokens)
  graphNetwork.save()

  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  getAndUpdateSubgraphDeploymentDailyData(deployment as SubgraphDeployment, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleAllocationClosed
 * - update the indexers stake
 * - update the subgraph total stake
 * - update the named subgraph aggregate stake
 * - update the specific allocation
 * - update and close the channel
 */
export function handleAllocationClosedCobbDouglas(event: AllocationClosed1): void {
  let indexerID = event.params.indexer
  let allocationID = event.params.allocationID

  // update indexer
  let indexer = Indexer.load(indexerID)!
  if (event.params.sender != event.params.indexer) {
    indexer.forcedClosures = indexer.forcedClosures + 1
  }
  indexer.allocatedTokens = indexer.allocatedTokens.minus(event.params.tokens)
  indexer.allocationCount = indexer.allocationCount - 1
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  // update allocation
  let allocation = Allocation.load(allocationID)!
  allocation.poolClosedIn = changetype<Bytes>(Bytes.fromBigInt(event.params.epoch))
  allocation.activeForIndexer = null
  allocation.closedAtEpoch = event.params.epoch.toI32()
  allocation.closedAtBlockHash = event.block.hash
  allocation.closedAtBlockNumber = event.block.number.toI32()
  allocation.effectiveAllocation = event.params.effectiveAllocation
  allocation.status = 'Closed'
  allocation.poi = event.params.poi
  allocation.save()

  // update pool
  let pool = createOrLoadPool(event.params.epoch)
  // effective allocation is the value stored in contracts, so we use it here
  pool.allocation = pool.allocation.plus(event.params.effectiveAllocation)

  // We must call the contract directly to see how many fees are getting closed in this
  // allocation. The event does not emit this information
  let staking = Staking.bind(event.address)
  let contractAlloc = staking.getAllocation1(event.params.allocationID)
  pool.totalQueryFees = pool.totalQueryFees.plus(contractAlloc.collectedFees)
  pool.save()

  // update subgraph deployment. Pretty sure this should be done here, if not
  // it would be done in handleRebateClaimed
  let subgraphDeploymentID = event.params.subgraphDeploymentID
  let deployment = createOrLoadSubgraphDeployment(subgraphDeploymentID, event.block.timestamp)
  deployment.stakedTokens = deployment.stakedTokens.minus(event.params.tokens)
  deployment.save()

  // update graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalTokensAllocated = graphNetwork.totalTokensAllocated.minus(event.params.tokens)
  graphNetwork.save()

  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  getAndUpdateSubgraphDeploymentDailyData(deployment as SubgraphDeployment, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleRebateClaimed
 * - update pool
 * - update closure of channel in pool
 * - update pool
 * - note - if rebate is transferred to indexer, that will be handled in graphToken.ts, and in
 *          the other case, if it is restaked, it will be handled by handleStakeDeposited
 */
export function handleRebateClaimed(event: RebateClaimed): void {
  let indexerID = event.params.indexer
  let allocationID = event.params.allocationID
  let subgraphDeploymentID = event.params.subgraphDeploymentID

  // update indexer
  let indexer = Indexer.load(indexerID)!
  indexer.queryFeeRebates = indexer.queryFeeRebates.plus(event.params.tokens)
  indexer.delegatorQueryFees = indexer.delegatorQueryFees.plus(event.params.delegationFees)
  indexer.delegatedTokens = indexer.delegatedTokens.plus(event.params.delegationFees)

  if (indexer.delegatorShares != BigInt.fromI32(0)) {
    indexer = updateDelegationExchangeRate(indexer as Indexer)
  }
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer.save()
  // update allocation
  let allocation = Allocation.load(allocationID)!
  allocation.queryFeeRebates = event.params.tokens
  allocation.delegationFees = event.params.delegationFees
  allocation.status = 'Closed' // 'Claimed' is the correct status for pre exponential rebates
  allocation.save()

  // update pool
  let pool = Pool.load(changetype<Bytes>(Bytes.fromBigInt(event.params.forEpoch)))!
  pool.claimedFees = pool.claimedFees.plus(event.params.tokens)
  pool.save()

  // update subgraph deployment
  let subgraphDeployment = SubgraphDeployment.load(subgraphDeploymentID)!
  subgraphDeployment.queryFeeRebates = subgraphDeployment.queryFeeRebates.plus(event.params.tokens)
  subgraphDeployment.delegatorQueryFees = subgraphDeployment.delegatorQueryFees.plus(
    event.params.delegationFees,
  )
  subgraphDeployment.save()

  // update graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalIndexerQueryFeeRebates = graphNetwork.totalIndexerQueryFeeRebates.plus(
    event.params.tokens,
  )
  graphNetwork.totalDelegatorQueryFeeRebates = graphNetwork.totalDelegatorQueryFeeRebates.plus(
    event.params.delegationFees,
  )
  graphNetwork.totalUnclaimedQueryFeeRebates = graphNetwork.totalUnclaimedQueryFeeRebates.minus(
    event.params.delegationFees.plus(event.params.tokens),
  )
  graphNetwork.totalDelegatedTokens = graphNetwork.totalDelegatedTokens.plus(
    event.params.delegationFees,
  )
  graphNetwork.save()

  batchUpdateDelegatorsForIndexer(indexer.id, event.block.timestamp)

  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  getAndUpdateSubgraphDeploymentDailyData(
    subgraphDeployment as SubgraphDeployment,
    event.block.timestamp,
  )
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleParameterUpdated
 * - updates all parameters of staking, depending on string passed. We then can
 *   call the contract directly to get the updated value
 */
export function handleParameterUpdated(event: ParameterUpdated): void {
  let parameter = event.params.param
  let graphNetwork = createOrLoadGraphNetwork()
  let staking = StakingExtension.bind(event.address)

  if (parameter == 'delegationRatio') {
    graphNetwork.delegationRatio = staking.delegationRatio().toI32()
  }
  graphNetwork.save()
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleRebateCollected
 * - update indexer
 * - update allocation
 * - update epoch
 * - update subgraph deployment
 * - update graph network
 */
export function handleRebateCollected(event: RebateCollected): void {
  let graphNetwork = createOrLoadGraphNetwork()
  let subgraphDeploymentID = event.params.subgraphDeploymentID
  let indexerID = event.params.indexer
  let allocationID = event.params.allocationID

  // update indexer
  let indexer = Indexer.load(indexerID)!
  indexer.queryFeesCollected = indexer.queryFeesCollected.plus(event.params.queryFees)
  indexer.queryFeeRebates = indexer.queryFeeRebates.plus(event.params.queryRebates)
  indexer.delegatorQueryFees = indexer.delegatorQueryFees.plus(event.params.delegationRewards)
  indexer.delegatedTokens = indexer.delegatedTokens.plus(event.params.delegationRewards)
  if (indexer.delegatorShares != BigInt.fromI32(0)) {
    indexer = updateDelegationExchangeRate(indexer as Indexer)
  }
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer.save()

  // update allocation
  // queryFees is the total token value minus the curation and protocol fees, as can be seen in the contracts
  let allocation = Allocation.load(allocationID)!
  allocation.queryFeesCollected = allocation.queryFeesCollected.plus(event.params.queryFees)
  allocation.curatorRewards = allocation.curatorRewards.plus(event.params.curationFees)
  allocation.queryFeeRebates = event.params.queryRebates
  allocation.distributedRebates = allocation.distributedRebates.plus(event.params.queryRebates)
  allocation.delegationFees = event.params.delegationRewards
  allocation.save()

  // update subgraph deployment
  let deployment = SubgraphDeployment.load(subgraphDeploymentID)!
  deployment.queryFeesAmount = deployment.queryFeesAmount.plus(event.params.queryFees)
  deployment.signalledTokens = deployment.signalledTokens.plus(event.params.curationFees)
  deployment.curatorFeeRewards = deployment.curatorFeeRewards.plus(event.params.curationFees)
  deployment.pricePerShare = calculatePricePerShare(deployment as SubgraphDeployment)
  deployment.queryFeeRebates = deployment.queryFeeRebates.plus(event.params.queryRebates)
  deployment.save()

  // update graph network
  graphNetwork.totalQueryFees = graphNetwork.totalQueryFees.plus(event.params.tokens)
  graphNetwork.totalIndexerQueryFeesCollected = graphNetwork.totalIndexerQueryFeesCollected.plus(
    event.params.queryFees,
  )
  graphNetwork.totalCuratorQueryFees = graphNetwork.totalCuratorQueryFees.plus(
    event.params.curationFees,
  )
  graphNetwork.totalTaxedQueryFees = graphNetwork.totalTaxedQueryFees.plus(event.params.protocolTax)
  graphNetwork.totalUnclaimedQueryFeeRebates = graphNetwork.totalUnclaimedQueryFeeRebates.plus(
    event.params.queryFees,
  )
  graphNetwork.totalIndexerQueryFeeRebates = graphNetwork.totalIndexerQueryFeeRebates.plus(
    event.params.queryRebates,
  )
  graphNetwork.totalDelegatorQueryFeeRebates = graphNetwork.totalDelegatorQueryFeeRebates.plus(
    event.params.delegationRewards,
  )
  graphNetwork.totalUnclaimedQueryFeeRebates = graphNetwork.totalUnclaimedQueryFeeRebates.minus(
    event.params.delegationRewards.plus(event.params.queryRebates),
  )
  graphNetwork.totalDelegatedTokens = graphNetwork.totalDelegatedTokens.plus(
    event.params.delegationRewards,
  )
  graphNetwork.save()

  batchUpdateDelegatorsForIndexer(indexer.id, event.block.timestamp)

  getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  getAndUpdateSubgraphDeploymentDailyData(deployment as SubgraphDeployment, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}
