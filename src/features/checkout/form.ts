import { z } from 'zod'
import { CollectorDetails, Network } from '@/contracts'

export const CheckoutForm = CollectorDetails.extend({
  network: Network,
  /** "Usar outra carteira?": paga com a carteira secundária cadastrada. */
  useSecondary: z.boolean(),
  note: z.string().trim().max(500, 'Máximo de 500 caracteres'),
})
export type CheckoutFormValues = z.infer<typeof CheckoutForm>

const DRAFT_KEY = 'kurio:checkout-draft'

/**
 * Rascunho do formulário por usuário: sobrevive a refresh e à expiração da sessão
 * (o usuário entra de novo e retoma o pagamento com os campos preenchidos).
 */
export const checkoutDraft = {
  load(userId: string): Partial<CheckoutFormValues> | null {
    try {
      const stored = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') as {
        userId: string
        values: Partial<CheckoutFormValues>
      } | null
      return stored?.userId === userId ? stored.values : null
    } catch {
      return null
    }
  },
  save(userId: string, values: Partial<CheckoutFormValues>) {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ userId, values }))
    } catch {
      // Sem storage: o rascunho não é preservado.
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(DRAFT_KEY)
    } catch {
      // Nada a limpar.
    }
  },
}
