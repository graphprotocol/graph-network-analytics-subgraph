import {
  Signalled,
  Burned,
  Collected,
  Curation,
  ParameterUpdated,
} from '../types/Curation/Curation'
import {
  Curator,
  GraphNetwork,
  Signal,
  SubgraphDeployment,
  SignalTransaction,
} from '../types/schema'
import { Address, BigInt, BigDecimal } from '@graphprotocol/graph-ts'

import {
  createOrLoadSignal,
  createOrLoadSubgraphDeployment,
  createOrLoadCurator,
  createOrLoadGraphNetwork,
  joinID,
  getAndUpdateSubgraphDeploymentDailyData,
  calculatePricePerShare,
  getAndUpdateNetworkDailyData,
} from './helpers'

/**
 * @dev handleStaked
 * - updates curator, creates if needed
 * - updates signal, creates if needed
 * - updates subgraph deployment, creates if needed
 */
export function handleSignalled(event: Signalled): void {
  // Update curator
  let id = event.params.curator.toHexString()
  let curator = createOrLoadCurator(id, event.block.timestamp)
  curator.totalSignalledTokens = curator.totalSignalledTokens.plus(
    event.params.tokens.minus(event.params.curationTax),
  )
  curator.save()

  // Update signal
  let subgraphDeploymentID = event.params.subgraphDeploymentID.toHexString()
  let signal = createOrLoadSignal(id, subgraphDeploymentID)
  signal.signalledTokens = signal.signalledTokens.plus(
    event.params.tokens.minus(event.params.curationTax),
  )
  signal.signal = signal.signal.plus(event.params.signal)
  signal.save()

  // Update subgraph deployment
  let deployment = createOrLoadSubgraphDeployment(subgraphDeploymentID, event.block.timestamp)
  deployment.signalledTokens = deployment.signalledTokens.plus(
    event.params.tokens.minus(event.params.curationTax),
  )
  deployment.signalAmount = deployment.signalAmount.plus(event.params.signal)
  deployment.pricePerShare = calculatePricePerShare(deployment as SubgraphDeployment)

  deployment.save()

  // Update graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalTokensSignalled = graphNetwork.totalTokensSignalled.plus(
    event.params.tokens.minus(event.params.curationTax),
  )
  graphNetwork.save()

  // Create n signal tx
  let signalTransaction = new SignalTransaction(
    event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString()),
  )
  signalTransaction.blockNumber = event.block.number.toI32()
  signalTransaction.timestamp = event.block.timestamp.toI32()
  signalTransaction.signer = event.params.curator.toHexString()
  signalTransaction.type = 'MintSignal'
  signalTransaction.signal = event.params.signal
  signalTransaction.tokens = event.params.tokens.minus(event.params.curationTax)
  signalTransaction.withdrawalFees = BigInt.fromI32(0)
  signalTransaction.subgraphDeployment = event.params.subgraphDeploymentID.toHexString()
  signalTransaction.save()

  getAndUpdateSubgraphDeploymentDailyData(deployment as SubgraphDeployment, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}
/**
 * @dev handleRedeemed
 * - updates curator
 * - updates signal
 * - updates subgraph
 */
export function handleBurned(event: Burned): void {
  // Update curator
  let id = event.params.curator.toHexString()
  let curator = Curator.load(id)!
  curator.totalUnsignalledTokens = curator.totalUnsignalledTokens.plus(event.params.tokens)

  // Update signal
  let subgraphDeploymentID = event.params.subgraphDeploymentID.toHexString()
  let signalID = joinID([id, subgraphDeploymentID])
  let signal = Signal.load(signalID)!
  // Note - if you immediately deposited and then withdrew, you would lose 5%, and you were
  // realize this loss by seeing unsignaled tokens being 95 and signalled 100
  signal.unsignalledTokens = signal.unsignalledTokens.plus(event.params.tokens)
  signal.signal = signal.signal.minus(event.params.signal)
  signal.save()

  // Update subgraph
  let deployment = SubgraphDeployment.load(subgraphDeploymentID)!
  deployment.signalledTokens = deployment.signalledTokens.minus(event.params.tokens)
  deployment.signalAmount = deployment.signalAmount.minus(event.params.signal)
  deployment.pricePerShare = calculatePricePerShare(deployment as SubgraphDeployment)
  deployment.save()

  // Update graph network
  let graphNetwork = createOrLoadGraphNetwork()
  graphNetwork.totalTokensSignalled = graphNetwork.totalTokensSignalled.minus(event.params.tokens)
  graphNetwork.save()

  // Create n signal tx
  let signalTransaction = new SignalTransaction(
    event.transaction.hash.toHexString().concat('-').concat(event.logIndex.toString()),
  )
  signalTransaction.blockNumber = event.block.number.toI32()
  signalTransaction.timestamp = event.block.timestamp.toI32()
  signalTransaction.signer = event.params.curator.toHexString()
  signalTransaction.type = 'BurnSignal'
  signalTransaction.signal = event.params.signal
  signalTransaction.tokens = event.params.tokens
  signalTransaction.withdrawalFees = BigInt.fromI32(0)
  signalTransaction.subgraphDeployment = event.params.subgraphDeploymentID.toHexString()
  signalTransaction.save()

  getAndUpdateSubgraphDeploymentDailyData(deployment as SubgraphDeployment, event.block.timestamp)
  getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
}

/**
 * @dev handleParamterUpdated
 * - updates all parameters of curation, depending on string passed. We then can
 *   call the contract directly to get the updated value
 */
 export function handleParameterUpdated(event: ParameterUpdated): void {
   let parameter = event.params.param

   if (parameter == 'defaultReserveRatio') {
     let graphNetwork = createOrLoadGraphNetwork()
     let curation = Curation.bind(event.address)
     graphNetwork.defaultReserveRatio = curation.defaultReserveRatio().toI32()
     graphNetwork.save()
     getAndUpdateNetworkDailyData(graphNetwork as GraphNetwork, event.block.timestamp)
   }
 }

// export function handleImplementationUpdated(event: ImplementationUpdated): void {
//   let graphNetwork = createOrLoadGraphNetwork()
//   let implementations = graphNetwork.curationImplementations
//   implementations.push(event.params.newImplementation)
//   graphNetwork.curationImplementations = implementations
//   graphNetwork.save()
// }
