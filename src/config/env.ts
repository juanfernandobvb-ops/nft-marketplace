const { VITE_ENABLE_MOCKS, VITE_API_URL, VITE_SOCKET_URL } = import.meta.env

export const env = {
  enableMocks: VITE_ENABLE_MOCKS !== 'false',
  apiUrl: VITE_API_URL || '/api',
  socketUrl: VITE_SOCKET_URL || window.location.origin,
} as const
