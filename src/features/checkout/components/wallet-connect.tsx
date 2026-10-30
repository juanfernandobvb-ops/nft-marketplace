import { WalletType, type Network, type Wallet, type WalletConnection } from '@/contracts'
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

/** "Carteira e rede": escolha do provedor e conexão simulada da carteira cadastrada. */
export function WalletConnect({
  wallet,
  network,
  connection,
  onConnectionChange,
}: {
  wallet: Wallet
  network: Network
  connection: WalletConnection | null
  onConnectionChange: (connection: WalletConnection | null) => void
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
      <h2 id="wallet-title" className="text-center text-base font-bold">
        Carteira e rede
      </h2>
      <div role="radiogroup" aria-label="Provedor da carteira" className="flex flex-col gap-3">
        {WalletType.options.map((option) => (
          <label
            key={option}
            className={cn(
              'flex h-[45px] cursor-pointer items-center gap-3 border px-5 text-[15px]',
              provider === option ? 'border-primary' : 'border-border',
            )}
          >
            <input
              type="radio"
              name="wallet-provider"
              value={option}
              checked={provider === option}
              disabled={Boolean(connection)}
              onChange={() => setProvider(option)}
              className="size-4 accent-primary"
            />
            {WALLET_LABELS[option]}
          </label>
        ))}
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
            <Button type="button" variant="outline" onClick={onConnect} disabled={connect.isPending}>
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
