import {
  ChangePasswordInput,
  endpoints,
  Profile,
  UpdateProfileInput,
  Wallet,
  WalletConnection,
  WalletConnectInput,
  WalletInput,
  Wallets,
  WalletSlot,
} from '@/contracts'
import { createSalt, hashPassword, verifyPassword } from '@/mocks/db/password'
import { getDb, persist } from '@/mocks/db/store'
import { toProfile, toWallet } from '@/mocks/db/views'
import { fail, json, noContent, parseBody, requireUser, route } from '@/mocks/handlers/http'

const MAX_AVATAR_BYTES = 1024 * 1024
const WALLET_NAMES = { metamask: 'MetaMask', walletconnect: 'WalletConnect', coinbase: 'Coinbase Wallet' } as const
const NETWORK_NAMES = { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' } as const

async function toDataUrl(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${file.type};base64,${btoa(binary)}`
}

export const accountHandlers = [
  route('GET', endpoints.profile.root, ({ request }) => json(Profile, toProfile(requireUser(request)))),

  route('PATCH', endpoints.profile.root, async ({ request }) => {
    const user = requireUser(request)
    const input = await parseBody(request, UpdateProfileInput)
    const others = getDb().users.filter((candidate) => candidate.id !== user.id)
    const fieldErrors: Record<string, string> = {}
    if (others.some((other) => other.email.toLowerCase() === input.email.toLowerCase())) {
      fieldErrors.email = 'Este e-mail já está em uso.'
    }
    if (others.some((other) => other.username === input.username)) {
      fieldErrors.username = 'Este nome de usuário já está em uso.'
    }
    if (Object.keys(fieldErrors).length) throw fail.conflict('Não foi possível salvar o perfil.', fieldErrors)
    Object.assign(user, input)
    persist()
    return json(Profile, toProfile(user))
  }),

  route('POST', endpoints.profile.avatar, async ({ request }) => {
    const user = requireUser(request)
    const file = (await request.formData()).get('avatar')
    if (!(file instanceof File)) throw fail.validation({ avatar: 'Envie uma imagem.' })
    if (!file.type.startsWith('image/')) throw fail.validation({ avatar: 'O arquivo precisa ser uma imagem.' })
    if (file.size > MAX_AVATAR_BYTES) throw fail.validation({ avatar: 'A imagem deve ter até 1 MB.' })
    user.avatarUrl = await toDataUrl(file)
    persist()
    return json(Profile, toProfile(user))
  }),

  route('DELETE', endpoints.profile.avatar, ({ request }) => {
    const user = requireUser(request)
    user.avatarUrl = null
    persist()
    return json(Profile, toProfile(user))
  }),

  route('POST', endpoints.profile.password, async ({ request }) => {
    const user = requireUser(request)
    const input = await parseBody(request, ChangePasswordInput)
    if (!(await verifyPassword(input.currentPassword, user.passwordSalt, user.passwordHash))) {
      throw fail.validation({ currentPassword: 'Senha atual incorreta.' })
    }
    if (input.currentPassword === input.newPassword) {
      throw fail.validation({ newPassword: 'A nova senha deve ser diferente da atual.' })
    }
    user.passwordSalt = createSalt()
    user.passwordHash = await hashPassword(input.newPassword, user.passwordSalt)
    persist()
    return noContent()
  }),

  route('GET', endpoints.wallets.list, ({ request }) => {
    const wallets = getDb().wallets[requireUser(request).id] ?? {}
    return json(Wallets, {
      primary: wallets.primary ? toWallet(wallets.primary) : null,
      secondary: wallets.secondary ? toWallet(wallets.secondary) : null,
    })
  }),

  route('POST', endpoints.wallets.connect, async ({ request, param }) => {
    const user = requireUser(request)
    const slot = WalletSlot.safeParse(param('slot'))
    const wallet = slot.success ? getDb().wallets[user.id]?.[slot.data] : undefined
    if (!slot.success || !wallet) throw fail.notFound('Carteira não cadastrada.')
    const input = await parseBody(request, WalletConnectInput)
    if (input.provider !== wallet.type) {
      throw fail.validation({ provider: `Esta carteira está cadastrada como ${WALLET_NAMES[wallet.type]}.` })
    }
    if (input.network !== wallet.network) {
      throw fail.validation({ network: `Esta carteira opera na rede ${NETWORK_NAMES[wallet.network]}.` })
    }
    return json(WalletConnection, {
      slot: slot.data,
      provider: input.provider,
      network: input.network,
      address: wallet.address,
      connectedAt: new Date().toISOString(),
    })
  }),

  route('PUT', endpoints.wallets.slot, async ({ request, param }) => {
    const user = requireUser(request)
    const slot = WalletSlot.safeParse(param('slot'))
    if (!slot.success) throw fail.notFound('Tipo de carteira inexistente.')
    const input = await parseBody(request, WalletInput)
    const db = getDb()
    const wallet = { ...input, slot: slot.data, updatedAt: Date.now() }
    db.wallets[user.id] = { ...db.wallets[user.id], [slot.data]: wallet }
    persist()
    return json(Wallet, toWallet(wallet))
  }),
]
