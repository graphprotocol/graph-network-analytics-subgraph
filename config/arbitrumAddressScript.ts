import * as fs from 'fs'
import * as mustache from 'mustache'
import * as networkAddresses from '@graphprotocol/contracts/addresses.json'
import { Addresses } from './addresses.template'

// mustache doesn't like numbered object keys
let renameAddresses: any = networkAddresses
renameAddresses['arbitrum'] = networkAddresses['42161']

export let addresses: Addresses = {
  controller: '{{arbitrum.Controller.address}}',
  graphToken: '{{arbitrum.GraphToken.address}}',
  epochManager: '{{arbitrum.EpochManager.address}}',
  disputeManager: '{{arbitrum.DisputeManager.address}}',
  staking: '{{arbitrum.Staking.address}}',
  curation: '{{arbitrum.Curation.address}}',
  rewardsManager: '{{arbitrum.RewardsManager.address}}',
  serviceRegistry: '{{arbitrum.ServiceRegistry.address}}',
  gns: '{{arbitrum.GNS.address}}',
  ens: '{{arbitrum.IENS.address}}',
  ensPublicResolver: '{{arbitrum.IPublicResolver.address}}',
  blockNumber: '',
  network: '',
  subgraphNFT: '{{arbitrum.SubgraphNFT.address}}',
}

const main = (): void => {
  try {
    let output = JSON.parse(mustache.render(JSON.stringify(addresses), renameAddresses))
    output.blockNumber = '42440000' // Hardcoded a few thousand blocks before 1st contract deployed
    output.network = 'arbitrum-one'
    fs.writeFileSync(__dirname + '/generatedAddresses.json', JSON.stringify(output, null, 2))
  } catch (e) {
    console.log(`Error saving artifacts: ${e.message}`)
  }
}

main()
