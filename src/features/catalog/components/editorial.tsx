import { Link } from '@tanstack/react-router'
import { ArrowDownIcon } from '@/components/icons'
import apeEmerald from '@/assets/images/ape-emerald.webp'
import apeGolden from '@/assets/images/ape-golden.webp'
import apeIvory from '@/assets/images/ape-ivory.webp'
import apeSage from '@/assets/images/ape-sage.webp'

// Seções editoriais da Início: conteúdo fixo do layout, sem dependência da API.

export function HeroBanner() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative mt-4 flex items-center justify-between gap-6 overflow-hidden rounded-3xl bg-linear-to-br from-surface-dark to-card p-4 md:mt-8 md:rounded-none md:bg-none md:py-0 md:pr-0 md:pl-10 lg:h-[450px]"
    >
      <div className="flex max-w-[600px] flex-col gap-4 md:gap-8">
        <div className="flex flex-col gap-1 md:gap-2">
          <p className="text-[13px] font-medium tracking-[0.1em] md:text-sm">Bem-vindo à Kurio</p>
          <h1 id="hero-title" className="text-lg leading-7 font-bold md:text-[43px] md:leading-[70px]">
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </h1>
          <p className="max-w-[557px] text-[13px] leading-5 text-muted-foreground md:text-sm md:leading-6">
            <span className="md:hidden">Descubra NFTs selecionados de criadores do mundo todo.</span>
            <span className="hidden md:inline">
              Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie
              artistas e tenha uma parte da cultura da internet.
            </span>
          </p>
        </div>
        <Link
          to="/"
          hash="catalogo"
          className="flex w-fit items-center gap-2 text-sm font-bold text-accent md:h-10 md:rounded-md md:bg-primary md:pr-9 md:pl-7 md:text-base md:text-primary-foreground"
        >
          EXPLORAR
          <ArrowDownIcon className="size-3 -rotate-90 md:hidden" />
        </Link>
      </div>
      <img
        src={apeEmerald}
        alt="Emerald Ape #042, NFT em destaque"
        width={450}
        height={450}
        fetchPriority="high"
        className="aspect-square w-[42%] max-w-[450px] shrink-0 rounded-2xl object-cover md:w-[40%] md:rounded-3xl"
      />
      <div aria-hidden="true" className="absolute bottom-3 left-1/2 flex gap-1.5 md:bottom-10 md:left-[33%]">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="size-1.5 rounded-full bg-primary md:size-2" />
        ))}
      </div>
    </section>
  )
}

export function FeaturedBanner() {
  return (
    <Link
      to="/nfts/$nftId"
      params={{ nftId: 'sage-nomad-009' }}
      className="flex flex-col gap-4 bg-linear-to-b from-primary/10 to-primary/3 pt-6"
    >
      <span className="px-5 text-2xl leading-8 font-bold text-accent">NFT EM DESTAQUE</span>
      <span className="px-5 text-center text-[22px] leading-4 font-bold">OFERTA LIMITADA</span>
      <img
        src={apeSage}
        alt="Sage Nomad #009, oferta limitada"
        width={310}
        height={368}
        loading="lazy"
        className="h-[368px] w-full rounded-[22px] object-cover"
      />
    </Link>
  )
}

const PROMOS = [
  {
    title: ['Lançamentos gênesis', 'de edição limitada'],
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: apeEmerald,
    alt: 'Emerald Ape, lançamento gênesis',
    search: { segment: 'new' as const },
  },
  {
    title: ['Arte digital selecionada', 'e muito mais'],
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: apeIvory,
    alt: 'Ivory Baron, arte digital selecionada',
    search: { categories: ['digital-art' as const] },
  },
]

export function PromoCards() {
  return (
    <section aria-label="Destaques" className="mt-24 grid gap-7 lg:grid-cols-2">
      {PROMOS.map((promo) => (
        <article key={promo.text} className="flex min-h-[200px] overflow-hidden rounded-lg bg-card lg:h-[250px]">
          <img
            src={promo.image}
            alt={promo.alt}
            width={292}
            height={250}
            loading="lazy"
            className="w-2/5 shrink-0 rounded-[18px] object-cover md:w-1/2"
          />
          <div className="flex flex-1 flex-col items-end justify-center gap-2 p-4 text-right md:gap-3">
            <h2 className="text-sm leading-5 font-bold md:text-lg md:leading-6">
              {promo.title[0]}
              <br />
              {promo.title[1]}
            </h2>
            <p className="text-xs leading-5 text-muted-foreground md:text-sm md:leading-6">{promo.text}</p>
            <Link
              to="/"
              search={promo.search}
              hash="catalogo"
              className="flex h-10 w-[140px] shrink-0 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground"
            >
              Explorar
              <ArrowDownIcon className="size-3 -rotate-90" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  )
}

const POSTS = [
  { image: apeIvory, date: '12 de setembro', read: 6, title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { image: apeEmerald, date: '13 de setembro', read: 2, title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { image: apeSage, date: '15 de setembro', read: 3, title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { image: apeGolden, date: '15 de setembro', read: 2, title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

export function BlogSection() {
  return (
    <section aria-labelledby="blog-title" className="mt-24 flex flex-col gap-10">
      <header className="flex flex-col gap-3 text-center">
        <h2 id="blog-title" className="text-[28px] leading-9 font-bold">
          Diário da Cunhagem
        </h2>
        <p className="text-sm text-muted-foreground">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title}>
            <article className="flex h-full flex-col overflow-hidden rounded-lg bg-card">
              <img src={post.image} alt="" width={268} height={195} loading="lazy" className="h-[195px] w-full object-cover" />
              <div className="flex flex-col gap-2 px-4 pt-3 pb-4">
                <p className="text-xs leading-4 font-medium text-muted-foreground">
                  {post.date} | Leitura de {post.read} min
                </p>
                <h3 className="text-base leading-[21px] font-bold">{post.title}</h3>
                <p className="text-xs leading-4 font-medium text-muted-foreground">{post.text}</p>
                <span title="Artigos em breve" className="cursor-not-allowed text-xs font-bold text-accent">
                  Ler mais →<span className="sr-only"> (em breve)</span>
                </span>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  )
}
