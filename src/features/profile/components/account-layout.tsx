import { Link, useNavigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { ActivityIcon, BagIcon, DownloadIcon, HeartIcon, LocationIcon, LogoutIcon, UserIcon, WarningIcon } from '@/components/icons'
import { useLogout } from '@/features/auth/api'

const item = 'flex h-[45px] items-center gap-3 border-l-[5px] border-transparent px-4 text-[15px] text-accent whitespace-nowrap'
const SOON = [
  { label: 'Atividade', Icon: BagIcon },
  { label: 'Lista de interesse', Icon: HeartIcon },
  { label: 'Ofertas', Icon: ActivityIcon },
  { label: 'Arquivos baixados', Icon: DownloadIcon },
  { label: 'Suporte', Icon: WarningIcon },
]

/** Menu "Meu perfil" + conteúdo. No mobile o menu vira uma faixa rolável. */
export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate()
  const logout = useLogout()
  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success('Você saiu da conta.')
        void navigate({ to: '/' })
      },
    })

  return (
    <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-7">
      <nav aria-label="Meu perfil" className="shrink-0 bg-card lg:w-[310px] lg:self-start">
        <h2 className="hidden px-2.5 pt-6 pb-2 text-lg font-bold lg:block">Meu perfil</h2>
        <ul className="flex flex-wrap lg:flex-col">
          <li>
            <Link to="/perfil" className={item} activeProps={{ className: 'border-primary bg-surface-raised/40' }}>
              <UserIcon className="size-4" /> Dados do perfil
            </Link>
          </li>
          <li>
            <Link to="/carteiras" className={item} activeProps={{ className: 'border-primary bg-surface-raised/40' }}>
              <LocationIcon className="size-4" /> Carteiras
            </Link>
          </li>
          {SOON.map(({ label, Icon }) => (
            <li key={label} className="hidden lg:block">
              <span aria-disabled="true" title="Em breve" className={`${item} cursor-not-allowed opacity-70`}>
                <Icon className="size-4" /> {label}
                <span className="sr-only"> (em breve)</span>
              </span>
            </li>
          ))}
          <li className="lg:border-t lg:border-border">
            <button type="button" onClick={signOut} className={`${item} w-full cursor-pointer font-bold`}>
              <LogoutIcon className="size-4" /> Sair
            </button>
          </li>
        </ul>
      </nav>
      <section aria-labelledby="account-title" className="min-w-0 flex-1">
        <h1 id="account-title" className="text-[15px] font-bold">
          {title}
        </h1>
        {children}
      </section>
    </div>
  )
}
