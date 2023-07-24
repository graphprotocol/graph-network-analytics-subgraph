import * as fs from 'fs'
import * as mustache from 'mustache'
import * as networkAddresses from '@graphprotocol/contracts/addresses.json'
import { Addresses } from './addresses.template'

// mustache doesn't like numbered object keys
let renameAddresses: any = networkAddresses
renameAddresses['goerli'] = networkAddresses['5']

export let addresses: Addresses = {
  controller: '{{goerli.Controller.address}}',
  graphToken: '{{goerli.GraphToken.address}}',
  epochManager: '{{goerli.EpochManager.address}}',
  disputeManager: '{{goerli.DisputeManager.address}}',
  staking: '{{goerli.L1Staking.address}}',
  curation: '{{goerli.Curation.address}}',
  rewardsManager: '{{goerli.RewardsManager.address}}',
  serviceRegistry: '{{goerli.ServiceRegistry.address}}',
  gns: '{{goerli.L1GNS.address}}',
  ens: '{{goerli.IENS.address}}',
  ensPublicResolver: '{{goerli.IPublicResolver.address}}',
  blockNumber: '',
  network: '',
  subgraphNFT: '{{goerli.SubgraphNFT.address}}',
  isL1: true,
}

const main = (): void => {
  try {
    let output = JSON.parse(mustache.render(JSON.stringify(addresses), renameAddresses))
    output.blockNumber = '7210000' // Hardcoded from first contract deploy of the latest phase
    output.network = 'goerli'
    if(output.ens == '') {
      output.ens = '0x0000000000000000000000000000000000000000' // to avoid crashes due to bad config
    }
    fs.writeFileSync(__dirname + '/generatedAddresses.json', JSON.stringify(output, null, 2))
  } catch (e) {
    console.log(`Error saving artifacts: ${e.message}`)
  }
}

main()
