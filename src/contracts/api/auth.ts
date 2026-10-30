import { z } from 'zod'
import { Id, IsoDateTime } from '@/contracts/common'

export const Username = z
  .string()
  .trim()
  .min(3, 'Mínimo de 3 caracteres')
  .max(30, 'Máximo de 30 caracteres')
  .regex(/^[a-z0-9_.]+$/, 'Use letras minúsculas, números, "_" ou "."')

export const Password = z.string().min(8, 'Mínimo de 8 caracteres').max(72)

export const User = z.object({
  id: Id,
  email: z.email(),
  username: Username,
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof User>

export const Session = z.object({
  token: z.string().min(1),
  expiresAt: IsoDateTime,
  user: User,
})
export type Session = z.infer<typeof Session>

export const LoginInput = z.object({
  email: z.email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginInput = z.infer<typeof LoginInput>

export const RegisterInput = z.object({
  username: Username,
  email: z.email('E-mail inválido'),
  password: Password,
})
export type RegisterInput = z.infer<typeof RegisterInput>
