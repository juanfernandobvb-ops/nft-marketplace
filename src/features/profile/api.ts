import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { endpoints, Profile, type ChangePasswordInput, type UpdateProfileInput } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { queryKeys } from '@/lib/query-keys'
import { request, send } from '@/services/http/client'
import { sessionStore } from '@/services/session/store'

export const profileQuery = (userId: string) =>
  queryOptions({
    queryKey: queryKeys.private.profile(userId),
    queryFn: ({ signal }) => request(Profile, { url: endpoints.profile.root, signal }),
  })

/** Atualiza o cache do perfil e os dados exibidos no cabeçalho (nome, avatar). */
function useApplyProfile() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  return (profile: Profile) => {
    if (!user) return
    queryClient.setQueryData(queryKeys.private.profile(user.id), profile)
    sessionStore.updateUser({ ...user, displayName: profile.displayName, username: profile.username, email: profile.email, avatarUrl: profile.avatarUrl })
  }
}

export function useUpdateProfile() {
  const apply = useApplyProfile()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => request(Profile, { url: endpoints.profile.root, method: 'PATCH', data: input }),
    onSuccess: apply,
  })
}

export function useUploadAvatar() {
  const apply = useApplyProfile()
  return useMutation({
    mutationFn: (file: File) => {
      const data = new FormData()
      data.append('avatar', file)
      // O navegador define o Content-Type multipart com o boundary.
      return request(Profile, { url: endpoints.profile.avatar, method: 'POST', data, headers: { 'Content-Type': undefined } })
    },
    onSuccess: apply,
  })
}

export function useRemoveAvatar() {
  const apply = useApplyProfile()
  return useMutation({
    mutationFn: () => request(Profile, { url: endpoints.profile.avatar, method: 'DELETE' }),
    onSuccess: apply,
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => send({ url: endpoints.profile.password, method: 'POST', data: input }),
  })
}
