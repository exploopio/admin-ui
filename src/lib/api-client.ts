// =============================================================================
// API Client - Platform Admin API
// =============================================================================

import type {
  Agent,
  Job,
  BootstrapToken,
  Admin,
  PlatformStats,
  PaginatedResponse,
  ApiError,
  AuthResponse,
  AuditLog,
  AuditAction,
  AuditActorType,
} from '@/types/api'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

class ApiClient {
  private apiKey: string | null = null

  setApiKey(key: string | null) {
    this.apiKey = key
  }

  getApiKey(): string | null {
    return this.apiKey
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.apiKey) {
      headers['X-Admin-API-Key'] = this.apiKey
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        code: 'UNKNOWN_ERROR',
        message: response.statusText,
      }))
      throw new ApiClientError(error.message, error.code, response.status)
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T
    }

    return response.json()
  }

  // ==========================================================================
  // Auth
  // ==========================================================================

  async validateApiKey(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/api/v1/admin/auth/validate')
  }

  // ==========================================================================
  // Platform Stats
  // ==========================================================================

  async getPlatformStats(): Promise<PlatformStats> {
    return this.request<PlatformStats>('/api/v1/admin/platform/stats')
  }

  // ==========================================================================
  // Agents
  // ==========================================================================

  async listAgents(params?: {
    status?: string
    region?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<Agent>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.region) searchParams.set('region', params.region)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())

    const query = searchParams.toString()
    return this.request<PaginatedResponse<Agent>>(`/api/v1/admin/agents${query ? `?${query}` : ''}`)
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request<Agent>(`/api/v1/admin/agents/${id}`)
  }

  async drainAgent(id: string): Promise<Agent> {
    return this.request<Agent>(`/api/v1/admin/agents/${id}/drain`, {
      method: 'POST',
    })
  }

  async uncordonAgent(id: string): Promise<Agent> {
    return this.request<Agent>(`/api/v1/admin/agents/${id}/uncordon`, {
      method: 'POST',
    })
  }

  async deleteAgent(id: string): Promise<void> {
    return this.request<void>(`/api/v1/admin/agents/${id}`, {
      method: 'DELETE',
    })
  }

  // ==========================================================================
  // Jobs
  // ==========================================================================

  async listJobs(params?: {
    status?: string
    agent_id?: string
    tenant_id?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<Job>> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.agent_id) searchParams.set('agent_id', params.agent_id)
    if (params?.tenant_id) searchParams.set('tenant_id', params.tenant_id)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())

    const query = searchParams.toString()
    return this.request<PaginatedResponse<Job>>(`/api/v1/admin/jobs${query ? `?${query}` : ''}`)
  }

  async getJob(id: string): Promise<Job> {
    return this.request<Job>(`/api/v1/admin/jobs/${id}`)
  }

  async cancelJob(id: string): Promise<Job> {
    return this.request<Job>(`/api/v1/admin/jobs/${id}/cancel`, {
      method: 'POST',
    })
  }

  async retryJob(id: string): Promise<Job> {
    return this.request<Job>(`/api/v1/admin/jobs/${id}/retry`, {
      method: 'POST',
    })
  }

  // ==========================================================================
  // Bootstrap Tokens
  // ==========================================================================

  async listBootstrapTokens(params?: {
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<BootstrapToken>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())

    const query = searchParams.toString()
    return this.request<PaginatedResponse<BootstrapToken>>(
      `/api/v1/admin/tokens${query ? `?${query}` : ''}`
    )
  }

  async createBootstrapToken(data: {
    description?: string
    max_uses: number
    expires_in_hours: number
    allowed_regions?: string[]
  }): Promise<{ token: string; token_id: string }> {
    return this.request<{ token: string; token_id: string }>('/api/v1/admin/tokens', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async revokeBootstrapToken(id: string): Promise<void> {
    return this.request<void>(`/api/v1/admin/tokens/${id}`, {
      method: 'DELETE',
    })
  }

  // ==========================================================================
  // Admins
  // ==========================================================================

  async listAdmins(params?: {
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<Admin>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())

    const query = searchParams.toString()
    return this.request<PaginatedResponse<Admin>>(`/api/v1/admin/admins${query ? `?${query}` : ''}`)
  }

  async createAdmin(data: {
    email: string
    name: string
    role: string
  }): Promise<{ admin: Admin; api_key: string }> {
    return this.request<{ admin: Admin; api_key: string }>('/api/v1/admin/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAdmin(
    id: string,
    data: { name?: string; role?: string; is_active?: boolean }
  ): Promise<Admin> {
    return this.request<Admin>(`/api/v1/admin/admins/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAdmin(id: string): Promise<void> {
    return this.request<void>(`/api/v1/admin/admins/${id}`, {
      method: 'DELETE',
    })
  }

  async rotateAdminApiKey(id: string): Promise<{ api_key: string }> {
    return this.request<{ api_key: string }>(`/api/v1/admin/admins/${id}/rotate-key`, {
      method: 'POST',
    })
  }

  // ==========================================================================
  // Audit Logs
  // ==========================================================================

  async listAuditLogs(params?: {
    action?: AuditAction
    actor_type?: AuditActorType
    actor_id?: string
    resource_type?: string
    resource_id?: string
    from?: string
    to?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<AuditLog>> {
    const searchParams = new URLSearchParams()
    if (params?.action) searchParams.set('action', params.action)
    if (params?.actor_type) searchParams.set('actor_type', params.actor_type)
    if (params?.actor_id) searchParams.set('actor_id', params.actor_id)
    if (params?.resource_type) searchParams.set('resource_type', params.resource_type)
    if (params?.resource_id) searchParams.set('resource_id', params.resource_id)
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())

    const query = searchParams.toString()
    return this.request<PaginatedResponse<AuditLog>>(
      `/api/v1/admin/audit-logs${query ? `?${query}` : ''}`
    )
  }

  async getAuditLog(id: string): Promise<AuditLog> {
    return this.request<AuditLog>(`/api/v1/admin/audit-logs/${id}`)
  }
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

// Singleton instance
export const apiClient = new ApiClient()
