import Big from 'big.js'
import type { Eth } from '@/contracts'

// Aritmética de ETH com big.js: valores entram e saem como string decimal, sem passar por float.

/** Notação decimal normal, sem expoente e sem zeros à direita. */
const toEth = (value: Big): Eth => value.toFixed()

export const money = {
  sum: (values: Eth[]) => toEth(values.reduce((total, value) => total.plus(value), new Big(0))),
  times: (value: Eth, factor: number | Eth) => toEth(new Big(value).times(factor)),
  minus: (value: Eth, subtrahend: Eth) => toEth(new Big(value).minus(subtrahend)),
  /** Percentual arredondado para baixo em 6 casas (o desconto nunca excede o devido). */
  percentOf: (value: Eth, percent: number) => toEth(new Big(value).times(percent).div(100).round(6, Big.roundDown)),
  round: (value: Eth, decimals: number) => toEth(new Big(value).round(decimals, Big.roundHalfUp)),
  compare: (a: Eth, b: Eth) => new Big(a).cmp(b),
  equals: (a: Eth, b: Eth) => new Big(a).eq(b),
}
