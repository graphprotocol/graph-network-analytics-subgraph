import { Bytes, DataSourceContext } from '@graphprotocol/graph-ts'
import { DIDAttributeChanged } from '../types/EthereumDIDRegistry/EthereumDIDRegistry'
import { GraphAccountMetadata as GraphAccountMetadataTemplate } from '../types/templates'

import { addQm, createOrLoadGraphAccount, joinID } from './helpers'

export function handleDIDAttributeChanged(event: DIDAttributeChanged): void {
  let graphAccount = createOrLoadGraphAccount(event.params.identity, event.block.timestamp)
  // OFFCHAIN_DATANAME = keccak256("GRAPH NAME SERVICE")
  // 0x72abcb436eed911d1b6046bbe645c235ec3767c842eb1005a6da9326c2347e4c
  if (
    event.params.name.toHexString() ==
    '0x72abcb436eed911d1b6046bbe645c235ec3767c842eb1005a6da9326c2347e4c'
  ) {
    // TODO optimization - make this more robust, since value is BYTES not BYTES32, and if someone
    // called it directly, it could crash the subgraph
    let hexHash = changetype<Bytes>(addQm(event.params.value))
    let base58Hash = hexHash.toBase58()
    let metadataId = joinID([
      event.transaction.hash,
      changetype<Bytes>(Bytes.fromBigInt(event.logIndex)),
      graphAccount.id,
      hexHash,
    ])
    graphAccount.metadata = metadataId
    graphAccount.save()

    let context = new DataSourceContext()
    context.setBytes('id', metadataId)
    GraphAccountMetadataTemplate.createWithContext(base58Hash, context)
  }
}
