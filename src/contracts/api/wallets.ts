import { z } from 'zod'
import { IsoDateTime, Network } from '@/contracts/common'

export const WalletSlot = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof WalletSlot>

export const WalletType = z.enum(['metamask', 'walletconnect', 'coinbase'])
export type WalletType = z.infer<typeof WalletType>

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export const WalletInput = z
  .object({
    displayName: z.string().trim().min(1, 'Informe o nome de exibição'),
    alias: z.string().trim().min(1, 'Informe o apelido da carteira'),
    network: Network,
    profileName: z.string().trim().min(1, 'Informe o nome do perfil'),
    address: z.string().trim(),
    /** ENS ou endereço de uma carteira secundária. */
    secondaryAddress: z.string().trim().nullable(),
    type: WalletType,
    referralCode: z.string().trim().min(1, 'Informe o código de indicação'),
    email: z.email('E-mail inválido'),
    ensName: z.string().trim().min(1, 'Informe o nome ENS'),
  })
  .superRefine((wallet, ctx) => {
    const pattern = wallet.network === 'solana' ? SOLANA_ADDRESS : EVM_ADDRESS
    if (!pattern.test(wallet.address)) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'Endereço inválido para a rede selecionada' })
    }
  })
export type WalletInput = z.infer<typeof WalletInput>

export const Wallet = WalletInput.safeExtend({
  slot: WalletSlot,
  updatedAt: IsoDateTime,
})
export type Wallet = z.infer<typeof Wallet>

export const Wallets = z.object({
  primary: Wallet.nullable(),
  secondary: Wallet.nullable(),
})
export type Wallets = z.infer<typeof Wallets>

/** Pedido de conexão simulada: o provedor escolhido precisa ser o tipo da carteira cadastrada. */
export const WalletConnectInput = z.object({ provider: WalletType, network: Network })
export type WalletConnectInput = z.infer<typeof WalletConnectInput>

export const WalletConnection = z.object({
  slot: WalletSlot,
  provider: WalletType,
  network: Network,
  address: z.string(),
  connectedAt: IsoDateTime,
})
export type WalletConnection = z.infer<typeof WalletConnection>
