import { BigInt, ByteArray, Address, Bytes, crypto, log, BigDecimal } from '@graphprotocol/graph-ts'
import {
  SubgraphDeployment,
  GraphNetwork,
  GraphAccount,
  GraphAccountName,
  Indexer,
  Pool,
  Curator,
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
  IndexerDelegatedStakeRelation,
  GraphNetworkDailyData,
} from '../types/schema'
import { ENS } from '../types/GNS/ENS'
import { addresses } from '../../config/addresses'
import { LAUNCH_DAY, SECONDS_PER_DAY, avoidNegativeRoundingError } from './utils'

let bytesSeparator = Bytes.fromHexString('0xABCDEF')
export let BIGINT_ZERO = BigInt.fromI32(0)
export let BIGINT_ONE = BigInt.fromI32(1)
export let BIGDECIMAL_ZERO = BigDecimal.fromString('0')
export let BIGDECIMAL_ONE = BigDecimal.fromString('1')

export function createOrLoadGraphAccount(id: Bytes, timeStamp: BigInt): GraphAccount {
  let graphAccount = GraphAccount.load(id)
  if (graphAccount == null) {
    graphAccount = new GraphAccount(id)
    graphAccount.createdAt = timeStamp.toI32()
    graphAccount.operators = []
    graphAccount.balance = BIGINT_ZERO
    graphAccount.balanceReceivedFromL1Delegation = BIGINT_ZERO
    graphAccount.balanceReceivedFromL1Signalling = BIGINT_ZERO
    graphAccount.curationApproval = BIGINT_ZERO
    graphAccount.stakingApproval = BIGINT_ZERO
    graphAccount.gnsApproval = BIGINT_ZERO
    //graphAccount.subgraphQueryFees = BIGINT_ZERO
    graphAccount.save()
  }
  return graphAccount as GraphAccount
}

export function createOrLoadSubgraph(
  bigIntID: BigInt,
  owner: Address,
  timestamp: BigInt,
): Subgraph {
  let subgraphID = convertBigIntSubgraphIDToBase58(bigIntID)
  let subgraph = Subgraph.load(subgraphID)
  if (subgraph == null) {
    subgraph = new Subgraph(subgraphID)
    subgraph.owner = owner
    subgraph.createdAt = timestamp.toI32()
    subgraph.updatedAt = timestamp.toI32()
    subgraph.versionCount = BIGINT_ZERO
    subgraph.active = true
    subgraph.startedTransferToL2 = false
    subgraph.transferredToL2 = false
    subgraph.migrated = false
    subgraph.initializing = false
    subgraph.nftID = bigIntID.toString()
    subgraph.entityVersion = 2

    subgraph.signalledTokens = BIGINT_ZERO
    subgraph.unsignalledTokens = BIGINT_ZERO
    subgraph.nameSignalAmount = BIGINT_ZERO
    subgraph.reserveRatio = 0
    subgraph.withdrawableTokens = BIGINT_ZERO
    subgraph.withdrawnTokens = BIGINT_ZERO
    subgraph.signalledTokensSentToL2 = BIGINT_ZERO
    subgraph.signalledTokensReceivedOnL2 = BIGINT_ZERO

    subgraph.save()

    let graphNetwork = createOrLoadGraphNetwork()
    graphNetwork.subgraphCount = graphNetwork.subgraphCount + 1
    graphNetwork.save()
  }
  return subgraph as Subgraph
}

export function createOrLoadSubgraphDeployment(
  subgraphID: Bytes,
  timestamp: BigInt,
): SubgraphDeployment {
  let graphNetwork = createOrLoadGraphNetwork()
  let deployment = SubgraphDeployment.load(subgraphID)
  if (deployment == null) {
    deployment = new SubgraphDeployment(subgraphID)
    deployment.createdAt = timestamp.toI32()
    deployment.stakedTokens = BIGINT_ZERO
    deployment.indexingRewardAmount = BIGINT_ZERO
    deployment.indexingIndexerRewardAmount = BIGINT_ZERO
    deployment.indexingDelegatorRewardAmount = BIGINT_ZERO
    deployment.queryFeesAmount = BIGINT_ZERO
    deployment.queryFeeRebates = BIGINT_ZERO
    deployment.delegatorQueryFees = BIGINT_ZERO
    deployment.curatorFeeRewards = BIGINT_ZERO
    deployment.transferredToL2 = false
    deployment.signalledTokensSentToL2 = BIGINT_ZERO
    deployment.signalledTokensReceivedOnL2 = BIGINT_ZERO

    deployment.signalledTokens = BIGINT_ZERO
    deployment.unsignalledTokens = BIGINT_ZERO
    deployment.signalAmount = BIGINT_ZERO
    deployment.pricePerShare = BIGDECIMAL_ZERO
    deployment.reserveRatio = graphNetwork.defaultReserveRatio
    deployment.deniedAt = 0
    deployment.save()

    graphNetwork.subgraphDeploymentCount = graphNetwork.subgraphDeploymentCount + 1
    graphNetwork.save()
  }
  return deployment as SubgraphDeployment
}

export function createOrLoadIndexer(id: Bytes, timestamp: BigInt): Indexer {
  let indexer = Indexer.load(id)
  if (indexer == null) {
    createOrLoadGraphAccount(id, timestamp)
    indexer = new Indexer(id)
    indexer.createdAt = timestamp.toI32()
    indexer.account = id

    indexer.stakedTokens = BIGINT_ZERO
    indexer.allocatedTokens = BIGINT_ZERO
    indexer.lockedTokens = BIGINT_ZERO
    indexer.unstakedTokens = BIGINT_ZERO
    indexer.tokensLockedUntil = 0
    indexer.queryFeesCollected = BIGINT_ZERO
    indexer.queryFeeRebates = BIGINT_ZERO
    indexer.rewardsEarned = BIGINT_ZERO
    indexer.indexerRewardsOwnGenerationRatio = BIGDECIMAL_ZERO

    indexer.delegatedCapacity = BIGINT_ZERO
    indexer.tokenCapacity = BIGINT_ZERO
    indexer.availableStake = BIGINT_ZERO

    indexer.delegatedTokens = BIGINT_ZERO
    indexer.ownStakeRatio = BIGDECIMAL_ZERO
    indexer.delegatedStakeRatio = BIGDECIMAL_ZERO
    indexer.delegatorShares = BIGINT_ZERO
    indexer.delegationExchangeRate = BIGDECIMAL_ONE
    indexer.indexingRewardCut = 0
    indexer.indexingRewardEffectiveCut = BIGDECIMAL_ZERO
    indexer.overDelegationDilution = BIGDECIMAL_ZERO
    indexer.delegatorIndexingRewards = BIGINT_ZERO
    indexer.indexerIndexingRewards = BIGINT_ZERO
    indexer.delegatorQueryFees = BIGINT_ZERO
    indexer.queryFeeCut = 0
    indexer.queryFeeEffectiveCut = BIGDECIMAL_ZERO
    indexer.delegatorParameterCooldown = 0
    indexer.lastDelegationParameterUpdate = 0
    indexer.forcedClosures = 0
    indexer.allocationCount = 0
    indexer.totalAllocationCount = BIGINT_ZERO

    indexer.transferredToL2 = false
    indexer.stakedTokensTransferredToL2 = BIGINT_ZERO

    indexer.delegatorsCount = BIGINT_ZERO

    let graphNetwork = createOrLoadGraphNetwork()
    graphNetwork.indexerCount = graphNetwork.indexerCount + 1
    graphNetwork.save()

    indexer.save()
  }
  return indexer as Indexer
}

export function createOrLoadDelegator(id: Bytes, timestamp: BigInt): Delegator {
  let delegator = Delegator.load(id)
  if (delegator == null) {
    createOrLoadGraphAccount(id, timestamp)
    delegator = new Delegator(id)
    delegator.account = id
    delegator.stakedTokens = BIGINT_ZERO
    delegator.lockedTokens = BIGINT_ZERO
    delegator.totalStakedTokens = BIGINT_ZERO
    delegator.totalUnstakedTokens = BIGINT_ZERO
    delegator.createdAt = timestamp.toI32()
    delegator.totalRealizedRewards = BIGDECIMAL_ZERO
    delegator.totalUnrealizedRewards = BIGDECIMAL_ZERO
    delegator.originalDelegation = BIGDECIMAL_ZERO
    delegator.currentDelegation = BIGDECIMAL_ZERO
    delegator.stakesCount = 0
    delegator.activeStakesCount = 0
    delegator.save()

    let graphNetwork = createOrLoadGraphNetwork()
    graphNetwork.delegatorCount = graphNetwork.delegatorCount + 1
    graphNetwork.save()
  }
  return delegator as Delegator
}

export function createOrLoadDelegatedStake(
  delegator: Delegator,
  indexer: Bytes,
  timestamp: i32,
): DelegatedStake {
  let id = compoundId(delegator.id, indexer)
  let delegatedStake = DelegatedStake.load(id)

  if (delegatedStake == null) {
    let indexerEntity = Indexer.load(indexer)!
    delegatedStake = new DelegatedStake(id)
    delegatedStake.indexer = indexer
    delegatedStake.delegator = delegator.id
    delegatedStake.stakedTokens = BIGINT_ZERO
    delegatedStake.totalStakedTokens = BIGINT_ZERO
    delegatedStake.totalUnstakedTokens = BIGINT_ZERO
    delegatedStake.lockedTokens = BIGINT_ZERO
    delegatedStake.lockedUntil = 0
    delegatedStake.shareAmount = BIGINT_ZERO
    delegatedStake.transferredToL2 = false
    delegatedStake.stakedTokensTransferredToL2 = BIGINT_ZERO
    delegatedStake.personalExchangeRate = BIGDECIMAL_ONE
    delegatedStake.latestIndexerExchangeRate = BIGDECIMAL_ONE
    delegatedStake.realizedRewards = BIGDECIMAL_ZERO
    delegatedStake.unrealizedRewards = BIGDECIMAL_ZERO
    delegatedStake.originalDelegation = BIGDECIMAL_ZERO
    delegatedStake.currentDelegation = BIGDECIMAL_ZERO
    delegatedStake.createdAt = timestamp
    delegatedStake.relation = id
    delegatedStake.save()

    let relation = new IndexerDelegatedStakeRelation(id) // minimal amount of data to avoid running out of memory
    relation.indexer = indexerEntity.id // only needed for field derivation and active status
    relation.save()

    indexerEntity.delegatorsCount = indexerEntity.delegatorsCount.plus(BIGINT_ONE)
    indexerEntity.save()

    delegator.stakesCount = delegator.stakesCount + 1
    delegator.save()
  }

  return delegatedStake as DelegatedStake
}
export function createOrLoadCurator(id: Bytes, timestamp: BigInt): Curator {
  let curator = Curator.load(id)
  if (curator == null) {
    curator = new Curator(id)
    curator.createdAt = timestamp.toI32()
    curator.totalSignalledTokens = BIGINT_ZERO
    curator.totalUnsignalledTokens = BIGINT_ZERO

    curator.totalNameSignalledTokens = BIGINT_ZERO
    curator.totalNameUnsignalledTokens = BIGINT_ZERO
    curator.totalWithdrawnTokens = BIGINT_ZERO

    curator.realizedRewards = BIGINT_ZERO
    curator.annualizedReturn = BIGDECIMAL_ZERO
    curator.totalReturn = BIGDECIMAL_ZERO
    curator.signalingEfficiency = BIGDECIMAL_ZERO
    curator.totalNameSignalAverageCostBasis = BIGDECIMAL_ZERO
    curator.totalNameSignal = BIGDECIMAL_ZERO
    curator.totalAverageCostBasisPerNameSignal = BIGDECIMAL_ZERO
    curator.save()

    let graphNetwork = createOrLoadGraphNetwork()
    graphNetwork.curatorCount = graphNetwork.curatorCount + 1
    graphNetwork.save()
  }
  return curator as Curator
}

export function createOrLoadSignal(curator: Bytes, subgraphDeploymentID: Bytes): Signal {
  let signalID = compoundId(curator, subgraphDeploymentID)
  let signal = Signal.load(signalID)
  if (signal == null) {
    signal = new Signal(signalID)
    signal.curator = curator
    signal.subgraphDeployment = subgraphDeploymentID
    signal.signalledTokens = BIGINT_ZERO
    signal.unsignalledTokens = BIGINT_ZERO
    signal.signal = BIGINT_ZERO
    signal.lastSignalChange = 0
    signal.realizedRewards = BIGINT_ZERO
    signal.save()
  }
  return signal as Signal
}

export function createOrLoadNameSignal(
  curator: Bytes,
  subgraphID: Bytes,
  timestamp: BigInt,
): NameSignal {
  let nameSignalID = compoundId(curator, subgraphID)
  let nameSignal = NameSignal.load(nameSignalID)
  if (nameSignal == null) {
    nameSignal = new NameSignal(nameSignalID)
    let underlyingCurator = createOrLoadCurator(curator, timestamp)
    nameSignal.entityVersion = 2
    nameSignal.curator = underlyingCurator.id
    nameSignal.subgraph = subgraphID
    nameSignal.signalledTokens = BIGINT_ZERO
    nameSignal.unsignalledTokens = BIGINT_ZERO
    nameSignal.withdrawnTokens = BIGINT_ZERO
    nameSignal.nameSignal = BIGINT_ZERO
    nameSignal.lastNameSignalChange = 0
    nameSignal.realizedRewards = BIGINT_ZERO
    nameSignal.signalledTokensSentToL2 = BIGINT_ZERO
    nameSignal.signalledTokensReceivedOnL2 = BIGINT_ZERO
    nameSignal.transferredToL2 = false
    nameSignal.averageCostBasis = BIGDECIMAL_ZERO
    nameSignal.averageCostBasisPerSignal = BIGDECIMAL_ZERO
    nameSignal.save()
  }
  return nameSignal as NameSignal
}

export function createOrLoadPool(id: BigInt): Pool {
  let pool = Pool.load(changetype<Bytes>(Bytes.fromBigInt(id)))
  if (pool == null) {
    pool = new Pool(changetype<Bytes>(Bytes.fromBigInt(id)))
    pool.allocation = BIGINT_ZERO
    pool.totalQueryFees = BIGINT_ZERO
    pool.claimedFees = BIGINT_ZERO
    pool.curatorRewards = BIGINT_ZERO
    pool.save()
  }
  return pool as Pool
}

export function createOrLoadGraphNetwork(): GraphNetwork {
  let graphNetwork = GraphNetwork.load(Bytes.fromI32(1))
  if (graphNetwork == null) {
    graphNetwork = new GraphNetwork(Bytes.fromI32(1))

    // let contract = GraphNetwork.bind(event.params.a)
    // most of the parameters below are updated in the constructor, or else
    // right after deployment
    graphNetwork.delegationRatio = 0
    graphNetwork.defaultReserveRatio = 0

    graphNetwork.totalTokensStaked = BIGINT_ZERO
    graphNetwork.totalTokensClaimable = BIGINT_ZERO
    graphNetwork.totalUnstakedTokensLocked = BIGINT_ZERO
    graphNetwork.totalTokensAllocated = BIGINT_ZERO
    graphNetwork.totalDelegatedTokens = BIGINT_ZERO

    graphNetwork.totalQueryFees = BIGINT_ZERO
    graphNetwork.totalIndexerQueryFeesCollected = BIGINT_ZERO
    graphNetwork.totalIndexerQueryFeeRebates = BIGINT_ZERO
    graphNetwork.totalDelegatorQueryFeeRebates = BIGINT_ZERO
    graphNetwork.totalCuratorQueryFees = BIGINT_ZERO
    graphNetwork.totalTaxedQueryFees = BIGINT_ZERO
    graphNetwork.totalUnclaimedQueryFeeRebates = BIGINT_ZERO

    graphNetwork.totalIndexingRewards = BIGINT_ZERO
    graphNetwork.totalIndexingIndexerRewards = BIGINT_ZERO
    graphNetwork.totalIndexingDelegatorRewards = BIGINT_ZERO

    graphNetwork.totalTokensSignalled = BIGINT_ZERO

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
  return changetype<ByteArray>(out)
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
  return changetype<ByteArray>(out)
}

export function getVersionNumber(
  graphAccount: Bytes,
  subgraphNumber: Bytes,
  versionNumber: BigInt,
): BigInt {
  // create versionID. start at version 1
  // TODO - should I start it at 0?
  let versionID = joinID([
    graphAccount,
    subgraphNumber,
    changetype<Bytes>(Bytes.fromBigInt(versionNumber)),
  ])
  let version = SubgraphVersion.load(versionID)
  // recursion until you get the right version
  if (version != null) {
    versionNumber = versionNumber.plus(BIGINT_ONE)
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
      let id = joinIDString([nameSystem, node.toHexString()])
      createGraphAccountName(id, nameSystem, name, graphAccount)
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
  let ens = ENS.bind(changetype<Address>(Address.fromHexString(addresses.ens)))
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
  graphAccount: Bytes,
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
  } else if (
    graphAccountName.graphAccount === null ||
    graphAccountName.graphAccount! != graphAccount
  ) {
    // Only update the old graph account if it exists
    if (graphAccountName.graphAccount !== null) {
      // Set defaultDisplayName to null if they lost ownership of this name
      let oldGraphAccount = GraphAccount.load(graphAccountName.graphAccount!)!
      oldGraphAccount.defaultDisplayName = null
      oldGraphAccount.save()
    }

    graphAccountName.graphAccount = graphAccount
    graphAccountName.save()
  }
}

export function joinID(pieces: Array<Bytes>): Bytes {
  return pieces.reduce((acc, elem, index) => {
    return index == 0 ? elem : acc.concat(bytesSeparator).concat(elem)
  }, Bytes.empty())
}

export function joinIDString(pieces: Array<String>): string {
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
  return totalUsable == BIGDECIMAL_ZERO ? BIGDECIMAL_ZERO : stakedTokensBD / totalUsable
}

export function calculateDelegatedStakeRatio(indexer: Indexer): BigDecimal {
  // If own stake ratio is 0 it's because there's no usable stake, so we can't say that delegStakeRatio is 100%.
  // Also, own stake ratio can't be less than 0.0588 with the current delegationRatio, and even if it changes
  // it can never be 0 and have delegations.
  return indexer.ownStakeRatio == BIGDECIMAL_ZERO
    ? BIGDECIMAL_ZERO
    : BIGDECIMAL_ONE - indexer.ownStakeRatio
}

export function calculateIndexingRewardEffectiveCut(indexer: Indexer): BigDecimal {
  let delegatorCut =
    BigInt.fromI32(1000000 - indexer.indexingRewardCut).toBigDecimal() /
    BigDecimal.fromString('1000000')
  return indexer.delegatedStakeRatio == BIGDECIMAL_ZERO
    ? BIGDECIMAL_ZERO
    : BIGDECIMAL_ONE - delegatorCut / indexer.delegatedStakeRatio
}

export function calculateQueryFeeEffectiveCut(indexer: Indexer): BigDecimal {
  let delegatorCut =
    BigInt.fromI32(1000000 - indexer.queryFeeCut).toBigDecimal() / BigDecimal.fromString('1000000')
  return indexer.delegatedStakeRatio == BIGDECIMAL_ZERO
    ? BIGDECIMAL_ZERO
    : BIGDECIMAL_ONE - delegatorCut / indexer.delegatedStakeRatio
}

export function calculateIndexerRewardOwnGenerationRatio(indexer: Indexer): BigDecimal {
  let rewardCut =
    BigInt.fromI32(indexer.indexingRewardCut).toBigDecimal() / BigDecimal.fromString('1000000')
  return indexer.ownStakeRatio == BIGDECIMAL_ZERO
    ? BIGDECIMAL_ZERO
    : rewardCut / indexer.ownStakeRatio
}

export function calculateOverdelegationDilution(indexer: Indexer): BigDecimal {
  let stakedTokensBD = indexer.stakedTokens.toBigDecimal()
  let delegatedTokensBD = indexer.delegatedTokens.toBigDecimal()
  let graphNetwork = createOrLoadGraphNetwork()
  let delegationRatioBD = BigInt.fromI32(graphNetwork.delegationRatio).toBigDecimal()
  let maxDelegatedStake = stakedTokensBD * delegationRatioBD
  return stakedTokensBD == BIGDECIMAL_ZERO
    ? BIGDECIMAL_ZERO
    : BIGDECIMAL_ONE - maxDelegatedStake / max(maxDelegatedStake, delegatedTokensBD)
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

export function compoundId(idA: Bytes, idB: Bytes): Bytes {
  return idA.concat(bytesSeparator).concat(idB)
}

export function batchUpdateDelegatorsForIndexer(indexerId: Bytes, timestamp: BigInt): void {
  // Loading it again here to make sure we have the latest up to date data on the entity.
  let indexer = Indexer.load(indexerId)!
  // pre-calculates a lot of data for all delegators that exists for a specific indexer
  // uses lightweight relation entity to derive the full list. hopefully it doesn't run out of memory on big deleg count indexers
  let relations = indexer.relations.load()

  for (let i = 0; i < relations.length; i++) {
    let delegatedStake = DelegatedStake.load(relations[i].id)!
    let delegator = Delegator.load(delegatedStake.delegator)!
    // Only update core entities if there's a change in the exchange rate
    if (delegatedStake.latestIndexerExchangeRate != indexer.delegationExchangeRate) {
      let oldUnrealizedRewards = delegatedStake.unrealizedRewards

      delegatedStake.latestIndexerExchangeRate = indexer.delegationExchangeRate
      delegatedStake.currentDelegation =
        delegatedStake.latestIndexerExchangeRate.times(delegatedStake.shareAmount.toBigDecimal())
      delegatedStake.unrealizedRewards = avoidNegativeRoundingError(
        delegatedStake.currentDelegation.minus(delegatedStake.originalDelegation),
      )
      delegatedStake.save()

      let diffUnrealized = delegatedStake.unrealizedRewards.minus(oldUnrealizedRewards)

      delegator.totalUnrealizedRewards = avoidNegativeRoundingError(
        delegator.totalUnrealizedRewards.plus(diffUnrealized),
      )
      delegator.currentDelegation = delegator.currentDelegation.plus(diffUnrealized)
      delegator.save()
    }

    getAndUpdateDelegatedStakeDailyData(delegatedStake as DelegatedStake, timestamp)
    getAndUpdateDelegatorDailyData(delegator as Delegator, timestamp)
  }
}

export function getAndUpdateNetworkDailyData(
  entity: GraphNetwork,
  timestamp: BigInt,
): GraphNetworkDailyData {
  let dayNumber = timestamp.toI32() / SECONDS_PER_DAY - LAUNCH_DAY
  let id = compoundId(entity.id, Bytes.fromI32(dayNumber))

  // not checking for previous entity since we don't want to waste a load and data will be overwritten anyways
  let dailyData = new GraphNetworkDailyData(id)
  dailyData.dayStart = BigInt.fromI32((timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY)
  dailyData.dayEnd = dailyData.dayStart.plus(BigInt.fromI32(SECONDS_PER_DAY))
  dailyData.dayNumber = dayNumber
  dailyData.network = entity.id

  dailyData.delegationRatio = entity.delegationRatio
  dailyData.totalTokensStaked = entity.totalTokensStaked
  dailyData.totalUnstakedTokensLocked = entity.totalUnstakedTokensLocked
  dailyData.totalTokensAllocated = entity.totalTokensAllocated
  dailyData.totalDelegatedTokens = entity.totalDelegatedTokens
  dailyData.totalQueryFees = entity.totalQueryFees
  dailyData.totalIndexerQueryFeesCollected = entity.totalIndexerQueryFeesCollected
  dailyData.totalIndexerQueryFeeRebates = entity.totalIndexerQueryFeeRebates
  dailyData.totalDelegatorQueryFeeRebates = entity.totalDelegatorQueryFeeRebates
  dailyData.totalCuratorQueryFees = entity.totalCuratorQueryFees
  dailyData.totalTaxedQueryFees = entity.totalTaxedQueryFees
  dailyData.totalUnclaimedQueryFeeRebates = entity.totalUnclaimedQueryFeeRebates
  dailyData.totalIndexingRewards = entity.totalIndexingRewards
  dailyData.totalIndexingDelegatorRewards = entity.totalIndexingDelegatorRewards
  dailyData.totalIndexingIndexerRewards = entity.totalIndexingIndexerRewards
  dailyData.totalTokensSignalled = entity.totalTokensSignalled
  dailyData.defaultReserveRatio = entity.defaultReserveRatio
  dailyData.indexerCount = entity.indexerCount
  dailyData.stakedIndexersCount = entity.stakedIndexersCount
  dailyData.delegatorCount = entity.delegatorCount
  dailyData.curatorCount = entity.curatorCount
  dailyData.subgraphCount = entity.subgraphCount
  dailyData.subgraphDeploymentCount = entity.subgraphDeploymentCount

  dailyData.save()

  return dailyData as GraphNetworkDailyData
}

export function getAndUpdateIndexerDailyData(entity: Indexer, timestamp: BigInt): IndexerDailyData {
  let dayNumber = timestamp.toI32() / SECONDS_PER_DAY - LAUNCH_DAY
  let id = compoundId(entity.id, Bytes.fromI32(dayNumber))

  // not checking for previous entity since we don't want to waste a load and data will be overwritten anyways
  let dailyData = new IndexerDailyData(id)
  dailyData.dayStart = BigInt.fromI32((timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY)
  dailyData.dayEnd = dailyData.dayStart.plus(BigInt.fromI32(SECONDS_PER_DAY))
  dailyData.dayNumber = dayNumber
  dailyData.indexer = entity.id
  dailyData.netDailyDelegatedTokens = BIGINT_ZERO
  dailyData.delegatorsCount = BIGINT_ZERO

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
  let stakeId = compoundId(stakeEntity.id, Bytes.fromI32(dayNumber))

  // not checking for previous entity since we don't want to waste a load and data will be overwritten anyways
  let stakeDailyData = new DelegatedStakeDailyData(stakeId)
  stakeDailyData.dayStart = BigInt.fromI32(
    (timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY,
  )
  stakeDailyData.dayEnd = stakeDailyData.dayStart.plus(BigInt.fromI32(SECONDS_PER_DAY))
  stakeDailyData.dayNumber = dayNumber
  stakeDailyData.stake = stakeEntity.id
  stakeDailyData.delegator = stakeEntity.delegator
  stakeDailyData.indexer = stakeEntity.indexer

  stakeDailyData.stakedTokens = stakeEntity.stakedTokens
  stakeDailyData.lockedTokens = stakeEntity.lockedTokens
  stakeDailyData.shareAmount = stakeEntity.shareAmount
  stakeDailyData.personalExchangeRate = stakeEntity.personalExchangeRate
  stakeDailyData.latestIndexerExchangeRate = stakeEntity.latestIndexerExchangeRate
  stakeDailyData.unrealizedRewards = stakeEntity.unrealizedRewards
  stakeDailyData.realizedRewards = stakeEntity.realizedRewards
  stakeDailyData.originalDelegation = stakeEntity.originalDelegation
  stakeDailyData.currentDelegation = stakeEntity.currentDelegation

  stakeDailyData.save()

  return stakeDailyData as DelegatedStakeDailyData
}

export function getAndUpdateDelegatorDailyData(
  entity: Delegator,
  timestamp: BigInt,
): DelegatorDailyData {
  let dayNumber = timestamp.toI32() / SECONDS_PER_DAY - LAUNCH_DAY
  let id = compoundId(entity.id, Bytes.fromI32(dayNumber))
  
  // not checking for previous entity since we don't want to waste a load and data will be overwritten anyways
  let dailyData = new DelegatorDailyData(id)
  dailyData.dayStart = BigInt.fromI32((timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY)
  dailyData.dayEnd = dailyData.dayStart.plus(BigInt.fromI32(SECONDS_PER_DAY))
  dailyData.dayNumber = dayNumber
  dailyData.delegator = entity.id

  dailyData.stakesCount = entity.stakesCount
  dailyData.activeStakesCount = entity.activeStakesCount
  dailyData.stakedTokens = entity.stakedTokens
  dailyData.currentDelegation = entity.currentDelegation
  dailyData.lockedTokens = entity.lockedTokens
  dailyData.totalUnrealizedRewards = entity.totalUnrealizedRewards
  dailyData.totalRealizedRewards = entity.totalRealizedRewards

  dailyData.save()

  return dailyData as DelegatorDailyData
}

export function getAndUpdateSubgraphDeploymentDailyData(
  entity: SubgraphDeployment,
  timestamp: BigInt,
): SubgraphDeploymentDailyData {
  let dayId = timestamp.toI32() / SECONDS_PER_DAY - LAUNCH_DAY
  let id = compoundId(entity.id, Bytes.fromI32(dayId))

  // not checking for previous entity since we don't want to waste a load and data will be overwritten anyways
  let dailyData = new SubgraphDeploymentDailyData(id)
  dailyData.dayStart = BigInt.fromI32((timestamp.toI32() / SECONDS_PER_DAY) * SECONDS_PER_DAY)
  dailyData.dayEnd = dailyData.dayStart.plus(BigInt.fromI32(SECONDS_PER_DAY))
  dailyData.dayNumber = dayId
  dailyData.subgraphDeployment = entity.id

  dailyData.stakedTokens = entity.stakedTokens
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
  // TODO check why there's a deviation from the values of the bancor formula
  // Ideally this would be a 1 to 1 recreation of the share sell formula, but due to
  // implementation issues for that formula on AssemblyScript (mainly BigDecimal missing pow implementation)
  // I decided to use an approximation derived from testing.

  // This value could be wrong unfortunately, so we should ideally find a workaround later
  // to implement the actual sell share formula for 1 share.

  // reserve ratio multiplier = MAX_WEIGHT / reserveRatio = 1M (ppm) / reserveRatio
  // HOTFIX for now, if deployment.reserveRatio -> 0, use a known previous default
  let reserveRatioMultiplier = deployment.reserveRatio == 0 ? 2 : 1000000 / deployment.reserveRatio
  let pricePerShare =
    deployment.signalAmount == BIGINT_ZERO
      ? BIGDECIMAL_ZERO
      : deployment.signalledTokens
          .toBigDecimal()
          .div(deployment.signalAmount.toBigDecimal())
          .times(BigInt.fromI32(reserveRatioMultiplier).toBigDecimal())
          .truncate(18)
  return pricePerShare
}

export function convertBigIntSubgraphIDToBase58(bigIntRepresentation: BigInt): Bytes {
  // Might need to unpad the BigInt since `fromUnsignedBytes` pads one byte with a zero.
  // Although for the events where the uint256 is provided, we probably don't need to unpad.
  let hexString = bigIntRepresentation.toHexString()
  if (hexString.length % 2 != 0) {
    log.warning('Hex string not even, hex: {}, original: {}. Padding it to even length', [
      hexString,
      bigIntRepresentation.toString(),
    ])
    hexString = '0x0' + hexString.slice(2)
  }
  let bytes = changetype<Bytes>(ByteArray.fromHexString(hexString))
  return bytes
}

export function getSubgraphID(graphAccount: Address, subgraphNumber: BigInt): BigInt {
  let graphAccountStr = graphAccount.toHexString()
  let subgraphNumberStr = subgraphNumber.toHexString().slice(2)
  let number = subgraphNumberStr.padStart(64, '0')
  let unhashedSubgraphID = graphAccountStr.concat(number)
  let hashedId = Bytes.fromByteArray(crypto.keccak256(ByteArray.fromHexString(unhashedSubgraphID)))
  let bigIntRepresentation = BigInt.fromUnsignedBytes(changetype<Bytes>(hashedId.reverse()))
  return bigIntRepresentation
}

export function getAliasedL2SubgraphID(id: BigInt): BigInt {
  // offset === 0x1111000000000000000000000000000000000000000000000000000000001111 or "7719354826016761135949426780745810995650277145449579228033297493447455805713"
  // base === 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff + 1 or "115792089237316195423570985008687907853269984665640564039457584007913129639936"
  // const expectedL2SubgraphId = l1SubgraphId.add(offset).mod(base)
  let offset = BigInt.fromString(
    '7719354826016761135949426780745810995650277145449579228033297493447455805713',
  )
  let base = BigInt.fromString(
    '115792089237316195423570985008687907853269984665640564039457584007913129639936',
  )
  return id.plus(offset).mod(base)
}

// TODO - this is broken if we change the delegatio ratio
// Need to remove, or find a fix
export function calculateCapacities(indexer: Indexer): Indexer {
  let graphNetwork = createOrLoadGraphNetwork()
  let tokensDelegatedMax = indexer.stakedTokens.times(BigInt.fromI32(graphNetwork.delegationRatio))

  // Eligible to add to the capacity
  indexer.delegatedCapacity =
    indexer.delegatedTokens < tokensDelegatedMax ? indexer.delegatedTokens : tokensDelegatedMax

  indexer.tokenCapacity = indexer.stakedTokens.plus(indexer.delegatedCapacity)
  indexer.availableStake = indexer.tokenCapacity
    .minus(indexer.allocatedTokens)
    .minus(indexer.lockedTokens)
  return indexer
}
