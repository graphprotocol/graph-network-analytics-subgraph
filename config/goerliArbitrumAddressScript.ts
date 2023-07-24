import * as fs from 'fs'
import * as mustache from 'mustache'
import * as networkAddresses from '@graphprotocol/contracts/addresses.json'
import { Addresses } from './addresses.template'

// mustache doesn't like numbered object keys
let renameAddresses: any = networkAddresses
renameAddresses['arbitrum-goerli'] = networkAddresses['421613']

export let addresses: Addresses = {
  controller: '{{arbitrum-goerli.Controller.address}}',
  graphToken: '{{arbitrum-goerli.L2GraphToken.address}}',
  epochManager: '{{arbitrum-goerli.EpochManager.address}}',
  disputeManager: '{{arbitrum-goerli.DisputeManager.address}}',
  staking: '{{arbitrum-goerli.L2Staking.address}}',
  curation: '{{arbitrum-goerli.Curation.address}}',
  rewardsManager: '{{arbitrum-goerli.RewardsManager.address}}',
  serviceRegistry: '{{arbitrum-goerli.ServiceRegistry.address}}',
  gns: '{{arbitrum-goerli.L2GNS.address}}',
  ens: '{{arbitrum-goerli.IENS.address}}',
  ensPublicResolver: '{{arbitrum-goerli.IPublicResolver.address}}',
  blockNumber: '',
  network: '',
  subgraphNFT: '{{arbitrum-goerli.SubgraphNFT.address}}',
  isL1: false,
}

const main = (): void => {
  try {
    let output = JSON.parse(mustache.render(JSON.stringify(addresses), renameAddresses))
    output.blockNumber = '1023264' // Hardcoded from first contract deploy of the latest phase
    output.network = 'arbitrum-goerli'
    if(output.ens == '') {
      output.ens = '0x0000000000000000000000000000000000000000' // to avoid crashes due to bad config
    }
    fs.writeFileSync(__dirname + '/generatedAddresses.json', JSON.stringify(output, null, 2))
  } catch (e) {
    console.log(`Error saving artifacts: ${e.message}`)
  }
}

main()
