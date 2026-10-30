import Big from 'big.js'
import type { Category, Eth, Network, WalletType } from '@/contracts'

/** "1.19 ETH": ponto decimal como no layout, mínimo de 2 casas, sem perder precisão. */
export function formatEth(value: Eth) {
  const decimals = Math.max(2, value.split('.')[1]?.length ?? 0)
  return `${new Big(value).toFixed(decimals)} ETH`
}

/** "0,02": vírgula decimal, usado no rótulo da faixa de preço. */
export function formatEthPlain(value: Eth) {
  return new Big(value).toFixed(2).replace('.', ',')
}

export const CATEGORY_LABELS: Record<Category, string> = {
  'digital-art': 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  '3d-art': 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  gaming: 'Jogos',
  subscriptions: 'Assinaturas',
  utility: 'Utilidade',
}

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const WALLET_LABELS: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

/** "0xA91F…E82C" */
export const shortHash = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`
