import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import {
  SocialFacebookIcon,
  SocialInstagramIcon,
  SocialLinkedinIcon,
  SocialTwitterIcon,
  SocialYoutubeIcon,
} from '@/components/icons'
import type { Category } from '@/contracts'
import { CATEGORY_LABELS } from '@/lib/format'

const FEATURES = [
  { mark: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { mark: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { mark: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]
const HELP = ['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item']
const FOOTER_CATEGORIES: Category[] = ['digital-art', 'photography', 'music', '3d-art', 'utility']
const SOCIALS = [
  { label: 'Facebook', Icon: SocialFacebookIcon },
  { label: 'Instagram', Icon: SocialInstagramIcon },
  { label: 'Twitter', Icon: SocialTwitterIcon },
  { label: 'LinkedIn', Icon: SocialLinkedinIcon },
  { label: 'YouTube', Icon: SocialYoutubeIcon },
]

const heading = 'text-lg leading-tight font-bold'
const linkClass = 'text-sm leading-[27px] hover:text-accent'
const unavailable = 'cursor-not-allowed text-sm leading-[27px]'

function Newsletter() {
  const [notice, setNotice] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    // Fora do escopo: o envio não simula sucesso.
    setNotice('A newsletter não está disponível nesta demonstração.')
  }
  return (
    <div className="flex flex-col gap-3 px-4 md:col-span-3 lg:w-[300px] lg:shrink-0">
      <h2 className={heading}>Antecipe-se ao próximo lançamento</h2>
      <form onSubmit={submit} className="mt-1 flex h-10 overflow-hidden rounded-md bg-surface-dark shadow-[0_0_20px_rgb(10_6_4/0.45)]">
        <label htmlFor="newsletter-email" className="sr-only">
          E-mail para a newsletter
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="digite seu e-mail..."
          className="min-w-0 flex-1 bg-transparent pl-3 text-sm placeholder:text-secondary"
        />
        <button type="submit" className="cursor-pointer bg-primary px-4 text-lg font-bold text-primary-foreground">
          Enviar
        </button>
      </form>
      <p role="status" className="text-[13px] leading-[22px] text-muted-foreground">
        {notice || 'Receba lançamentos selecionados, histórias de criadores e novidades do mercado.'}
      </p>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-24 pb-24 md:pb-6">
      <div className="flex flex-col gap-8 bg-card p-8 md:grid md:grid-cols-3 lg:flex lg:flex-row lg:justify-between lg:gap-7">
        {FEATURES.map((feature) => (
          <div key={feature.mark} className="flex flex-1 flex-col gap-3 px-3 lg:border-r lg:border-primary">
            <span aria-hidden="true" className="grid size-[74px] place-items-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {feature.mark}
            </span>
            <h2 className="text-[17px] leading-tight font-bold">{feature.title}</h2>
            <p className="max-w-[204px] text-sm leading-[22px] text-muted-foreground">{feature.text}</p>
          </div>
        ))}
        <Newsletter />
      </div>

      <div className="grid gap-4 bg-surface-dark p-8 text-sm leading-[22px] sm:grid-cols-2 lg:grid-cols-4">
        <span className="font-bold tracking-[0.1em]">KURIO</span>
        <span>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </span>
        <span>contato@email.com</span>
        <span>+55 11 4002 8922</span>
      </div>

      <div className="grid grid-cols-2 gap-8 bg-card p-8 lg:grid-cols-[1fr_1fr_1fr_228px] lg:gap-x-16">
        <nav aria-labelledby="footer-profile">
          <h2 id="footer-profile" className={heading}>
            Meu perfil
          </h2>
          <ul className="mt-2">
            <li>
              <Link to="/perfil" className={linkClass}>
                Meu perfil
              </Link>
            </li>
            <li>
              <Link to="/carteiras" className={linkClass}>
                Minhas carteiras
              </Link>
            </li>
            <li>
              <Link to="/carrinho" className={linkClass}>
                Carrinho
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className={heading}>Central de ajuda</h2>
          <ul className="mt-2">
            {HELP.map((item) => (
              <li key={item} className={unavailable} title="Em breve">
                {item}
                <span className="sr-only"> (em breve)</span>
              </li>
            ))}
          </ul>
        </div>
        <nav aria-labelledby="footer-collections">
          <h2 id="footer-collections" className={heading}>
            Coleções
          </h2>
          <ul className="mt-2">
            {FOOTER_CATEGORIES.map((category) => (
              <li key={category}>
                <Link to="/" search={{ categories: [category] }} hash="catalogo" className={linkClass}>
                  {CATEGORY_LABELS[category]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="col-span-2 flex flex-col gap-8 lg:col-span-1">
          <div className="flex flex-col gap-5">
            <h2 className={heading}>Redes sociais</h2>
            <ul className="flex gap-2.5" aria-label="Redes sociais (em breve)">
              {SOCIALS.map(({ label, Icon }) => (
                <li key={label} title={`${label} (em breve)`} className="text-primary">
                  <Icon className="size-[30px]" aria-label={label} role="img" />
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className={heading}>Carteiras compatíveis</h2>
            <p className="w-fit rounded-sm border border-border-soft bg-surface-dark px-2 py-1 text-[9px] font-bold tracking-[0.01em] whitespace-nowrap text-accent">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>
      </div>
      <p className="text-center text-sm leading-[30px]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
