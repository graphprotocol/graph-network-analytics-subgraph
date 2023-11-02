import * as fs from 'fs'
import * as mustache from 'mustache'
import * as networkAddresses from '@graphprotocol/contracts/addresses.json'
import { Addresses } from './addresses.template'

// mustache doesn't like numbered object keys
let renameAddresses: any = networkAddresses
renameAddresses['arbsep'] = networkAddresses['421614']

export let addresses: Addresses = {
  controller: '{{arbsep.Controller.address}}',
  graphToken: '{{arbsep.L2GraphToken.address}}',
  epochManager: '{{arbsep.EpochManager.address}}',
  disputeManager: '{{arbsep.DisputeManager.address}}',
  staking: '{{arbsep.L2Staking.address}}',
  curation: '{{arbsep.L2Curation.address}}',
  rewardsManager: '{{arbsep.RewardsManager.address}}',
  serviceRegistry: '{{arbsep.ServiceRegistry.address}}',
  gns: '{{arbsep.L2GNS.address}}',
  ens: '{{arbsep.IENS.address}}',
  ensPublicResolver: '{{arbsep.IPublicResolver.address}}',
  blockNumber: '',
  network: '',
  subgraphNFT: '{{arbsep.SubgraphNFT.address}}',
  isL1: false,
}

const main = (): void => {
  try {
    let output = JSON.parse(mustache.render(JSON.stringify(addresses), renameAddresses))
    output.blockNumber = '570450'
    output.network = 'arbitrum-sepolia'
    if(output.ens == '') {
      output.ens = '0x0000000000000000000000000000000000000000' // to avoid crashes due to bad config
    }
    fs.writeFileSync(__dirname + '/generatedAddresses.json', JSON.stringify(output, null, 2))
  } catch (e) {
    console.log(`Error saving artifacts: ${e.message}`)
  }
}

main()
