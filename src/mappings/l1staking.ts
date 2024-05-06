import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import {
  IndexerStakeTransferredToL2,
  DelegationTransferredToL2,
  StakeDelegatedUnlockedDueToL2Transfer,
} from '../types/L1Staking/L1Staking'

import {
  Indexer,
  DelegatedStake,
  GraphNetwork,
  Delegator,
  IndexerDelegatedStakeRelation,
} from '../types/schema'
import {
  calculateCapacities,
  updateAdvancedIndexerMetrics,
  updateDelegationExchangeRate,
  getAndUpdateDelegatedStakeDailyData,
  getAndUpdateIndexerDailyData,
  createOrLoadGraphNetwork,
  getAndUpdateNetworkDailyData,
  compoundId,
  BIGINT_ZERO,
} from './helpers'

/*
    /// @dev Emitted when an indexer transfers their stake to L2.
    /// This can happen several times as indexers can transfer partial stake.
    event IndexerStakeTransferredToL2(
        address indexed indexer,
        address indexed l2Indexer,
        uint256 transferredStakeTokens
    );
*/
export function handleIndexerStakeTransferredToL2(event: IndexerStakeTransferredToL2): void {
  let indexer = Indexer.load(event.params.indexer)!
  indexer.stakedTokensTransferredToL2 = indexer.stakedTokensTransferredToL2.plus(
    event.params.transferredStakeTokens,
  )
  if (!indexer.transferredToL2) {
    indexer.transferredToL2 = true
    indexer.firstTransferredToL2At = event.block.timestamp
    indexer.firstTransferredToL2AtBlockNumber = event.block.number
    indexer.firstTransferredToL2AtTx = event.transaction.hash
    indexer.idOnL2 = event.params.l2Indexer
    indexer.idOnL1 = event.params.indexer
  }
  indexer.stakedTokens = indexer.stakedTokens.minus(event.params.transferredStakeTokens)
  indexer.lastTransferredToL2At = event.block.timestamp
  indexer.lastTransferredToL2AtBlockNumber = event.block.number
  indexer.lastTransferredToL2AtTx = event.transaction.hash
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  getAndUpdateIndexerDailyData(indexer, event.block.timestamp)

  // upgrade graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalTokensStaked = graphNetwork.totalTokensStaked.minus(
    event.params.transferredStakeTokens,
  )
  graphNetwork.save()

  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}
/*
    /// @dev Emitted when a delegator transfers their delegation to L2
    event DelegationTransferredToL2(
        address indexed delegator,
        address indexed l2Delegator,
        address indexed indexer,
        address l2Indexer,
        uint256 transferredDelegationTokens
    );
*/
export function handleDelegationTransferredToL2(event: DelegationTransferredToL2): void {
  let delegationID = compoundId(event.params.delegator, event.params.indexer)
  let delegationIDL2 = compoundId(event.params.l2Delegator, event.params.l2Indexer)
  let delegation = DelegatedStake.load(delegationID)!
  let delegatorSharesBefore = delegation.shareAmount
  delegation.stakedTokensTransferredToL2 = delegation.stakedTokensTransferredToL2.plus(
    event.params.transferredDelegationTokens,
  )
  delegation.shareAmount = BIGINT_ZERO
  delegation.totalUnstakedTokens = delegation.totalUnstakedTokens.plus(
    event.params.transferredDelegationTokens,
  )
  delegation.transferredToL2 = true
  delegation.transferredToL2At = event.block.timestamp
  delegation.transferredToL2AtBlockNumber = event.block.number
  delegation.transferredToL2AtTx = event.transaction.hash
  delegation.idOnL1 = delegationID
  delegation.idOnL2 = delegationIDL2

  let indexer = Indexer.load(event.params.indexer)!
  let beforeUpdateDelegationExchangeRate = indexer.delegationExchangeRate
  indexer.delegatedTokens = indexer.delegatedTokens.minus(event.params.transferredDelegationTokens)
  indexer.delegatorShares = indexer.delegatorShares.minus(delegatorSharesBefore)
  if (indexer.delegatorShares != BIGINT_ZERO) {
    indexer = updateDelegationExchangeRate(indexer as Indexer)
  }
  indexer = updateAdvancedIndexerMetrics(indexer as Indexer)
  indexer = calculateCapacities(indexer as Indexer)
  indexer.save()

  getAndUpdateIndexerDailyData(indexer, event.block.timestamp)
  getAndUpdateDelegatedStakeDailyData(delegation, event.block.timestamp)

  let currentBalance = delegatorSharesBefore
    .toBigDecimal()
    .times(beforeUpdateDelegationExchangeRate)
  let oldBalance = delegatorSharesBefore.toBigDecimal().times(delegation.personalExchangeRate)
  let realizedRewards = currentBalance.minus(oldBalance)
  let oldOriginalDelegation = delegation.originalDelegation

  delegation.realizedRewards = delegation.realizedRewards.plus(realizedRewards)
  delegation.originalDelegation = BigDecimal.fromString('0')
  delegation.latestIndexerExchangeRate = indexer.delegationExchangeRate
  delegation.currentDelegation = BigDecimal.fromString('0')
  delegation.unrealizedRewards = BigDecimal.fromString('0')
  delegation.save()

  // update delegator
  let delegator = Delegator.load(event.params.delegator)!
  delegator.totalUnstakedTokens = delegator.totalUnstakedTokens.plus(
    event.params.transferredDelegationTokens,
  )
  delegator.totalRealizedRewards = delegator.totalRealizedRewards.plus(realizedRewards)
  delegator.originalDelegation = delegator.originalDelegation.plus(oldOriginalDelegation)
  delegator.currentDelegation = delegator.currentDelegation.minus(currentBalance)
  delegator.stakedTokens = delegator.stakedTokens.minus(event.params.transferredDelegationTokens)
  delegator.lockedTokens = delegator.lockedTokens.plus(event.params.transferredDelegationTokens)
  delegator.lastUndelegatedAt = event.block.timestamp.toI32()
  delegator.lastUndelegation = delegation.id
  delegator.activeStakesCount = delegator.activeStakesCount - 1
  delegator.save()

  // upgrade graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalDelegatedTokens = graphNetwork.totalDelegatedTokens.minus(
    event.params.transferredDelegationTokens,
  )
  graphNetwork.save()

  // batch update delegs
  // batchUpdateDelegatorsForIndexer(indexer.id, event.block.timestamp)

  // analytics
  let indexerDailyData = getAndUpdateIndexerDailyData(indexer as Indexer, event.block.timestamp)
  indexerDailyData.netDailyDelegatedTokens = indexerDailyData.netDailyDelegatedTokens.minus(
    event.params.transferredDelegationTokens,
  )
  indexerDailyData.save()

  // De-activate relation with indexer after batch update, so last datapoints are created properly
  let relation = IndexerDelegatedStakeRelation.load(delegation.relation)!
  relation.active = false
  relation.save()
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/*
    /// @dev Emitted when a delegator unlocks their tokens ahead of time because the indexer has transferred to L2
    event StakeDelegatedUnlockedDueToL2Transfer(address indexed indexer, address indexed delegator);
*/

// export function handleStakeDelegatedUnlockedDueToL2Transfer(
//   event: StakeDelegatedUnlockedDueToL2Transfer,
// ): void {
//   let graphNetwork = GraphNetwork.load('1')!
//   let delegationID = joinID([
//     event.params.delegator,
//     event.params.indexer,
//   ])
//   let delegation = DelegatedStake.load(delegationID)!
//   delegation.lockedUntil = graphNetwork.currentEpoch
//   delegation.save()
// }
