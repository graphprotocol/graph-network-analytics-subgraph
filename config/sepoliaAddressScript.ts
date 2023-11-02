import * as fs from 'fs'
import * as mustache from 'mustache'
import * as networkAddresses from '@graphprotocol/contracts/addresses.json'
import { Addresses } from './addresses.template'

// mustache doesn't like numbered object keys
let renameAddresses: any = networkAddresses
renameAddresses['sepolia'] = networkAddresses['11155111']

export let addresses: Addresses = {
  controller: '{{sepolia.Controller.address}}',
  graphToken: '{{sepolia.GraphToken.address}}',
  epochManager: '{{sepolia.EpochManager.address}}',
  disputeManager: '{{sepolia.DisputeManager.address}}',
  staking: '{{sepolia.L1Staking.address}}',
  curation: '{{sepolia.Curation.address}}',
  rewardsManager: '{{sepolia.RewardsManager.address}}',
  serviceRegistry: '{{sepolia.ServiceRegistry.address}}',
  gns: '{{sepolia.L1GNS.address}}',
  ens: '{{sepolia.IENS.address}}',
  ensPublicResolver: '{{sepolia.IPublicResolver.address}}',
  blockNumber: '',
  network: '',
  subgraphNFT: '{{sepolia.SubgraphNFT.address}}',
  isL1: true,
}

const main = (): void => {
  try {
    let output = JSON.parse(mustache.render(JSON.stringify(addresses), renameAddresses))
    output.blockNumber = '4454000'
    output.network = 'sepolia'
    if(output.ens == '') {
      output.ens = '0x0000000000000000000000000000000000000000' // to avoid crashes due to bad config
    }
    fs.writeFileSync(__dirname + '/generatedAddresses.json', JSON.stringify(output, null, 2))
  } catch (e) {
    console.log(`Error saving artifacts: ${e.message}`)
  }
}

main()
