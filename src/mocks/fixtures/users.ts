import type { DbUser, DbWallet } from '@/mocks/db/types'

/** Senha de ambos: `kurio1234` (guardada apenas como hash). Documentada no README. */
export const FIXTURE_PASSWORD = 'kurio1234'

export const USER_FIXTURES: DbUser[] = [
  {
    id: 'usr_ana',
    email: 'ana@kurio.dev',
    username: 'ana.colecionadora',
    displayName: 'Ana Colecionadora',
    ensName: 'ana',
    walletAlias: 'Carteira da Ana',
    avatarUrl: null,
    passwordSalt: 'b7c1f0a2e4d65839',
    passwordHash: 'a03cc800db2f793ac032c3247635a3fb8d23297e39764c006d2abc4b35e92a94',
  },
  {
    id: 'usr_bruno',
    email: 'bruno@kurio.dev',
    username: 'bruno.criador',
    displayName: 'Bruno Criador',
    ensName: null,
    walletAlias: null,
    avatarUrl: null,
    passwordSalt: '4e9d2a7c1b0f8635',
    passwordHash: 'b564b6c64ee06c4ebc531321ed28bfa45e6407d2ede95c3a1b639ee89826734b',
  },
]

/** Ana já tem carteira principal; Bruno começa sem carteiras (exercita o cadastro). */
export const WALLET_FIXTURES: Record<string, DbWallet[]> = {
  usr_ana: [
    {
      slot: 'primary',
      displayName: 'Ana Colecionadora',
      alias: 'Carteira da Ana',
      network: 'ethereum',
      profileName: 'ana',
      address: '0x5aE1c2B3d4E5f60718293a4B5c6D7e8F90a1B2c3',
      secondaryAddress: null,
      type: 'metamask',
      referralCode: 'KURIO-ANA',
      email: 'ana@kurio.dev',
      ensName: 'ana',
      updatedAt: Date.parse('2026-10-01T12:00:00Z'),
    },
  ],
}

export const FAVORITE_FIXTURES: Record<string, string[]> = {
  usr_ana: ['emerald-ape-042', 'golden-beat-207'],
}
