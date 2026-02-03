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

// =============================================================================
// Agent Analytics Types
// =============================================================================

// Agent Session - tracks each online session with stats
export interface AgentSession {
  id: string
  agent_id: string
  started_at: string
  ended_at?: string
  duration_seconds?: number
  findings_count: number
  scans_count: number
  errors_count: number
  jobs_completed: number
  version?: string
  hostname?: string
  ip_address?: string
  region?: string
  created_at: string
}

// Agent Daily Stats - aggregated daily statistics
export interface AgentDailyStats {
  id: string
  agent_id: string
  date: string
  total_findings: number
  total_scans: number
  total_errors: number
  total_jobs: number
  online_seconds: number
  offline_seconds: number
  session_count: number
  created_at: string
  updated_at: string
}

// Agent Session Stats - aggregate stats for an agent over a time range
export interface AgentSessionStats {
  total_sessions: number
  total_findings: number
  total_scans: number
  total_errors: number
  total_jobs: number
  total_online_seconds: number
  average_session_time_seconds: number
}

// Aggregated Daily Stats - platform-wide stats
export interface AggregatedDailyStats {
  total_findings: number
  total_scans: number
  total_errors: number
  total_jobs: number
  total_online_seconds: number
  total_offline_seconds: number
  total_sessions: number
  unique_agents: number
  average_uptime_percent: number
}

// =============================================================================
// Target Asset Type Mappings
// =============================================================================

/**
 * Target to Asset Type mapping
 * Maps scanner target types (url, domain, ip, etc.) to asset types (website, domain, ip_address, etc.)
 */
export interface TargetAssetTypeMapping {
  id: string
  target_type: string // Scanner's supported_targets value: url, domain, ip, repository, file, etc.
  asset_type: string // Asset type code: website, domain, ip_address, repository, etc.
  priority: number // Priority for ordering (lower = higher priority, 10 = primary)
  is_active: boolean // Whether this mapping is active
  is_primary: boolean // Is this the primary/canonical mapping for reverse lookup? (derived from priority == 10)
  description?: string // Optional description
  created_by?: string // ID of admin who created this mapping
  created_at: string
  updated_at: string
}

/**
 * Request to create a new target mapping
 */
export interface CreateTargetMappingRequest {
  target_type: string
  asset_type: string
  priority?: number
  is_primary?: boolean // Convenience: sets priority to 10 if true
  is_active?: boolean
  description?: string
}

/**
 * Request to update a target mapping
 */
export interface UpdateTargetMappingRequest {
  priority?: number
  is_primary?: boolean // Convenience: sets priority to 10 if true
  is_active?: boolean
  description?: string
}

/**
 * Predefined target types for scanner compatibility
 */
export const TARGET_TYPES = [
  'url',
  'domain',
  'subdomain',
  'ip',
  'ip_range',
  'cidr',
  'repository',
  'file',
  'container',
  'cloud_account',
  'kubernetes',
  'network',
  'host',
  'api',
  'smart_contract',
  'wallet',
] as const

export type TargetType = (typeof TARGET_TYPES)[number]

/**
 * Asset types that can be mapped to targets
 */
export const ASSET_TYPES = [
  'domain',
  'subdomain',
  'ip_address',
  'certificate',
  'website',
  'web_application',
  'api',
  'mobile_app',
  'service',
  'repository',
  'cloud_account',
  'compute',
  'storage',
  'database',
  'serverless',
  'container_registry',
  'host',
  'server',
  'container',
  'kubernetes_cluster',
  'kubernetes_namespace',
  'network',
  'vpc',
  'subnet',
  'load_balancer',
  'firewall',
  'iam_user',
  'iam_role',
  'service_account',
  'http_service',
  'open_port',
  'discovered_url',
  'smart_contract',
  'wallet',
  'token',
  'nft_collection',
  'defi_protocol',
  'blockchain',
  'unclassified',
] as const

export type AssetType = (typeof ASSET_TYPES)[number]
