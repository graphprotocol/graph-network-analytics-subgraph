import { JSONValue, JSONValueKind, BigDecimal } from '@graphprotocol/graph-ts'

/**
 * Make sure the given JSONValue is a string and returns string it contains.
 * Returns blank string otherwise.
 */
export function jsonToString(val: JSONValue | null): string {
  if (val != null && val.kind === JSONValueKind.STRING) {
    return val.toString()
  }
  return ''
}

/**
 * Make sure the given JSONValue is an array of strings and returns
 * It optimistically skips over any values that are not string within the array
 * Returns blank array otherwise
 */
export function jsonToArrayString(val: JSONValue | null): Array<string> {
  if (val != null && val.kind === JSONValueKind.ARRAY) {
    let valArray = val.toArray()
    let result: Array<string>
    for (let i = 0; i < valArray.length; i++) {
      if (valArray[i].kind === JSONValueKind.STRING) result.push(valArray[i].toString())
    }
    return result
  }
  return []
}

export let zeroBD = BigDecimal.fromString('0')
export const LAUNCH_DAY = 18613 // 1608163200 / 86400. 1608163200 = 17 Dec 2020 00:00:00 GMT
export const SECONDS_PER_DAY = 86400

export function max(a: BigDecimal, b: BigDecimal): BigDecimal {
  return a > b ? a : b
}

export function min(a: BigDecimal, b: BigDecimal): BigDecimal {
  return a < b ? a : b
}

export function avoidNegativeRoundingError(number: BigDecimal): BigDecimal {
  return max(number, BigDecimal.fromString('0'))
}
