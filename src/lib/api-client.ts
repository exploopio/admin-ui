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
  AgentSession,
  AgentDailyStats,
  AgentSessionStats,
  AggregatedDailyStats,
  TargetAssetTypeMapping,
  CreateTargetMappingRequest,
  UpdateTargetMappingRequest,
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
    // Fetch stats from separate endpoints and combine
    const [agentStats, jobStats] = await Promise.all([
      this.getAgentStats().catch(() => ({ total: 0, online: 0, offline: 0, disabled: 0 })),
      this.getJobStats().catch(() => ({ queued: 0, running: 0, completed: 0, failed: 0 })),
    ])

    return {
      agents: {
        total: agentStats.total,
        online: agentStats.online,
        offline: agentStats.offline,
        draining: agentStats.disabled, // Map disabled to draining for UI
      },
      jobs: {
        queued: jobStats.queued,
        running: jobStats.running,
        completed_24h: jobStats.completed,
        failed_24h: jobStats.failed,
      },
      tokens: {
        active: 0, // TODO: Add token stats endpoint
        expired: 0,
        revoked: 0,
      },
    }
  }

  // ==========================================================================
  // Platform Agents
  // ==========================================================================

  async listAgents(params?: {
    status?: string
    region?: string
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<Agent>> {
    const searchParams = new URLSearchParams()
    if (params?.status) {
      // Map frontend status to backend health/status params
      if (params.status === 'online' || params.status === 'offline') {
        searchParams.set('health', params.status)
      } else if (params.status === 'draining') {
        // Backend doesn't support 'draining' as a status/health filter currently
        // so we might filter client-side or send it if backend supported it in future.
        // For now, we'll send it as 'status' in likely case backend adds support
        // or just ignore if it doesn't break anything.
        // Actually, let's map it to 'disabled' if that's what backend uses?
        // Checking routes.go/handler, backend uses 'health' (online, offline).
        // It also has a 'disabled' status in the Agent struct but expects 'health' query param?
        // Let's just pass 'status' as is for non-health values to be safe, 
        // though backend might ignore it.
        // Better yet: Backend 'ListPlatformAgents' looks at 'health' query param.
        // It doesn't seem to look at 'status' query param at all.
        // However, we want to try our best.
      }
      // Keep original status param just in case (or if we add support later)
      searchParams.set('status', params.status)
    }
    if (params?.region) searchParams.set('region', params.region)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())

    const query = searchParams.toString()
    return this.request<PaginatedResponse<Agent>>(`/api/v1/admin/platform-agents${query ? `?${query}` : ''}`)
  }

  async getAgent(id: string): Promise<Agent> {
    return this.request<Agent>(`/api/v1/admin/platform-agents/${id}`)
  }

  async getAgentStats(): Promise<{ total: number; online: number; offline: number; disabled: number }> {
    return this.request<{ total: number; online: number; offline: number; disabled: number }>('/api/v1/admin/platform-agents/stats')
  }

  async disableAgent(id: string): Promise<Agent> {
    return this.request<Agent>(`/api/v1/admin/platform-agents/${id}/disable`, {
      method: 'POST',
    })
  }

  async enableAgent(id: string): Promise<Agent> {
    return this.request<Agent>(`/api/v1/admin/platform-agents/${id}/enable`, {
      method: 'POST',
    })
  }

  async deleteAgent(id: string): Promise<void> {
    return this.request<void>(`/api/v1/admin/platform-agents/${id}`, {
      method: 'DELETE',
    })
  }

  // Legacy aliases for backward compatibility
  async drainAgent(id: string): Promise<Agent> {
    return this.disableAgent(id)
  }

  async uncordonAgent(id: string): Promise<Agent> {
    return this.enableAgent(id)
  }

  // ==========================================================================
  // Platform Jobs
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
    return this.request<PaginatedResponse<Job>>(`/api/v1/admin/platform-jobs${query ? `?${query}` : ''}`)
  }

  async getJob(id: string): Promise<Job> {
    return this.request<Job>(`/api/v1/admin/platform-jobs/${id}`)
  }

  async getJobStats(): Promise<{ queued: number; running: number; completed: number; failed: number }> {
    return this.request<{ queued: number; running: number; completed: number; failed: number }>('/api/v1/admin/platform-jobs/stats')
  }

  async cancelJob(id: string): Promise<Job> {
    return this.request<Job>(`/api/v1/admin/platform-jobs/${id}/cancel`, {
      method: 'POST',
    })
  }

  async retryJob(id: string): Promise<Job> {
    return this.request<Job>(`/api/v1/admin/platform-jobs/${id}/retry`, {
      method: 'POST',
    })
  }

  // ==========================================================================
  // Bootstrap Tokens
  // ==========================================================================

  async listBootstrapTokens(params?: {
    page?: number
    per_page?: number
    status?: string
    search?: string
  }): Promise<PaginatedResponse<BootstrapToken>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())
    if (params?.status) searchParams.set('status', params.status)
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    return this.request<PaginatedResponse<BootstrapToken>>(
      `/api/v1/admin/bootstrap-tokens${query ? `?${query}` : ''}`
    )
  }

  async createBootstrapToken(data: {
    description?: string
    max_uses: number
    expires_in_hours: number
    allowed_regions?: string[]
  }): Promise<{ token: string; token_id: string }> {
    return this.request<{ token: string; token_id: string }>('/api/v1/admin/bootstrap-tokens', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async revokeBootstrapToken(id: string): Promise<void> {
    // Backend uses POST for revoke, not DELETE
    return this.request<void>(`/api/v1/admin/bootstrap-tokens/${id}/revoke`, {
      method: 'POST',
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
    // Backend doesn't support filtering by 'actor_type' yet, but we'll leave this
    // in case it gets added. 
    if (params?.actor_type) searchParams.set('actor_type', params.actor_type)

    // Valid mapping: Frontend 'actor_id' -> Backend 'admin_id' for Admin actors
    // Note: Backend audit log list also supports 'resource_id'.
    // Use 'admin_id' if actor_type is 'admin' or just pass generic ID/User ID?
    // The backend handler `List` specifically looks for `r.URL.Query().Get("admin_id")`.
    if (params?.actor_id) {
      searchParams.set('admin_id', params.actor_id)
      // Also set actor_id for completeness if backend adds generic support
      searchParams.set('actor_id', params.actor_id)
    }
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

  async getAuditLogStats(): Promise<{
    total: number
    failed_24h: number
    recent_actions: AuditLog[]
  }> {
    return this.request<{
      total: number
      failed_24h: number
      recent_actions: AuditLog[]
    }>('/api/v1/admin/audit-logs/stats')
  }

  // ==========================================================================
  // Agent Analytics (Sessions & Daily Stats)
  // ==========================================================================

  async listAgentSessions(
    agentId: string,
    params?: {
      is_active?: boolean
      started_at?: string
      ended_at?: string
      page?: number
      per_page?: number
    }
  ): Promise<PaginatedResponse<AgentSession>> {
    const searchParams = new URLSearchParams()
    if (params?.is_active !== undefined) searchParams.set('is_active', params.is_active.toString())
    if (params?.started_at) searchParams.set('started_at', params.started_at)
    if (params?.ended_at) searchParams.set('ended_at', params.ended_at)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())

    const query = searchParams.toString()
    return this.request<PaginatedResponse<AgentSession>>(
      `/api/v1/admin/agents/${agentId}/sessions${query ? `?${query}` : ''}`
    )
  }

  async getActiveAgentSession(agentId: string): Promise<AgentSession | null> {
    try {
      return await this.request<AgentSession>(`/api/v1/admin/agents/${agentId}/sessions/active`)
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        return null
      }
      throw error
    }
  }

  async getAgentSessionStats(
    agentId: string,
    params?: {
      started_at?: string
      ended_at?: string
    }
  ): Promise<AgentSessionStats> {
    const searchParams = new URLSearchParams()
    if (params?.started_at) searchParams.set('started_at', params.started_at)
    if (params?.ended_at) searchParams.set('ended_at', params.ended_at)

    const query = searchParams.toString()
    return this.request<AgentSessionStats>(
      `/api/v1/admin/agents/${agentId}/sessions/stats${query ? `?${query}` : ''}`
    )
  }

  async listAgentDailyStats(
    agentId: string,
    params?: {
      from?: string
      to?: string
      page?: number
      per_page?: number
    }
  ): Promise<PaginatedResponse<AgentDailyStats>> {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())

    const query = searchParams.toString()
    return this.request<PaginatedResponse<AgentDailyStats>>(
      `/api/v1/admin/agents/${agentId}/stats${query ? `?${query}` : ''}`
    )
  }

  async getAgentTimeSeries(
    agentId: string,
    params?: {
      from?: string
      to?: string
    }
  ): Promise<AgentDailyStats[]> {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)

    const query = searchParams.toString()
    return this.request<AgentDailyStats[]>(
      `/api/v1/admin/agents/${agentId}/stats/daily${query ? `?${query}` : ''}`
    )
  }

  async getAggregatedStats(params?: {
    from?: string
    to?: string
  }): Promise<AggregatedDailyStats> {
    const searchParams = new URLSearchParams()
    if (params?.from) searchParams.set('from', params.from)
    if (params?.to) searchParams.set('to', params.to)

    const query = searchParams.toString()
    return this.request<AggregatedDailyStats>(
      `/api/v1/admin/agents/stats/aggregated${query ? `?${query}` : ''}`
    )
  }

  // ==========================================================================
  // Target Asset Type Mappings
  // ==========================================================================

  async listTargetMappings(params?: {
    target_type?: string
    asset_type?: string
    is_primary?: boolean
    is_active?: boolean
    page?: number
    per_page?: number
  }): Promise<PaginatedResponse<TargetAssetTypeMapping>> {
    const searchParams = new URLSearchParams()
    if (params?.target_type) searchParams.set('target_type', params.target_type)
    if (params?.asset_type) searchParams.set('asset_type', params.asset_type)
    if (params?.is_primary !== undefined) searchParams.set('is_primary', params.is_primary.toString())
    if (params?.is_active !== undefined) searchParams.set('is_active', params.is_active.toString())
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.per_page) searchParams.set('per_page', params.per_page.toString())

    const query = searchParams.toString()
    return this.request<PaginatedResponse<TargetAssetTypeMapping>>(
      `/api/v1/admin/target-mappings${query ? `?${query}` : ''}`
    )
  }

  async getTargetMapping(id: string): Promise<TargetAssetTypeMapping> {
    return this.request<TargetAssetTypeMapping>(`/api/v1/admin/target-mappings/${id}`)
  }

  async createTargetMapping(data: CreateTargetMappingRequest): Promise<TargetAssetTypeMapping> {
    return this.request<TargetAssetTypeMapping>('/api/v1/admin/target-mappings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTargetMapping(
    id: string,
    data: UpdateTargetMappingRequest
  ): Promise<TargetAssetTypeMapping> {
    return this.request<TargetAssetTypeMapping>(`/api/v1/admin/target-mappings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteTargetMapping(id: string): Promise<void> {
    return this.request<void>(`/api/v1/admin/target-mappings/${id}`, {
      method: 'DELETE',
    })
  }

  async getTargetMappingStats(): Promise<{
    total: number
    by_target_type: Record<string, number>
    by_asset_type: Record<string, number>
  }> {
    return this.request<{
      total: number
      by_target_type: Record<string, number>
      by_asset_type: Record<string, number>
    }>('/api/v1/admin/target-mappings/stats')
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
