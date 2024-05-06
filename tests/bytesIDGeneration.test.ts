import { test, assert } from 'matchstick-as/assembly/index'
import { BigInt, Bytes, log } from '@graphprotocol/graph-ts'
import { joinID, joinIDString, compoundId, createOrLoadDelegator } from '../src/mappings/helpers'
import { Delegator } from '../src/types/schema'
test('Bytes id generation', () => {
  let bytesFromBigIntFromI32 = changetype<Bytes>(Bytes.fromBigInt(BigInt.fromI32(1)))
  let delegatorID = changetype<Bytes>(
    Bytes.fromHexString('0x1ffd6f7fcd56e9c4966bdb68aa4a19c13d401371'),
  )
  let bytesFromI32 = changetype<Bytes>(Bytes.fromI32(1))
  let compound1 = compoundId(delegatorID, bytesFromBigIntFromI32)
  let joint1 = joinID([delegatorID, bytesFromBigIntFromI32])
  let compComp1 = compoundId(
    compoundId(delegatorID, bytesFromBigIntFromI32),
    bytesFromBigIntFromI32,
  )
  let jointJoint1 = joinID([delegatorID, bytesFromBigIntFromI32, bytesFromBigIntFromI32])
  let compound2 = compoundId(delegatorID, bytesFromI32)
  let joint2 = joinID([delegatorID, bytesFromI32])
  let compComp2 = compoundId(compoundId(delegatorID, bytesFromI32), bytesFromI32)
  let jointJoint2 = joinID([delegatorID, bytesFromI32, bytesFromI32])
  let delegator = createOrLoadDelegator(delegatorID, BigInt.fromI32(1))
  delegator.lockedTokens = BigInt.fromI32(100000)
  delegator.save()

  let delegReload = Delegator.load(delegator.id)!

  let delegBytesFromI32 = changetype<Bytes>(Bytes.fromI32(100000))
  let delegBytesFromString = changetype<Bytes>(Bytes.fromBigInt(BigInt.fromString('100000')))
  let delegBytesFromEntity = changetype<Bytes>(Bytes.fromBigInt(delegator.lockedTokens))
  let delegBytesFromEntityReload = changetype<Bytes>(Bytes.fromBigInt(delegReload.lockedTokens))

  assert.bytesEquals(
    delegBytesFromEntity,
    delegBytesFromI32,
    'Bytes from entity and I32 differ. Entity: ' +
      delegBytesFromEntity.toHex() +
      ', I32: ' +
      delegBytesFromI32.toHex(),
  )
  assert.assertTrue(delegBytesFromEntityReload !== delegBytesFromI32)
  assert.bytesEquals(
    delegBytesFromEntityReload,
    delegBytesFromString,
    'Bytes from entity reload and String differ. Entity Reload: ' +
      delegBytesFromEntityReload.toHex() +
      ', String: ' +
      delegBytesFromString.toHex(),
  )
  assert.bytesEquals(
    compound1,
    joint1,
    'Simple Compound and Join ID differ. Compound: ' +
      compound1.toHex() +
      ', join: ' +
      joint1.toHex(),
  )
  assert.bytesEquals(
    compComp1,
    jointJoint1,
    'Double Compound and Join ID differ. Compound: ' +
      compComp1.toHex() +
      ', join: ' +
      jointJoint1.toHex(),
  )
  assert.bytesEquals(
    compound2,
    joint2,
    'Simple Compound and Join ID differ. Compound: ' +
      compound1.toHex() +
      ', join: ' +
      joint1.toHex(),
  )
  assert.bytesEquals(
    compComp2,
    jointJoint2,
    'Double Compound and Join ID differ. Compound: ' +
      compComp1.toHex() +
      ', join: ' +
      jointJoint1.toHex(),
  )
  assert.bytesEquals(
    bytesFromBigIntFromI32,
    bytesFromI32,
    'Bytes from I32 and Bytes from BigInt from I32 differ. BigInt: ' +
      bytesFromBigIntFromI32.toHex() +
      ', I32: ' +
      bytesFromI32.toHex(),
  )
})
