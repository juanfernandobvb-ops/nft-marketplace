import { createFileRoute } from '@tanstack/react-router'
import { nftDetailQuery } from '@/features/catalog/api'
import { NftDetail } from '@/features/nft/components/nft-detail'

export const Route = createFileRoute('/nfts/$nftId')({
  // Busca iniciada na navegação, sem bloquear: o skeleton aparece imediatamente.
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  return <NftDetail nftId={nftId} />
}
