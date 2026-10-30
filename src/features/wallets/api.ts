import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  buildPath,
  endpoints,
  Wallet,
  WalletConnection,
  Wallets,
  type WalletConnectInput,
  type WalletInput,
  type WalletSlot,
} from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { queryKeys } from '@/lib/query-keys'
import { request } from '@/services/http/client'

export const walletsQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.private.wallets(userId),
    queryFn: ({ signal }) => request(Wallets, { url: endpoints.wallets.list, signal }),
  })

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return useMutation({
    mutationFn: ({ slot, input }: { slot: WalletSlot; input: WalletInput }) =>
      request(Wallet, { url: buildPath(endpoints.wallets.slot, { slot }), method: 'PUT', data: input }),
    onSuccess: (wallet) => {
      if (!user) return
      queryClient.setQueryData<Wallets>(queryKeys.private.wallets(user.id), (current) => ({
        primary: current?.primary ?? null,
        secondary: current?.secondary ?? null,
        [wallet.slot]: wallet,
      }))
    },
  })
}

/** Conexão simulada pela API (MSW): pode ser aceita ou recusada conforme o cenário. */
export function useConnectWallet() {
  return useMutation({
    mutationFn: ({ slot, ...input }: WalletConnectInput & { slot: WalletSlot }) =>
      request(WalletConnection, { url: buildPath(endpoints.wallets.connect, { slot }), method: 'POST', data: input }),
  })
}
