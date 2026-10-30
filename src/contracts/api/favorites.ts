import { z } from 'zod'
import { Id } from '@/contracts/common'

export const Favorites = z.object({ nftIds: z.array(Id) })
export type Favorites = z.infer<typeof Favorites>
