import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  BagIcon,
  ChevronLeftIcon,
  HeartFilledIcon,
  HeartIcon,
  LinkedinIcon,
  MailIcon,
  StarIcon,
  TwitterIcon,
} from '@/components/icons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EVENTS, NftListQuery, quantityLimit, type Nft } from '@/contracts'
import { useAddToCart } from '@/features/cart/api'
import { nftDetailQuery } from '@/features/catalog/api'
import { NftRail } from '@/features/catalog/components/nft-rail'
import { useFavoriteToggle } from '@/features/favorites/api'
import { NftGallery } from '@/features/nft/components/nft-gallery'
import { EditionPicker, QuantityStepper } from '@/features/nft/components/nft-purchase'
import { formatEth, NETWORK_LABELS } from '@/lib/format'
import { money } from '@/lib/money'
import { cn } from '@/lib/utils'
import { HttpError } from '@/services/http/errors'
import { onRealtimeEvent } from '@/services/realtime/sync'

const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`

function Rating({ nft, compact }: { nft: Nft; compact?: boolean }) {
  // `aria-label` não vale em <p>: o texto para leitores de tela fica em sr-only e o visual é ocultado.
  const label = <span className="sr-only">{`Avaliação ${nft.rating.average.toLocaleString('pt-BR')} de 5, ${nft.rating.count} avaliações de colecionadores`}</span>
  if (compact) {
    return (
      <p className="flex h-[27px] items-center gap-1.5 rounded-full border border-primary px-3 text-sm">
        {label}
        <span aria-hidden="true" className="contents">
          <StarIcon className="size-3.5 text-accent" />
          <span className="font-medium">{nft.rating.average.toLocaleString('pt-BR')}</span>
          <span className="text-muted-foreground">({nft.rating.count})</span>
        </span>
      </p>
    )
  }
  return (
    <p className="flex items-center gap-1 text-[15px]">
      {label}
      <span aria-hidden="true" className="contents">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon key={index} className={cn('size-[15px]', index < Math.round(nft.rating.average) ? 'text-accent' : 'text-border-soft')} />
        ))}
        <span className="ml-1">{nft.rating.count} avaliações de colecionadores</span>
      </span>
    </p>
  )
}

function ShareLinks({ nft }: { nft: Nft }) {
  const url = encodeURIComponent(window.location.href)
  const text = encodeURIComponent(`${nft.name} na Kurio`)
  const links = [
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`, Icon: LinkedinIcon },
    { label: 'e-mail', href: `mailto:?subject=${text}&body=${url}`, Icon: MailIcon },
    { label: 'Twitter', href: `https://twitter.com/intent/tweet?url=${url}&text=${text}`, Icon: TwitterIcon },
  ]
  return (
    <div className="flex items-center gap-2">
      <span className="text-[15px] font-bold">Compartilhar este NFT:</span>
      {links.map(({ label, href, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="rounded-sm p-1 hover:text-accent">
          <Icon className="size-4" />
          <span className="sr-only">Compartilhar por {label} (abre em nova aba)</span>
        </a>
      ))}
    </div>
  )
}

function DescriptionTabs({ nft }: { nft: Nft }) {
  return (
    <Tabs defaultValue="details" className="mt-16 gap-0 md:mt-24">
      <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-primary/30 bg-transparent p-0 md:gap-9">
        {[
          ['details', 'Detalhes do NFT'],
          ['reviews', `Avaliações de colecionadores (${nft.rating.count})`],
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value!}
            className="flex-1 cursor-pointer rounded-none border-0 text-left whitespace-normal md:flex-none md:whitespace-nowrap border-b-[3px] border-transparent bg-transparent px-0 pb-2 text-base font-normal text-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-accent data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="details" className="flex flex-col gap-3 pt-3 text-sm leading-6 text-muted-foreground">
        <p>{nft.description}</p>
        <p>
          A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro
          permanente de procedência registrada na rede.
        </p>
        <dl className="flex flex-col gap-3">
          {[
            ['Rede', `Cunhado na ${NETWORK_LABELS[nft.network]} com procedência imutável e metadados armazenados no IPFS.`],
            ['Contrato', `${shortAddress(nft.contractAddress)} • Contrato inteligente ERC-721 verificado.`],
            ['Direitos autorais', `${nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.`],
          ].map(([term, description]) => (
            <div key={term}>
              <dt className="font-bold text-foreground">{term}:</dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
      </TabsContent>
      <TabsContent value="reviews" className="pt-3 text-sm leading-6 text-muted-foreground">
        As avaliações escritas pelos colecionadores não estão disponíveis nesta demonstração. Nota média:{' '}
        {nft.rating.average.toLocaleString('pt-BR')} de 5.
      </TabsContent>
    </Tabs>
  )
}

/** Trilha estática: aparece igual no carregamento e no conteúdo, sem deslocar o layout. */
function DetailBreadcrumb() {
  return (
    <nav aria-label="Trilha de navegação" className="mt-6 hidden text-[15px] font-bold md:block">
      <ol className="flex gap-1">
        <li>
          <Link to="/">Início</Link> /
        </li>
        <li>
          <Link to="/" hash="catalogo">
            Mercado
          </Link>
        </li>
      </ol>
    </nav>
  )
}

/** Mesma estrutura do detalhe (topo, trilha, galeria, informações e abas) para não haver deslocamento. */
export function NftDetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando NFT">
      <div className="flex items-center justify-between pt-6 md:hidden">
        <Skeleton className="size-[35px] rounded-full" />
        <Skeleton className="size-[35px] rounded-full" />
      </div>
      <DetailBreadcrumb />
      <div className="mt-4 flex flex-col gap-8 lg:flex-row">
        <div className="flex flex-col-reverse gap-4 md:flex-row md:gap-7">
          <div className="flex gap-3 md:flex-col md:gap-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="size-16 rounded-lg md:size-[100px]" />
            ))}
          </div>
          <Skeleton className="aspect-square w-full md:flex-1 lg:size-[444px] lg:flex-none" />
        </div>
        <div className="flex flex-1 flex-col gap-5">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-1/2" />
        </div>
      </div>
      <div className="mt-16 flex flex-col gap-4 md:mt-24">
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}

function DetailMessage({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <section className="grid min-h-[50dvh] place-content-center justify-items-center gap-4 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-muted-foreground">{text}</p>
      {action}
    </section>
  )
}

function NftDetailView({ nft }: { nft: Nft }) {
  const navigate = useNavigate()
  const router = useRouter()
  const favorites = useFavoriteToggle()
  const addToCart = useAddToCart()
  const firstAvailable = nft.editions.find((edition) => quantityLimit(edition) > 0)
  const [editionId, setEditionId] = useState(firstAvailable?.id)
  const [requested, setRequested] = useState(1)

  const edition = nft.editions.find((candidate) => candidate.id === editionId)
  const limit = edition ? quantityLimit(edition) : 0
  // Se a disponibilidade cair (evento em tempo real), a quantidade acompanha o novo limite.
  const quantity = Math.max(1, Math.min(requested, limit))
  const unavailable = !edition || limit === 0
  const favorite = favorites.isFavorite(nft.id)

  // Anuncia mudanças de preço/disponibilidade recebidas enquanto a página está aberta.
  useEffect(
    () =>
      onRealtimeEvent((event) => {
        if (event.type === EVENTS.nftUpdated && event.resource.id === nft.id) {
          toast.info(`${nft.name}: preço ou disponibilidade atualizados.`)
        }
      }),
    [nft.id, nft.name],
  )

  const buy = () => {
    if (!edition || unavailable) return
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity, limit },
      {
        onSuccess: () => {
          toast.success(`${nft.name} adicionado ao carrinho.`)
          void navigate({ to: '/carrinho' })
        },
        onError: (error) => toast.error(error instanceof HttpError ? error.message : 'Não foi possível adicionar ao carrinho.'),
      },
    )
  }

  const favoriteLabel = favorite ? 'Remover dos favoritos' : 'Favoritar'

  return (
    <>
      {/* Topo mobile: voltar e favoritar sobre a imagem. */}
      <div className="flex items-center justify-between pt-6 md:hidden">
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label="Voltar"
          className="grid size-[35px] cursor-pointer place-items-center rounded-full border border-border bg-surface-raised"
        >
          <ChevronLeftIcon className="h-3" />
        </button>
        <button
          type="button"
          onClick={() => favorites.toggle(nft)}
          aria-pressed={favorite}
          aria-label={favoriteLabel}
          className="grid size-[35px] cursor-pointer place-items-center rounded-full border border-border bg-surface-raised text-accent"
        >
          {favorite ? <HeartFilledIcon className="size-4" /> : <HeartIcon className="size-4" />}
        </button>
      </div>

      <DetailBreadcrumb />

      <article className="mt-4 flex flex-col gap-8 lg:flex-row" aria-labelledby="nft-title">
        <NftGallery nft={nft} />

        <div className="flex min-w-0 flex-1 flex-col gap-5 rounded-t-[31px] bg-card p-6 md:rounded-none md:bg-transparent md:p-0">
          <header className="flex flex-col gap-3 border-b border-primary/30 pb-3">
            <div className="flex items-center justify-between gap-4">
              <h1 id="nft-title" className="text-xl leading-tight font-bold md:text-[28px] md:leading-[37px]">
                {nft.name}
              </h1>
              <div className="md:hidden">
                <Rating nft={nft} compact />
              </div>
            </div>
            <div className="hidden flex-wrap items-center justify-between gap-3 md:flex">
              <p className="flex items-center gap-3 text-[22px] leading-4 font-bold text-accent">
                {formatEth(nft.price)}
                {nft.previousPrice && (
                  <span className="text-base font-normal text-secondary line-through">
                    <span className="sr-only">Preço anterior: </span>
                    {formatEth(nft.previousPrice)}
                  </span>
                )}
              </p>
              <Rating nft={nft} />
            </div>
          </header>

          <section aria-labelledby="about-title" className="flex flex-col gap-3">
            <h2 id="about-title" className="hidden text-[15px] font-bold md:block">
              Sobre este NFT:
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">{nft.description}</p>
          </section>

          <EditionPicker editions={nft.editions} selectedId={editionId} onSelect={setEditionId} />

          <div className="hidden flex-wrap items-center justify-between gap-4 md:flex">
            <QuantityStepper value={quantity} max={limit} onChange={setRequested} />
            <div className="flex gap-2">
              <Button className="w-[130px] text-sm" onClick={buy} disabled={unavailable || addToCart.isPending}>
                {unavailable ? 'ESGOTADO' : 'COMPRAR'}
              </Button>
              <Button variant="outline" className="w-[130px] px-0 text-sm font-medium" onClick={() => favorites.toggle(nft)} aria-pressed={favorite}>
                {favorite ? <HeartFilledIcon className="size-5" /> : <HeartIcon className="size-5" />}
                {favorite ? 'Favorito' : 'Favoritar'}
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {unavailable
              ? 'Esta edição está esgotada. Escolha outra edição disponível.'
              : edition.available === null
                ? `Edição aberta: até ${limit} unidades por compra.`
                : `${edition.available} unidade(s) disponível(is) nesta edição.`}
          </p>

          <dl className="flex flex-col gap-3 text-[15px] leading-5 text-secondary">
            <div>
              <dt className="inline">ID do token: </dt>
              <dd className="inline">{nft.tokenId}</dd>
            </div>
            <div>
              <dt className="inline">Coleção: </dt>
              <dd className="inline">{nft.collection}</dd>
            </div>
            <div>
              <dt className="inline">Atributos: </dt>
              <dd className="inline">{nft.attributes.join(', ')}</dd>
            </div>
          </dl>
          <ShareLinks nft={nft} />
        </div>
      </article>

      <DescriptionTabs nft={nft} />
      <NftRail title="Mais desta coleção" query={NftListQuery.parse({ q: nft.collection, pageSize: 6 })} excludeIds={[nft.id]} />

      {/* Barra de compra fixa do layout mobile. */}
      <div className="h-44 md:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-5 rounded-t-[40px] bg-card px-6 pt-5 pb-9 shadow-[0_0_20px_rgb(10_6_4/0.45)] md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-muted-foreground">Qtd.</span>
            <QuantityStepper value={quantity} max={limit} onChange={setRequested} size="sm" />
          </div>
          <p className="text-xl font-bold text-accent">
            <span className="sr-only">Total: </span>
            {formatEth(money.times(nft.price, quantity))}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            className="h-[60px] flex-1 rounded-full bg-linear-to-r from-primary to-primary/80"
            onClick={buy}
            disabled={unavailable || addToCart.isPending}
          >
            {unavailable ? 'Esgotado' : 'Comprar NFT'}
          </Button>
          <Link
            to="/carrinho"
            aria-label="Ir para o carrinho"
            className="grid size-[60px] place-items-center rounded-full border border-border bg-surface-raised"
          >
            <BagIcon className="size-5" />
          </Link>
        </div>
      </div>
    </>
  )
}

export function NftDetail({ nftId }: { nftId: string }) {
  const { data, isPending, isError, error, refetch } = useQuery(nftDetailQuery(nftId))

  if (isPending) return <NftDetailSkeleton />
  if (isError) {
    if (error instanceof HttpError && error.code === 'NOT_FOUND') {
      return (
        <DetailMessage
          title="NFT não encontrado"
          text="O NFT que você procura não existe ou foi removido do mercado."
          action={
            <Button asChild>
              <Link to="/" hash="catalogo">
                Explorar o catálogo
              </Link>
            </Button>
          }
        />
      )
    }
    return (
      <DetailMessage
        title="Não foi possível carregar o NFT"
        text={error.message}
        action={<Button onClick={() => void refetch()}>Tentar novamente</Button>}
      />
    )
  }
  return <NftDetailView key={data.id} nft={data} />
}
