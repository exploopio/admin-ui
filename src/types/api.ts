// =============================================================================
// API Types - Platform Admin API
// =============================================================================

// Agent types
// Backend status: active, disabled, revoked
// Backend health: online, offline, unknown
export type AgentStatus = 'active' | 'disabled' | 'revoked'
export type AgentHealth = 'online' | 'offline' | 'unknown'

export interface Agent {
  id: string
  name: string
  type: string
  description?: string
  status: AgentStatus
  health: AgentHealth
  region?: string
  capabilities: string[]
  tools: string[]
  version?: string
  max_concurrent_jobs: number
  current_jobs: number
  cpu_percent: number
  memory_percent: number
  disk_read_mbps: number
  disk_write_mbps: number
  last_heartbeat_at?: string
  created_at: string
  updated_at: string
}

// Job types
export type JobStatus =
  | 'pending'
  | 'queued'
  | 'assigned'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timeout'
export type JobType = 'scan' | 'collect' | 'health_check'

export interface Job {
  id: string
  tenant_id: string
  tenant_name?: string
  agent_id?: string
  agent_name?: string
  type: JobType
  status: JobStatus
  scanner_name: string
  target: string
  priority: number
  queue_position?: number
  progress: number
  error_message?: string
  started_at?: string
  completed_at?: string
  timeout_seconds: number
  created_at: string
  updated_at: string
}

// Token types
export type TokenType = 'bootstrap' | 'api_key'

export interface BootstrapToken {
  id: string
  token_prefix: string
  description: string
  max_uses: number
  current_uses: number
  expires_at: string
  allowed_regions: string[]
  created_by_id: string
  created_by_name?: string
  created_at: string
  is_expired: boolean
  is_exhausted: boolean
}

// Admin types
export type AdminRole = 'super_admin' | 'ops_admin' | 'viewer'

export interface Admin {
  id: string
  email: string
  name: string
  role: AdminRole
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

// Platform stats
// Platform stats (aggregated in client)
export interface PlatformStats {
  agents: {
    total: number
    online: number
    offline: number
    draining: number
  }
  jobs: {
    queued: number
    running: number
    completed_24h: number
    failed_24h: number
  }
  tokens: {
    active: number
    expired: number
    revoked: number
  }
}

// API responses
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// Audit Log types
export type AuditAction =
  | 'agent.register'
  | 'agent.heartbeat'
  | 'agent.drain'
  | 'agent.uncordon'
  | 'agent.delete'
  | 'job.create'
  | 'job.assign'
  | 'job.complete'
  | 'job.fail'
  | 'job.cancel'
  | 'job.timeout'
  | 'token.create'
  | 'token.use'
  | 'token.revoke'
  | 'admin.create'
  | 'admin.update'
  | 'admin.delete'
  | 'admin.login'
  | 'admin.rotate_key'

export type AuditActorType = 'admin' | 'agent' | 'system'

export interface AuditLog {
  id: string
  action: AuditAction
  actor_type: AuditActorType
  actor_id: string
  actor_name?: string
  resource_type: string
  resource_id: string
  resource_name?: string
  details?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Auth
export interface AuthResponse {
  id: string
  email: string
  name: string
  role: string
}

export interface LoginRequest {
  api_key: string
}
