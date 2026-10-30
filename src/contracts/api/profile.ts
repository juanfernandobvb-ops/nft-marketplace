import { z } from 'zod'
import { Id } from '@/contracts/common'
import { Password, Username } from '@/contracts/api/auth'

export const Profile = z.object({
  userId: Id,
  displayName: z.string(),
  username: Username,
  email: z.email(),
  ensName: z.string().nullable(),
  walletAlias: z.string().nullable(),
  avatarUrl: z.string().nullable(),
})
export type Profile = z.infer<typeof Profile>

export const UpdateProfileInput = z.object({
  displayName: z.string().trim().min(1, 'Informe o nome de exibição'),
  username: Username,
  email: z.email('E-mail inválido'),
  ensName: z.string().trim().min(1, 'Informe o nome ENS'),
  walletAlias: z.string().trim().min(1, 'Informe o apelido da carteira'),
})
export type UpdateProfileInput = z.infer<typeof UpdateProfileInput>

export const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: Password,
})
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>
