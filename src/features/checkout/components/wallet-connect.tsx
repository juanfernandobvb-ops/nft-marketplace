import { WalletType, type Network, type Wallet, type WalletConnection } from '@/contracts'
import { WalletIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { useConnectWallet } from '@/features/wallets/api'
import { NETWORK_LABELS, shortHash, WALLET_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import { HttpError } from '@/services/http/errors'
import { useState } from 'react'

const rejectionMessage = (error: unknown) => {
  if (!(error instanceof HttpError)) return 'Não foi possível conectar a carteira.'
  if (error.code === 'WALLET_REJECTED') return 'A conexão foi recusada na carteira. Tente novamente.'
  return Object.values(error.fieldErrors)[0] ?? error.message
}

/** Rádio dos cartões mobile do Figma: círculo vazado e, quando marcado, anel e ponto na cor primária. */
export const cardRadioClass =
  'size-4 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-border-soft checked:border-primary checked:bg-[radial-gradient(circle,var(--color-primary)_0_4px,transparent_4.5px)]'

/** Marca de cada provedor nos cartões do layout mobile (como no Figma). */
const PROVIDER_MARK: Record<WalletType, React.ReactNode> = {
  walletconnect: 'W',
  metamask: 'M',
  coinbase: <WalletIcon className="size-[18px]" />,
}

/**
 * "Carteira e rede": escolha do provedor e conexão simulada da carteira cadastrada.
 * `variant="cards"` é o layout mobile do Figma (cartões com marca do provedor e rádio à direita).
 */
export function WalletConnect({
  wallet,
  network,
  connection,
  onConnectionChange,
  variant = 'list',
}: {
  wallet: Wallet
  network: Network
  connection: WalletConnection | null
  onConnectionChange: (connection: WalletConnection | null) => void
  variant?: 'list' | 'cards'
}) {
  const [provider, setProvider] = useState(wallet.type)
  const connect = useConnectWallet()

  const onConnect = () =>
    connect.mutate(
      { slot: wallet.slot, provider, network },
      { onSuccess: (result) => onConnectionChange(result) },
    )

  return (
    <section aria-labelledby="wallet-title" className="flex flex-col gap-3">
      <h2 id="wallet-title" className={cn('text-base font-bold', variant === 'list' && 'text-center')}>
        Carteira e rede
      </h2>
      <div role="radiogroup" aria-label="Provedor da carteira" className={cn('flex flex-col', variant === 'cards' ? 'gap-4' : 'gap-3')}>
        {WalletType.options.map((option) => {
          const radio = (
            <input
              type="radio"
              name="wallet-provider"
              value={option}
              checked={provider === option}
              disabled={Boolean(connection)}
              onChange={() => setProvider(option)}
              className={variant === 'cards' ? cardRadioClass : 'size-4 shrink-0 accent-primary'}
            />
          )
          return variant === 'cards' ? (
            <label key={option} className="flex h-[65px] cursor-pointer items-center gap-3 rounded-[15px] bg-card px-3.5 text-sm">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-surface-raised font-bold text-accent"
              >
                {PROVIDER_MARK[option]}
              </span>
              <span className="flex-1">{WALLET_LABELS[option]}</span>
              {radio}
            </label>
          ) : (
            <label
              key={option}
              className={cn(
                'flex h-[45px] cursor-pointer items-center gap-3 border px-5 text-[15px]',
                provider === option ? 'border-primary' : 'border-border',
              )}
            >
              {radio}
              {WALLET_LABELS[option]}
            </label>
          )
        })}
      </div>

      <div aria-live="polite" className="flex flex-col gap-2 text-[13px]">
        {connection ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-success/50 bg-success/10 p-3">
            <span>
              <strong className="text-success">Conectada:</strong> {WALLET_LABELS[connection.provider]} •{' '}
              {shortHash(connection.address)} na {NETWORK_LABELS[connection.network]}
            </span>
            <button type="button" className="cursor-pointer text-accent underline" onClick={() => onConnectionChange(null)}>
              Desconectar
            </button>
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onConnect}
              disabled={connect.isPending}
              className={cn(variant === 'cards' && 'h-[50px] rounded-full')}
            >
              {connect.isPending ? 'Conectando...' : `Conectar ${WALLET_LABELS[provider]}`}
            </Button>
            {connect.isError && (
              <p role="alert" className="text-destructive">
                {rejectionMessage(connect.error)}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
