import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { inputClass, RequiredMark, TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Network, WalletInput, WalletType, type Profile, type Wallet, type WalletSlot } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { profileQuery } from '@/features/profile/api'
import { AccountLayout } from '@/features/profile/components/account-layout'
import { useSaveWallet, walletsQuery } from '@/features/wallets/api'
import { applyApiError } from '@/lib/form-errors'
import { NETWORK_LABELS, WALLET_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'

type WalletFormValues = WalletInput
const FIELDS: (keyof WalletFormValues)[] = [
  'displayName',
  'alias',
  'network',
  'profileName',
  'address',
  'secondaryAddress',
  'type',
  'referralCode',
  'email',
  'ensName',
]

function SelectField({ label, error, children, ...props }: React.ComponentProps<'select'> & { label: string; error?: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm">
        {label}
        <RequiredMark />
      </label>
      <select id={id} required aria-invalid={Boolean(error)} className={cn(inputClass, 'bg-background')} {...props}>
        {children}
      </select>
      {error && <p className="text-[13px] text-destructive">{error}</p>}
    </div>
  )
}

const emptyWallet = (profile: Profile): WalletFormValues => ({
  displayName: profile.displayName,
  alias: profile.walletAlias ?? '',
  network: 'ethereum',
  profileName: profile.username,
  address: '',
  secondaryAddress: null,
  type: 'metamask',
  referralCode: '',
  email: profile.email,
  ensName: profile.ensName ?? '',
})

const toFormValues = ({ slot: _slot, updatedAt: _updatedAt, ...values }: Wallet): WalletFormValues => values

function WalletForm({ slot, initial, onSaved }: { slot: WalletSlot; initial: WalletFormValues; onSaved?: () => void }) {
  const save = useSaveWallet()
  const { register, handleSubmit, setError, formState } = useForm<WalletFormValues>({
    resolver: zodResolver(WalletInput),
    defaultValues: initial,
  })
  const errors = formState.errors
  const onSubmit = handleSubmit((input) =>
    save.mutateAsync({ slot, input: { ...input, secondaryAddress: input.secondaryAddress || null } }).then(
      () => {
        toast.success(slot === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.')
        onSaved?.()
      },
      (error: unknown) => applyApiError(error, setError, FIELDS),
    ),
  )

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6" aria-label={slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'}>
      {errors.root?.message && (
        <p role="alert" className="rounded-[5px] border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}
      <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
        <TextField label="Nome de exibição" required error={errors.displayName?.message} {...register('displayName')} />
        <TextField label="Apelido da carteira" required error={errors.alias?.message} {...register('alias')} />
        <SelectField label="Rede" error={errors.network?.message} {...register('network')}>
          {Network.options.map((network) => (
            <option key={network} value={network}>
              {NETWORK_LABELS[network]}
            </option>
          ))}
        </SelectField>
        <TextField label="Nome do perfil" required error={errors.profileName?.message} {...register('profileName')} />
        <TextField label="Endereço da carteira" required placeholder="Endereço 0x da carteira" error={errors.address?.message} {...register('address')} />
        <TextField label="ENS ou carteira secundária (opcional)" error={errors.secondaryAddress?.message} {...register('secondaryAddress')} />
        <SelectField label="Tipo de carteira" error={errors.type?.message} {...register('type')}>
          {WalletType.options.map((type) => (
            <option key={type} value={type}>
              {WALLET_LABELS[type]}
            </option>
          ))}
        </SelectField>
        <TextField label="Código de indicação" required error={errors.referralCode?.message} {...register('referralCode')} />
        <TextField label="E-mail" required type="email" error={errors.email?.message} {...register('email')} />
        <TextField label="Nome ENS" required error={errors.ensName?.message} {...register('ensName')} />
      </div>
      <Button type="submit" size="sm" className="w-fit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? 'Salvando...' : 'Salvar carteira'}
      </Button>
    </form>
  )
}

function WalletSection({ slot, wallet, primary, profile }: { slot: WalletSlot; wallet: Wallet | null; primary: Wallet | null; profile: Profile }) {
  const [adding, setAdding] = useState(false)
  const [sameAsPrimary, setSameAsPrimary] = useState(false)
  const title = slot === 'primary' ? 'Carteira principal' : 'Carteira secundária'
  const initial = wallet ? toFormValues(wallet) : sameAsPrimary && primary ? toFormValues(primary) : emptyWallet(profile)
  const showForm = Boolean(wallet) || adding

  return (
    <section aria-labelledby={`${slot}-title`} className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${slot}-title`} className="text-base font-bold">
            {title}
          </h2>
          <p className="text-[13px] text-muted-foreground">
            {slot === 'primary'
              ? 'Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.'
              : wallet
                ? 'Usada quando você escolhe "Usar outra carteira?" no pagamento.'
                : 'Você ainda não adicionou uma carteira secundária.'}
          </p>
        </div>
        {!showForm && (
          <div className="flex items-center gap-4">
            {slot === 'secondary' && primary && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-primary" checked={sameAsPrimary} onChange={(event) => setSameAsPrimary(event.target.checked)} />
                Igual à carteira principal
              </label>
            )}
            <button type="button" className="cursor-pointer text-base font-bold text-accent" onClick={() => setAdding(true)}>
              Adicionar
            </button>
          </div>
        )}
      </header>
      {showForm && <WalletForm key={`${slot}-${sameAsPrimary}`} slot={slot} initial={initial} onSaved={() => setAdding(false)} />}
    </section>
  )
}

export function WalletsView() {
  const { user } = useSession()
  const userId = user?.id ?? ''
  const wallets = useQuery({ ...walletsQuery(userId), enabled: Boolean(user) })
  const profile = useQuery({ ...profileQuery(userId), enabled: Boolean(user) })

  return (
    <AccountLayout title="Carteiras" titleHidden>
      {wallets.isPending || profile.isPending ? (
        <Skeleton className="mt-8 h-[560px]" />
      ) : wallets.isError || profile.isError ? (
        <div role="alert" className="mt-8 flex flex-col items-start gap-3">
          Não foi possível carregar suas carteiras.
          <Button size="sm" onClick={() => void Promise.all([wallets.refetch(), profile.refetch()])}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-12">
          <WalletSection slot="primary" wallet={wallets.data.primary} primary={wallets.data.primary} profile={profile.data} />
          <WalletSection slot="secondary" wallet={wallets.data.secondary} primary={wallets.data.primary} profile={profile.data} />
        </div>
      )}
    </AccountLayout>
  )
}
