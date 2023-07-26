import { TransferredDelegationReturnedToDelegator} from '../types/L2Staking/L2Staking'
import { createOrLoadGraphAccount } from './helpers'

/*
    event TransferredDelegationReturnedToDelegator(
        address indexed indexer,
        address indexed delegator,
        uint256 amount
    );
*/
export function handleTransferredDelegationReturnedToDelegator(event: TransferredDelegationReturnedToDelegator): void {
  let graphAccount = createOrLoadGraphAccount(event.params.indexer.toHexString(), event.block.timestamp)
  graphAccount.balanceReceivedFromL1Delegation = graphAccount.balanceReceivedFromL1Delegation.plus(event.params.amount)
  graphAccount.save()
}
