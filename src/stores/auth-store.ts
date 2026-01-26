// =============================================================================
// Auth Store - Zustand
// =============================================================================

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { apiClient, ApiClientError } from '@/lib/api-client'
import type { Admin } from '@/types/api'

interface AuthState {
  // State
  apiKey: string | null
  admin: Admin | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (apiKey: string) => Promise<boolean>
  logout: () => void
  validateSession: () => Promise<boolean>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      apiKey: null,
      admin: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login with API key
      login: async (apiKey: string) => {
        set({ isLoading: true, error: null })

        try {
          // Set API key in client
          apiClient.setApiKey(apiKey)

          // Validate the key - response is the admin directly
          const response = await apiClient.validateApiKey()

          set({
            apiKey,
            admin: {
              id: response.id,
              email: response.email,
              name: response.name,
              role: response.role as 'super_admin' | 'ops_admin' | 'viewer',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          return true
        } catch (err) {
          // Clear API key on failure
          apiClient.setApiKey(null)

          const message = err instanceof ApiClientError ? err.message : 'Failed to authenticate'

          set({
            apiKey: null,
            admin: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
          })

          return false
        }
      },

      // Logout
      logout: () => {
        apiClient.setApiKey(null)
        set({
          apiKey: null,
          admin: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      },

      // Validate existing session
      validateSession: async () => {
        const { apiKey } = get()

        if (!apiKey) {
          return false
        }

        set({ isLoading: true })

        try {
          apiClient.setApiKey(apiKey)
          const response = await apiClient.validateApiKey()

          set({
            admin: {
              id: response.id,
              email: response.email,
              name: response.name,
              role: response.role as 'super_admin' | 'ops_admin' | 'viewer',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            isAuthenticated: true,
            isLoading: false,
          })

          return true
        } catch {
          // Session invalid, clear state
          apiClient.setApiKey(null)
          set({
            apiKey: null,
            admin: null,
            isAuthenticated: false,
            isLoading: false,
          })

          return false
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null })
      },
    }),
    {
      name: 'rediver-admin-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        apiKey: state.apiKey,
      }),
    }
  )
)
