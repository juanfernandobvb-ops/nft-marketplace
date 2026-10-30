import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { buildPath, endpoints, Favorites } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { queryKeys } from '@/lib/query-keys'
import { request } from '@/services/http/client'

export const favoritesQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.private.favorites(userId),
    queryFn: ({ signal }) => request(Favorites, { url: endpoints.favorites.list, signal }),
  })

/** Ação de favoritar usada por cards e detalhe: exige sessão e usa atualização otimista. */
export function useFavoriteToggle() {
  const { user } = useSession()
  const navigate = useNavigate()
  const href = useRouterState({ select: (state) => state.location.href })
  const favoriteIds = useFavoriteIds()
  const mutation = useToggleFavorite()
  return {
    isFavorite: (nftId: string) => favoriteIds.has(nftId),
    toggle: (nft: { id: string; name: string }) => {
      if (!user) {
        toast.info('Entre na sua conta para favoritar NFTs.')
        void navigate({ to: '/login', search: { redirect: href } })
        return
      }
      mutation.mutate({ nftId: nft.id, favorite: !favoriteIds.has(nft.id), name: nft.name })
    },
  }
}

export function useFavoriteIds() {
  const { user } = useSession()
  const { data } = useQuery({ ...favoritesQuery(user?.id ?? ''), enabled: Boolean(user) })
  return new Set(data?.nftIds ?? [])
}

/**
 * Atualização otimista: o coração muda na hora; em caso de falha o cache volta ao estado
 * anterior e o usuário é avisado. Ao final, a lista é revalidada com a API.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      request(Favorites, {
        url: buildPath(endpoints.favorites.item, { nftId }),
        method: favorite ? 'PUT' : 'DELETE',
      }),
    onMutate: async ({ nftId, favorite }) => {
      if (!user) return undefined
      const key = queryKeys.private.favorites(user.id)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      const current = previous?.nftIds ?? []
      queryClient.setQueryData<Favorites>(key, {
        nftIds: favorite ? [...new Set([...current, nftId])] : current.filter((id) => id !== nftId),
      })
      return { key, previous }
    },
    onError: (_error, { name, favorite }, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      toast.error(`Não foi possível ${favorite ? 'favoritar' : 'remover dos favoritos'} ${name}. Tente novamente.`)
    },
    onSuccess: (_data, { name, favorite }) => {
      toast.success(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`)
    },
    onSettled: (_data, _error, _vars, context) => {
      if (context) void queryClient.invalidateQueries({ queryKey: context.key })
    },
  })
}
