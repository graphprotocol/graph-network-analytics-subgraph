import { BigInt, ByteArray, Address, Bytes, crypto, log, BigDecimal } from '@graphprotocol/graph-ts'
import {
  SubgraphDeployment,
  GraphNetwork,
  GraphAccount,
  GraphAccountName,
  Indexer,
  Pool,
  Curator,
  Epoch,
  Signal,
  SubgraphVersion,
  Subgraph,
  NameSignal,
  Delegator,
  DelegatedStake,
  IndexerDailyData,
  DelegatorDailyData,
  DelegatedStakeDailyData,
  SubgraphDeploymentDailyData,
  DelegatorDelegatedStakeDailyRelation,
  IndexerDelegatedStakeDailyRelation,
} from '../types/schema'
import { ENS } from '../types/GNS/ENS'
import { addresses } from '../../config/addresses'
import { LAUNCH_DAY, SECONDS_PER_DAY } from './utils'

export function createOrLoadGraphAccount(
  id: string,
  owner: Bytes,
  timeStamp: BigInt,
): GraphAccount {
  let graphAccount = GraphAccount.load(id)
  if (graphAccount == null) {
    graphAccount = new GraphAccount(id)
    graphAccount.createdAt = timeStamp.toI32()
    graphAccount.operators = []
    graphAccount.balance = BigInt.fromI32(0)
    graphAccount.curationApproval = BigInt.fromI32(0)
    graphAccount.stakingApproval = BigInt.fromI32(0)
    graphAccount.gnsApproval = BigInt.fromI32(0)
    //graphAccount.subgraphQueryFees = BigInt.fromI32(0)
    graphAccount.save()
  }
  return graphAccount as GraphAccount
}

export function createOrLoadSubgraph(
  subgraphID: string,
  owner: Address,
  timestamp: BigInt,
): Subgraph {
  let subgraph = Subgraph.load(subgraphID)
  if (subgraph == null) {
    subgraph = new Subgraph(subgraphID)
    subgraph.owner = owner.toHexString()
    subgraph.pastVersions = []
    subgraph.createdAt = timestamp.toI32()
    subgraph.updatedAt = timestamp.toI32()

    subgraph.signalledTokens = BigInt.fromI32(0)
    subgraph.unsignalledTokens = BigInt.fromI32(0)
    subgraph.nameSignalAmount = BigInt.fromI32(0)
    subgraph.reserveRatio = 0
    subgraph.withdrawableTokens = BigInt.fromI32(0)
    subgraph.withdrawnTokens = BigInt.fromI32(0)

    subgraph.metadataHash = Bytes.fromI32(0) as Bytes
    // subgraph.description = ''
    // subgraph.image = ''
    // subgraph.codeRepository = ''
    // subgraph.website = ''
    // subgraph.displayName = ''

    subgraph.save()

    let graphNetwork = createOrLoadGraphNetwork()
    graphNetwork.subgraphCount = graphNetwork.subgraphCount + 1
    graphNetwork.save()
  }
  return subgraph as Subgraph
}

export function createOrLoadSubgraphDeployment(
  subgraphID: string,
  timestamp: BigInt,
): SubgraphDeployment {
  let deployment = SubgraphDeployment.load(subgraphID)
  if (deployment == null) {
    deployment = new SubgraphDeployment(subgraphID)
    deployment.createdAt = timestamp.toI32()
    deployment.stakedTokens = BigInt.fromI32(0)
    deployment.indexingRewardAmount = BigInt.fromI32(0)
    deployment.indexingIndexerRewardAmount = BigInt.fromI32(0)
    deployment.indexingDelegatorRewardAmount = BigInt.fromI32(0)
    deployment.queryFeesAmount = BigInt.fromI32(0)
    deployment.queryFeeRebates = BigInt.fromI32(0)
    deployment.delegatorQueryFees = BigInt.fromI32(0)
    deployment.curatorFeeRewards = BigInt.fromI32(0)

    deployment.signalledTokens = BigInt.fromI32(0)
    deployment.unsignalledTokens = BigInt.fromI32(0)
    deployment.signalAmount = BigInt.fromI32(0)
    deployment.pricePerShare = BigDecimal.fromString('0')
    deployment.reserveRatio = 0
    deployment.deniedAt = 0
    deployment.save()

    let graphNetwork = createOrLoadGraphNetwork()
    graphNetwork.subgraphDeploymentCount = graphNetwork.subgraphDeploymentCount + 1
    graphNetwork.save()
  }
  return deployment as SubgraphDeployment
}

export function createOrLoadIndexer(id: string, timestamp: BigInt): Indexer {
  let indexer = Indexer.load(id)
  if (indexer == null) {
    indexer = new Indexer(id)
    indexer.createdAt = timestamp.toI32()
    // indexer.account = id

    indexer.stakedTokens = BigInt.fromI32(0)
    indexer.allocatedTokens = BigInt.fromI32(0)
    indexer.lockedTokens = BigInt.fromI32(0)
    indexer.unstakedTokens = BigInt.fromI32(0)
    indexer.tokensLockedUntil = 0
    indexer.queryFeesCollected = BigInt.fromI32(0)
    indexer.queryFeeRebates = BigInt.fromI32(0)
    indexer.rewardsEarned = BigInt.fromI32(0)
    indexer.indexerRewardsOwnGenerationRatio = BigDecimal.fromString('0')

    indexer.delegatedCapacity = BigInt.fromI32(0)
    indexer.tokenCapacity = BigInt.fromI32(0)
    indexer.availableStake = BigInt.fromI32(0)

    indexer.delegatedTokens = BigInt.fromI32(0)
    indexer.ownStakeRatio = BigDecimal.fromString('0')
    indexer.delegatedStakeRatio = BigDecimal.fromString('0')
    indexer.delegatorShares = BigInt.fromI32(0)
    indexer.delegationExchangeRate = BigDecimal.fromString('1')
    indexer.indexingRewardCut = 0
    indexer.indexingRewardEffectiveCut = BigDecimal.fromString('0')
    indexer.overDelegationDilution = BigDecimal.fromString('0')
    indexer.delegatorIndexingRewards = BigInt.fromI32(0)
    indexer.indexerIndexingRewards = BigInt.fromI32(0)
    indexer.delegatorQueryFees = BigInt.fromI32(0)
    indexer.queryFeeCut = 0
    indexer.queryFeeEffectiveCut = BigDecimal.fromString('0')
    indexer.delegatorParameterCooldown = 0
    indexer.lastDelegationParameterUpdate = 0
    indexer.forcedClosures = 0
    indexer.allocationCount = 0
    indexer.totalAllocationCount = BigInt.fromI32(0)

    indexer.totalReturn = BigDecimal.fromString('0')
    indexer.annualizedReturn = BigDecimal.fromString('0')
    indexer.stakingEfficiency = BigDecimal.fromString('0')

    indexer.delegatorsCount = BigInt.fromI32(0)

    let graphNetwork = createOrLoadGraphNetwork()
    graphNetwork.indexerCount = graphNetwork.indexerCount + 1
    graphNetwork.save()

    indexer.save()
  }
  return indexer as Indexer
}

export function createOrLoadDelegator(id: string, timestamp: BigInt): Delegator {
  let delegator = Delegator.load(id)
  if (delegator == null) {
    delegator = new Delegator(id)
    delegator.stakedTokens = BigInt.fromI32(0)
    delegator.lockedTokens = BigInt.fromI32(0)
    delegator.totalStakedTokens = BigInt.fromI32(0)
    delegator.totalUnstakedTokens = BigInt.fromI32(0)
    delegator.createdAt = timestamp.toI32()
    delegator.totalRealizedRewards = BigDecimal.fromString('0')
    delegator.save()

    let graphNetwork = createOrLoadGraphNetwork()
    graphNetwork.delegatorCount = graphNetwork.delegatorCount + 1
    graphNetwork.save()
  }
  return delegator as Delegator
}

export function createOrLoadDelegatedStake(
  delegator: string,
  indexer: string,
  timestamp: i32,
): DelegatedStake {
  let id = joinID([delegator, indexer])
  let delegatedStake = DelegatedStake.load(id)
  if (delegatedStake == null) {
    delegatedStake = new DelegatedStake(id)
    delegatedStake.indexer = indexer
    delegatedStake.delegator = delegator
    delegatedStake.stakedTokens = BigInt.fromI32(0)
    delegatedStake.totalStakedTokens = BigInt.fromI32(0)
    delegatedStake.totalUnstakedTokens = BigInt.fromI32(0)
    delegatedStake.lockedTokens = BigInt.fromI32(0)
    delegatedStake.lockedUntil = 0
    delegatedStake.shareAmount = BigInt.fromI32(0)
    delegatedStake.personalExchangeRate = BigDecimal.fromString('1')
    delegatedStake.latestIndexerExchangeRate = BigDecimal.fromString('1')
    delegatedStake.realizedRewards = BigDecimal.fromString('0')
    delegatedStake.unrealizedRewards = BigDecimal.fromString('0')
    delegatedStake.originalDelegation = BigDecimal.fromString('0')
    delegatedStake.currentDelegation = BigDecimal.fromString('0')
    delegatedStake.createdAt = timestamp
    delegatedStake.save()
  }
  return delegatedStake as DelegatedStake
}
export function createOrLoadCurator(id: string, timestamp: BigInt): Curator {
  let curator = Curator.load(id)
  if (curator == null) {
    curator = new Curator(id)
    curator.createdAt = timestamp.toI32()
    curator.totalSignalledTokens = BigInt.fromI32(0)
    curator.totalUnsignalledTokens = BigInt.fromI32(0)

    curator.totalNameSignalledTokens = BigInt.fromI32(0)
    curator.totalNameUnsignalledTokens = BigInt.fromI32(0)
    curator.totalWithdrawnTokens = BigInt.fromI32(0)

    curator.realizedRewards = BigInt.fromI32(0)
    curator.annualizedReturn = BigDecimal.fromString('0')
    curator.totalReturn = BigDecimal.fromString('0')
    curator.signalingEfficiency = BigDecimal.fromString('0')
    curator.totalNameSignalAverageCostBasis = BigDecimal.fromString('0')
    curator.totalNameSignal = BigDecimal.fromString('0')
    curator.totalAverageCostBasisPerNameSignal = BigDecimal.fromString('0')
    curator.save()

    let graphNetwork = createOrLoadGraphNetwork()
    graphNetwork.curatorCount = graphNetwork.curatorCount + 1
    graphNetwork.save()
  }
  return curator as Curator
}

export function createOrLoadSignal(curator: string, subgraphDeploymentID: string): Signal {
  let signalID = joinID([curator, subgraphDeploymentID])
  let signal = Signal.load(signalID)
  if (signal == null) {
    signal = new Signal(signalID)
    signal.curator = curator
    signal.subgraphDeployment = subgraphDeploymentID
    signal.signalledTokens = BigInt.fromI32(0)
    signal.unsignalledTokens = BigInt.fromI32(0)
    signal.signal = BigInt.fromI32(0)
    signal.lastSignalChange = 0
    signal.realizedRewards = BigInt.fromI32(0)
    signal.save()
  }
  return signal as Signal
}

export function createOrLoadNameSignal(
  curator: string,
  subgraphID: string,
  timestamp: BigInt,
): NameSignal {
  let nameSignalID = joinID([curator, subgraphID])
  let nameSignal = NameSignal.load(nameSignalID)
  if (nameSignal == null) {
    nameSignal = new NameSignal(nameSignalID)
    let underlyingCurator = createOrLoadCurator(curator, timestamp)
    nameSignal.curator = underlyingCurator.id
    nameSignal.subgraph = subgraphID
    nameSignal.signalledTokens = BigInt.fromI32(0)
    nameSignal.unsignalledTokens = BigInt.fromI32(0)
    nameSignal.withdrawnTokens = BigInt.fromI32(0)
    nameSignal.nameSignal = BigInt.fromI32(0)
    nameSignal.lastNameSignalChange = 0
    nameSignal.realizedRewards = BigInt.fromI32(0)
    nameSignal.averageCostBasis = BigDecimal.fromString('0')
    nameSignal.averageCostBasisPerSignal = BigDecimal.fromString('0')
    nameSignal.save()
  }
  return nameSignal as NameSignal
}

// export function createOrLoadGraphAccount(
//   id: string,
//   owner: Bytes,
//   timeStamp: BigInt,
// ): GraphAccount {
//   let graphAccount = GraphAccount.load(id)
//   if (graphAccount == null) {
//     graphAccount = new GraphAccount(id)
//     graphAccount.createdAt = timeStamp.toI32()
//     graphAccount.operators = []
//     graphAccount.balance = BigInt.fromI32(0)
//     graphAccount.curationApproval = BigInt.fromI32(0)
//     graphAccount.stakingApproval = BigInt.fromI32(0)
//     graphAccount.gnsApproval = BigInt.fromI32(0)
//     graphAccount.subgraphQueryFees = BigInt.fromI32(0)
//     graphAccount.save()
//   }
//   return graphAccount as GraphAccount
// }

export function createOrLoadPool(id: BigInt): Pool {
  let pool = Pool.load(id.toString())
  if (pool == null) {
    pool = new Pool(id.toString())
    pool.allocation = BigInt.fromI32(0)
    pool.totalQueryFees = BigInt.fromI32(0)
    pool.claimedFees = BigInt.fromI32(0)
    pool.curatorRewards = BigInt.fromI32(0)
    pool.save()
  }
  return pool as Pool
}

// export function createOrLoadEpoch(blockNumber: BigInt): Epoch {
//   let graphNetwork = createOrLoadGraphNetwork()
//   let epochsSinceLastUpdate = blockNumber
//     .minus(BigInt.fromI32(graphNetwork.lastLengthUpdateBlock))
//     .div(BigInt.fromI32(graphNetwork.epochLength))
//   let epoch: Epoch
//
//   // true if we need to create
//   // it is checking if at least 1 epoch has passed since the last creation
//   let needsCreating =
//     epochsSinceLastUpdate.toI32() > graphNetwork.currentEpoch - graphNetwork.lastLengthUpdateEpoch
//
//   if (needsCreating) {
//     let newEpoch = graphNetwork.lastLengthUpdateEpoch + epochsSinceLastUpdate.toI32()
//
//     // Need to get the start block according to the contracts, not just the start block this
//     // entity was created in the subgraph
//     let startBlock =
//       graphNetwork.lastLengthUpdateBlock + epochsSinceLastUpdate.toI32() * graphNetwork.epochLength
//     epoch = createEpoch(startBlock, graphNetwork.epochLength, newEpoch)
//     graphNetwork.epochCount = graphNetwork.epochCount + 1
//     graphNetwork.currentEpoch = newEpoch
//     graphNetwork.save()
//
//     // If there is no need to create a new epoch, just return the current one
//   } else {
//     epoch = Epoch.load(BigInt.fromI32(graphNetwork.currentEpoch).toString()) as Epoch
//   }
//   return epoch
// }

export function createEpoch(startBlock: i32, epochLength: i32, epochNumber: i32): Epoch {
  let epoch = new Epoch(BigInt.fromI32(epochNumber).toString())
  epoch.startBlock = startBlock
  epoch.endBlock = startBlock + epochLength
  epoch.signalledTokens = BigInt.fromI32(0)
  epoch.stakeDeposited = BigInt.fromI32(0)
  epoch.queryFeeRebates = BigInt.fromI32(0)
  epoch.totalRewards = BigInt.fromI32(0)
  epoch.totalIndexerRewards = BigInt.fromI32(0)
  epoch.totalDelegatorRewards = BigInt.fromI32(0)
  epoch.save()
  return epoch
}

export function createOrLoadGraphNetwork(): GraphNetwork {
  let graphNetwork = GraphNetwork.load('1')
  if (graphNetwork == null) {
    graphNetwork = new GraphNetwork('1')

    // let contract = GraphNetwork.bind(event.params.a)
    // most of the parameters below are updated in the constructor, or else
    // right after deployment
    graphNetwork.delegationRatio = 0

    graphNetwork.totalTokensStaked = BigInt.fromI32(0)
    graphNetwork.totalTokensClaimable = BigInt.fromI32(0)
    graphNetwork.totalUnstakedTokensLocked = BigInt.fromI32(0)
    graphNetwork.totalTokensAllocated = BigInt.fromI32(0)
    graphNetwork.totalDelegatedTokens = BigInt.fromI32(0)

    graphNetwork.totalQueryFees = BigInt.fromI32(0)
    graphNetwork.totalIndexerQueryFeesCollected = BigInt.fromI32(0)
    graphNetwork.totalIndexerQueryFeeRebates = BigInt.fromI32(0)
    graphNetwork.totalDelegatorQueryFeeRebates = BigInt.fromI32(0)
    graphNetwork.totalCuratorQueryFees = BigInt.fromI32(0)
    graphNetwork.totalTaxedQueryFees = BigInt.fromI32(0)
    graphNetwork.totalUnclaimedQueryFeeRebates = BigInt.fromI32(0)

    graphNetwork.totalIndexingRewards = BigInt.fromI32(0)
    graphNetwork.totalIndexingIndexerRewards = BigInt.fromI32(0)
    graphNetwork.totalIndexingDelegatorRewards = BigInt.fromI32(0)

    graphNetwork.totalTokensSignalled = BigInt.fromI32(0)

    graphNetwork.totalSupply = BigInt.fromI32(0) // gets set by mint

    graphNetwork.epochCount = 0

    graphNetwork.indexerCount = 0
    graphNetwork.stakedIndexersCount = 0
    graphNetwork.delegatorCount = 0
    graphNetwork.curatorCount = 0
    graphNetwork.subgraphCount = 0
    graphNetwork.subgraphDeploymentCount = 0

    graphNetwork.save()
  }
  return graphNetwork as GraphNetwork
}

export function addQm(a: ByteArray): ByteArray {
  let out = new Uint8Array(34)
  out[0] = 0x12
  out[1] = 0x20
  for (let i = 0; i < 32; i++) {
    out[i + 2] = a[i]
  }
  return out as ByteArray
}

// Helper for concatenating two byte arrays
export function concatByteArrays(a: ByteArray, b: ByteArray): ByteArray {
  let out = new Uint8Array(a.length + b.length)
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i]
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j]
  }
  return out as ByteArray
}

export function getVersionNumber(
  graphAccount: string,
  subgraphNumber: string,
  versionNumber: BigInt,
): BigInt {
  // create versionID. start at version 1
  // TODO - should I start it at 0?
  let versionID = joinID([graphAccount, subgraphNumber, versionNumber.toString()])
  let version = SubgraphVersion.load(versionID)
  // recursion until you get the right version
  if (version != null) {
    versionNumber = versionNumber.plus(BigInt.fromI32(1))
    getVersionNumber(graphAccount, subgraphNumber, versionNumber)
  }
  return versionNumber
}

/**
 * @dev Checks 3 different requirements to resolve a name for a subgraph. Only works with ENS
 * @returns GraphNameAccount ID or null
 */
export function resolveName(graphAccount: Address, name: string, node: Bytes): string | null {
  let graphAccountString = graphAccount.toHexString()
  if (checkTLD(name, node.toHexString())) {
    if (verifyNameOwnership(graphAccountString, node)) {
      let nameSystem = 'ENS'
      let id = joinID([nameSystem, node.toHexString()])
      createGraphAccountName(id, nameSystem, name, graphAccountString)
      // All checks have passed: save the new name and return the ID to be stored on the subgraph
      return id
    }
  }
  // one requirement failed, return null
  return null
}

/**
 * @dev Checks if it is a valid top level .eth domain and that the name matches the name hash.
 * Sub domains automatically return null
 * Non matching names return null
 */
function checkTLD(name: string, node: string): boolean {
  if (name.includes('.') || name == '') return false
  let labelHash = crypto.keccak256(ByteArray.fromUTF8(name))

  // namehash('eth') = 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae
  let nameNode = ByteArray.fromHexString(
    '0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
  )

  let nameHash = crypto.keccak256(concatByteArrays(nameNode, labelHash)).toHexString()
  return nameHash == node ? true : false
}

/**
 * @dev Checks if the name provided is actually owned by the graph account.
 * @param graphAccount - Graph Account ID
 * @param node - ENS node (i.e. this function only works for ens right now)
 * @returns - true if name is verified
 */
function verifyNameOwnership(graphAccount: string, node: Bytes): boolean {
  let ens = ENS.bind(Address.fromHexString(addresses.ens) as Address)
  let ownerOnENS = ens.try_owner(node)
  if (ownerOnENS.reverted == true) {
    log.warning('Try owner reverted for node: {}', [node.toHexString()])
    return false
  } else {
    return ownerOnENS.value.toHexString() == graphAccount ? true : false
  }
}

/**
 * @dev Create the graph account name if it has not been created.
 * In the future when there are multiple name systems, de-duplication will have
 * to be added to the resolver
 */
function createGraphAccountName(
  id: string,
  nameSystem: string,
  name: string,
  graphAccount: string,
): void {
  let graphAccountName = GraphAccountName.load(id)
  // This name is new, so lets register it
  if (graphAccountName == null) {
    graphAccountName = new GraphAccountName(id)
    graphAccountName.nameSystem = nameSystem
    graphAccountName.name = name
    graphAccountName.graphAccount = graphAccount
    graphAccountName.save()
    // check that this name is not already used by another graph account (changing ownership)
    // If so, remove the old owner, and set the new one
  } else if (graphAccountName.graphAccount != graphAccount) {
    // Set defaultDisplayName to null if they lost ownership of this name
    let oldGraphAccount = GraphAccount.load(graphAccountName.graphAccount)
    oldGraphAccount.defaultDisplayName = null
    oldGraphAccount.save()

    graphAccountName.graphAccount = graphAccount
    graphAccountName.save()
  }
}

export function joinID(pieces: Array<string>): string {
  return pieces.join('-')
}

function min(a: BigDecimal, b: BigDecimal): BigDecimal {
  return a < b ? a : b
}

function max(a: BigDecimal, b: BigDecimal): BigDecimal {
  return a > b ? a : b
}

export function calculateOwnStakeRatio(indexer: Indexer): BigDecimal {
  let stakedTokensBD = indexer.stakedTokens.toBigDecimal()
  let delegatedTokensBD = indexer.delegatedTokens.toBigDecimal()
  let graphNetwork = createOrLoadGraphNetwork()
  let delegationRatioBD = BigInt.fromI32(graphNetwork.delegationRatio).toBigDecimal()
  let maxPossibleTotalUsable = stakedTokensBD + stakedTokensBD * delegationRatioBD
  let currentTotalStake = stakedTokensBD + delegatedTokensBD
  let totalUsable = min(maxPossibleTotalUsable, currentTotalStake)
  return totalUsable == BigDecimal.fromString('0')
    ? BigDecimal.fromString('0')
    : stakedTokensBD / totalUsable
}

export function calculateDelegatedStakeRatio(indexer: Indexer): BigDecimal {
  // If own stake ratio is 0 it's because there's no usable stake, so we can't say that delegStakeRatio is 100%.
  // Also, own stake ratio can't be less than 0.0588 with the current delegationRatio, and even if it changes
  // it can never be 0 and have delegations.
  return indexer.ownStakeRatio == BigDecimal.fromString('0')
    ? BigDecimal.fromString('0')
    : BigDecimal.fromString('1') - indexer.ownStakeRatio
}

export function calculateIndexingRewardEffectiveCut(indexer: Indexer): BigDecimal {
  let delegatorCut =
    BigInt.fromI32(1000000 - indexer.indexingRewardCut).toBigDecimal() /
    BigDecimal.fromString('1000000')
  return indexer.delegatedStakeRatio == BigDecimal.fromString('0')
    ? BigDecimal.fromString('0')
    : BigDecimal.fromString('1') - delegatorCut / indexer.delegatedStakeRatio
}

export function calculateQueryFeeEffectiveCut(indexer: Indexer): BigDecimal {
  let delegatorCut =
    BigInt.fromI32(1000000 - indexer.queryFeeCut).toBigDecimal() / BigDecimal.fromString('1000000')
  return indexer.delegatedStakeRatio == BigDecimal.fromString('0')
    ? BigDecimal.fromString('0')
    : BigDecimal.fromString('1') - delegatorCut / indexer.delegatedStakeRatio
}

export function calculateIndexerRewardOwnGenerationRatio(indexer: Indexer): BigDecimal {
  let rewardCut =
    BigInt.fromI32(indexer.indexingRewardCut).toBigDecimal() / BigDecimal.fromString('1000000')
  return indexer.ownStakeRatio == BigDecimal.fromString('0')
    ? BigDecimal.fromString('0')
    : rewardCut / indexer.ownStakeRatio
}

export function calculateOverdelegationDilution(indexer: Indexer): BigDecimal {
  let stakedTokensBD = indexer.stakedTokens.toBigDecimal()
  let delegatedTokensBD = indexer.delegatedTokens.toBigDecimal()
  let graphNetwork = createOrLoadGraphNetwork()
  let delegationRatioBD = BigInt.fromI32(graphNetwork.delegationRatio).toBigDecimal()
  let maxDelegatedStake = stakedTokensBD * delegationRatioBD
  return stakedTokensBD == BigDecimal.fromString('0')
    ? BigDecimal.fromString('0')
    : BigDecimal.fromString('1') - maxDelegatedStake / max(maxDelegatedStake, delegatedTokensBD)
}

export function updateAdvancedIndexerMetrics(indexer: Indexer): Indexer {
  indexer.ownStakeRatio = calculateOwnStakeRatio(indexer as Indexer)
  indexer.delegatedStakeRatio = calculateDelegatedStakeRatio(indexer as Indexer)
  indexer.indexingRewardEffectiveCut = calculateIndexingRewardEffectiveCut(indexer as Indexer)
  indexer.queryFeeEffectiveCut = calculateQueryFeeEffectiveCut(indexer as Indexer)
  indexer.indexerRewardsOwnGenerationRatio = calculateIndexerRewardOwnGenerationRatio(
    indexer as Indexer,
  )
  indexer.overDelegationDilution = calculateOverdelegationDilution(indexer as Indexer)
  return indexer as Indexer
}

export function updateDelegationExchangeRate(indexer: Indexer): Indexer {
  indexer.delegationExchangeRate = indexer.delegatedTokens
    .toBigDecimal()
    .div(indexer.delegatorShares.toBigDecimal())
    .truncate(18)
  return indexer as Indexer
}

export function compoundId(idA: string, idB: string): string {
  return idA.concat('-').concat(idB)
}

export function batchUpdateDelegatorsForIndexer(indexer: Indexer): void {
  // pre-calculates a lot of data for all delegators that exists for a specific indexer
  // using already existing links with the indexer-delegatedStake relations
  let dailyDataId = indexer.latestDailyData
  for (let i = 0; i < indexer.delegatorsCount.toI32(); i++) {
    let latestRelationId = compoundId(dailyDataId, BigInt.fromI32(i).toString())
    let latestRelation = IndexerDelegatedStakeDailyRelation.load(latestRelationId)
    let delegatedStake = DelegatedStake.load(latestRelation.stake)
    delegatedStake.latestIndexerExchangeRate = indexer.delegationExchangeRate;
    delegatedStake.currentDelegation = delegatedStake.latestIndexerExchangeRate * delegatedStake.shareAmount.toBigDecimal()
    delegatedStake.unrealizedRewards =  delegatedStake.currentDelegation - delegatedStake.originalDelegation

    delegatedStake.save();
  }
}

export function getAndUpdateIndexerDailyData(entity: Indexer, timestamp: BigInt): IndexerDailyData {
  let dayNumber = timestamp.toI32() / SECONDS_PER_DAY - LAUNCH_DAY
  let id = compoundId(entity.id, BigInt.fromI32(dayNumber).toString())
  let dailyData = IndexerDailyData.load(id)

  if (dailyData == null) {
    dailyData = new IndexerDailyData(id)

    dailyData.dayStart = BigInt.fromI32((timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY)
    dailyData.dayEnd = dailyData.dayStart + BigInt.fromI32(SECONDS_PER_DAY)
    dailyData.dayNumber = dayNumber
    dailyData.indexer = entity.id
    dailyData.netDailyDelegatedTokens = BigInt.fromI32(0)
    dailyData.delegatorsCount = BigInt.fromI32(0)

    if (entity.latestDailyData != null) {
      let previousDailyData = IndexerDailyData.load(entity.latestDailyData)
      dailyData.delegatorsCount = previousDailyData.delegatorsCount

      for (let i = 0; i < previousDailyData.delegatorsCount.toI32(); i++) {
        let toCopyId = compoundId(previousDailyData.id, BigInt.fromI32(i).toString())
        let copyId = compoundId(dailyData.id, BigInt.fromI32(i).toString())
        let toCopy = IndexerDelegatedStakeDailyRelation.load(toCopyId)
        let copy = new IndexerDelegatedStakeDailyRelation(copyId)
        copy.dayStart = dailyData.dayStart
        copy.dayEnd = dailyData.dayEnd
        copy.dayNumber = dailyData.dayNumber
        copy.indexerDailyData = dailyData.id
        copy.delegatedStakeDailyData = toCopy.delegatedStakeDailyData
        copy.indexer = toCopy.indexer
        copy.delegator = toCopy.delegator
        copy.stake = toCopy.stake

        copy.save()
      }
    }

    entity.latestDailyData = dailyData.id
  }

  dailyData.stakedTokens = entity.stakedTokens
  dailyData.delegatedTokens = entity.delegatedTokens
  dailyData.allocatedTokens = entity.allocatedTokens
  dailyData.availableStake = entity.availableStake
  dailyData.queryFeesCollected = entity.queryFeesCollected
  dailyData.queryFeeRebates = entity.queryFeeRebates
  dailyData.delegatorQueryFees = entity.delegatorQueryFees
  dailyData.totalIndexingRewards = entity.rewardsEarned
  dailyData.indexerIndexingRewards = entity.indexerIndexingRewards
  dailyData.delegatorIndexingRewards = entity.delegatorIndexingRewards
  dailyData.delegationExchangeRate = entity.delegationExchangeRate

  entity.delegatorsCount = dailyData.delegatorsCount

  entity.save()
  dailyData.save()

  return dailyData as IndexerDailyData
}

export function compareDelegatedStakeDailyDataID(idStakeA: String, idStakeB: String): boolean {
  let arrayA = idStakeA.split('-')
  let arrayB = idStakeB.split('-')
  return arrayA[0] == arrayB[0] && arrayA[1] == arrayB[1]
}

export function getAndUpdateDelegatedStakeDailyData(
  stakeEntity: DelegatedStake,
  timestamp: BigInt,
): DelegatedStakeDailyData {
  let dayNumber = timestamp.toI32() / SECONDS_PER_DAY - LAUNCH_DAY
  let stakeId = compoundId(stakeEntity.id, BigInt.fromI32(dayNumber).toString())
  let stakeDailyData = DelegatedStakeDailyData.load(stakeId)

  if (stakeDailyData == null) {
    stakeDailyData = new DelegatedStakeDailyData(stakeId)

    stakeDailyData.dayStart = BigInt.fromI32(
      (timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY,
    )
    stakeDailyData.dayEnd = stakeDailyData.dayStart + BigInt.fromI32(SECONDS_PER_DAY)
    stakeDailyData.dayNumber = dayNumber
    stakeDailyData.stake = stakeEntity.id
  }

  stakeDailyData.stakedTokens = stakeEntity.stakedTokens
  stakeDailyData.lockedTokens = stakeEntity.lockedTokens
  stakeDailyData.shareAmount = stakeEntity.shareAmount
  stakeDailyData.personalExchangeRate = stakeEntity.personalExchangeRate

  stakeDailyData.save()

  return stakeDailyData as DelegatedStakeDailyData
}

export function getAndUpdateDelegatorDailyData(
  entity: Delegator,
  stakeDailyData: DelegatedStakeDailyData,
  timestamp: BigInt,
): DelegatorDailyData {
  let dayNumber = timestamp.toI32() / SECONDS_PER_DAY - LAUNCH_DAY
  let id = compoundId(entity.id, BigInt.fromI32(dayNumber).toString())
  let dailyData = DelegatorDailyData.load(id)

  let dayStart = BigInt.fromI32((timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY)
  let dayEnd = stakeDailyData.dayStart + BigInt.fromI32(SECONDS_PER_DAY)

  if (dailyData == null) {
    dailyData = new DelegatorDailyData(id)

    dailyData.dayStart = dayStart
    dailyData.dayEnd = dayEnd
    dailyData.dayNumber = dayNumber
    dailyData.delegator = entity.id
    dailyData.stakesCount = BigInt.fromI32(0)

    if (entity.latestDailyData != null) {
      let stakeAlreadyExisted = false
      let previousDailyData = DelegatorDailyData.load(entity.latestDailyData)
      dailyData.stakesCount = previousDailyData.stakesCount

      for (let i = 0; i < previousDailyData.stakesCount.toI32(); i++) {
        let toCopyId = compoundId(previousDailyData.id, BigInt.fromI32(i).toString())
        let copyId = compoundId(dailyData.id, BigInt.fromI32(i).toString())
        let toCopy = DelegatorDelegatedStakeDailyRelation.load(toCopyId)
        let copy = new DelegatorDelegatedStakeDailyRelation(copyId)
        copy.dayStart = dailyData.dayStart
        copy.dayEnd = dailyData.dayEnd
        copy.dayNumber = dailyData.dayNumber
        copy.delegatorDailyData = dailyData.id
        copy.delegator = toCopy.delegator
        copy.stake = toCopy.stake

        if (compareDelegatedStakeDailyDataID(toCopy.delegatedStakeDailyData, stakeDailyData.id)) {
          copy.delegatedStakeDailyData = stakeDailyData.id
          stakeAlreadyExisted = true
        } else {
          copy.delegatedStakeDailyData = toCopy.delegatedStakeDailyData
        }

        copy.save()
      }

      if (!stakeAlreadyExisted) {
        let relationId = compoundId(dailyData.id, dailyData.stakesCount.toString())
        let relation = new DelegatorDelegatedStakeDailyRelation(relationId)
        relation.dayStart = dailyData.dayStart
        relation.dayEnd = dailyData.dayEnd
        relation.dayNumber = dailyData.dayNumber
        relation.delegatorDailyData = dailyData.id
        relation.delegatedStakeDailyData = stakeDailyData.id
        relation.delegator = entity.id
        relation.stake = stakeDailyData.stake
        relation.save()

        dailyData.stakesCount = dailyData.stakesCount.plus(BigInt.fromI32(1))
      }
    } else {
      let relationId = compoundId(dailyData.id, BigInt.fromI32(0).toString())
      let relation = new DelegatorDelegatedStakeDailyRelation(relationId)
      relation.dayStart = dailyData.dayStart
      relation.dayEnd = dailyData.dayEnd
      relation.dayNumber = dailyData.dayNumber
      relation.delegatorDailyData = dailyData.id
      relation.delegatedStakeDailyData = stakeDailyData.id
      relation.delegator = entity.id
      relation.stake = stakeDailyData.stake
      relation.save()

      dailyData.stakesCount = dailyData.stakesCount.plus(BigInt.fromI32(1))
    }

    entity.latestDailyData = dailyData.id
  } else {
    let stakeAlreadyExisted = false
    for (let i = 0; i < dailyData.stakesCount.toI32(); i++) {
      let possibleRelationId = compoundId(dailyData.id, BigInt.fromI32(i).toString())
      let possibleRelation = DelegatorDelegatedStakeDailyRelation.load(possibleRelationId)

      if (
        compareDelegatedStakeDailyDataID(
          possibleRelation.delegatedStakeDailyData,
          stakeDailyData.id,
        )
      ) {
        possibleRelation.delegatedStakeDailyData = stakeDailyData.id
        stakeAlreadyExisted = true
        possibleRelation.save()
        break
      }
    }

    if (!stakeAlreadyExisted) {
      let relationId = compoundId(dailyData.id, dailyData.stakesCount.toString())
      let relation = new DelegatorDelegatedStakeDailyRelation(relationId)
      relation.dayStart = dailyData.dayStart
      relation.dayEnd = dailyData.dayEnd
      relation.dayNumber = dailyData.dayNumber
      relation.delegatorDailyData = dailyData.id
      relation.delegatedStakeDailyData = stakeDailyData.id
      relation.delegator = entity.id
      relation.stake = stakeDailyData.stake
      relation.save()

      dailyData.stakesCount = dailyData.stakesCount.plus(BigInt.fromI32(1))
    }
  }

  dailyData.stakedTokens = entity.stakedTokens
  dailyData.lockedTokens = entity.lockedTokens

  dailyData.save()

  entity.save()

  return dailyData as DelegatorDailyData
}

export function updateIndexerDelegatedStakeRelation(
  dailyData: IndexerDailyData,
  stakeDailyData: DelegatedStakeDailyData,
): void {
  let stakeAlreadyExisted = false
  for (let i = 0; i < dailyData.delegatorsCount.toI32(); i++) {
    let possibleRelationId = compoundId(dailyData.id, BigInt.fromI32(i).toString())
    let possibleRelation = IndexerDelegatedStakeDailyRelation.load(possibleRelationId)

    if (
      compareDelegatedStakeDailyDataID(possibleRelation.delegatedStakeDailyData, stakeDailyData.id)
    ) {
      possibleRelation.delegatedStakeDailyData = stakeDailyData.id
      stakeAlreadyExisted = true
      possibleRelation.save()
      break
    }
  }

  if (!stakeAlreadyExisted) {
    let relationId = compoundId(dailyData.id, dailyData.delegatorsCount.toString())
    let relation = new IndexerDelegatedStakeDailyRelation(relationId)
    relation.dayStart = dailyData.dayStart
    relation.dayEnd = dailyData.dayEnd
    relation.dayNumber = dailyData.dayNumber
    relation.indexerDailyData = dailyData.id
    relation.delegatedStakeDailyData = stakeDailyData.id
    relation.indexer = dailyData.indexer
    relation.delegator = stakeDailyData.id.split('-')[0]
    relation.stake = stakeDailyData.stake
    relation.save()

    let indexer = Indexer.load(dailyData.indexer)

    dailyData.delegatorsCount = dailyData.delegatorsCount.plus(BigInt.fromI32(1))
    indexer.delegatorsCount = dailyData.delegatorsCount

    dailyData.save()
    indexer.save()
  }
}

export function getAndUpdateSubgraphDeploymentDailyData(
  entity: SubgraphDeployment,
  timestamp: BigInt,
): SubgraphDeploymentDailyData {
  let dayId = timestamp.toI32() / SECONDS_PER_DAY - LAUNCH_DAY
  let id = compoundId(entity.id, BigInt.fromI32(dayId).toString())
  let dailyData = SubgraphDeploymentDailyData.load(id)

  if (dailyData == null) {
    dailyData = new SubgraphDeploymentDailyData(id)

    dailyData.dayStart = BigInt.fromI32((timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY)
    dailyData.dayEnd = dailyData.dayStart + BigInt.fromI32(SECONDS_PER_DAY)
    dailyData.dayNumber = dayId
  }

  dailyData.signalledTokens = entity.signalledTokens
  dailyData.signalAmount = entity.signalAmount
  dailyData.pricePerShare = entity.pricePerShare
  dailyData.indexingRewardAmount = entity.indexingRewardAmount
  dailyData.indexingIndexerRewardAmount = entity.indexingIndexerRewardAmount
  dailyData.indexingDelegatorRewardAmount = entity.indexingDelegatorRewardAmount
  dailyData.queryFeesAmount = entity.queryFeesAmount
  dailyData.queryFeeRebates = entity.queryFeeRebates
  dailyData.delegatorQueryFees = entity.delegatorQueryFees
  dailyData.curatorFeeRewards = entity.curatorFeeRewards

  dailyData.save()

  return dailyData as SubgraphDeploymentDailyData
}

export function calculatePricePerShare(deployment: SubgraphDeployment): BigDecimal {
  let pricePerShare =
    deployment.signalAmount == BigInt.fromI32(0)
      ? BigDecimal.fromString('0')
      : deployment.signalledTokens
          .toBigDecimal()
          .div(deployment.signalAmount.toBigDecimal())
          .truncate(18)
  return pricePerShare
}
