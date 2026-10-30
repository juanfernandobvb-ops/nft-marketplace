import { accountHandlers } from '@/mocks/handlers/account'
import { authHandlers } from '@/mocks/handlers/auth'
import { catalogHandlers } from '@/mocks/handlers/catalog'
import { commerceHandlers } from '@/mocks/handlers/commerce'
import { realtimeHandler } from '@/mocks/realtime'

export const handlers = [...authHandlers, ...catalogHandlers, ...commerceHandlers, ...accountHandlers, realtimeHandler]
