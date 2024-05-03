import { json, Bytes, dataSource, JSONValueKind, log } from '@graphprotocol/graph-ts'
import { GraphAccountMetadata } from '../types/schema'
import { jsonToString } from './utils'

export function handleGraphAccountMetadata(content: Bytes): void {
  let id = dataSource.context().getBytes('id')
  let graphAccountMetadata = new GraphAccountMetadata(id)
  let tryData = json.try_fromBytes(content)
  if (tryData.isOk) {
    let data = tryData.value.toObject()
    graphAccountMetadata.codeRepository = jsonToString(data.get('codeRepository'))
    graphAccountMetadata.description = jsonToString(data.get('description'))
    graphAccountMetadata.image = jsonToString(data.get('image'))
    graphAccountMetadata.displayName = jsonToString(data.get('displayName'))
    let isOrganization = data.get('isOrganization')
    if (isOrganization != null && isOrganization.kind === JSONValueKind.BOOL) {
      graphAccountMetadata.isOrganization = isOrganization.toBool()
    }
    graphAccountMetadata.website = jsonToString(data.get('website'))
    graphAccountMetadata.save()
  }
}
