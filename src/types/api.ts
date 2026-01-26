// =============================================================================
// API Types - Platform Admin API
// =============================================================================

// Agent types
export type AgentStatus = "online" | "offline" | "draining" | "unhealthy";

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  region: string;
  capabilities: string[];
  tools: string[];
  version: string;
  current_jobs: number;
  max_concurrent_jobs: number;
  total_jobs_completed: number;
  total_jobs_failed: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  last_heartbeat_at: string;
  lease_expires_at: string;
  registered_at: string;
  created_at: string;
  updated_at: string;
}

// Job types
export type JobStatus = "pending" | "queued" | "assigned" | "running" | "completed" | "failed" | "cancelled" | "timeout";
export type JobType = "scan" | "collect" | "health_check";

export interface Job {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  agent_id?: string;
  agent_name?: string;
  type: JobType;
  status: JobStatus;
  scanner_name: string;
  target: string;
  priority: number;
  queue_position?: number;
  progress: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  timeout_seconds: number;
  created_at: string;
  updated_at: string;
}

// Token types
export type TokenType = "bootstrap" | "api_key";

export interface BootstrapToken {
  id: string;
  token_prefix: string;
  description: string;
  max_uses: number;
  current_uses: number;
  expires_at: string;
  allowed_regions: string[];
  created_by_id: string;
  created_by_name?: string;
  created_at: string;
  is_expired: boolean;
  is_exhausted: boolean;
}

// Admin types
export type AdminRole = "super_admin" | "ops_admin" | "viewer";

export interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Platform stats
export interface PlatformStats {
  total_agents: number;
  online_agents: number;
  offline_agents: number;
  draining_agents: number;
  unhealthy_agents: number;

  total_jobs_today: number;
  pending_jobs: number;
  running_jobs: number;
  completed_jobs_today: number;
  failed_jobs_today: number;

  avg_job_duration_seconds: number;
  jobs_per_minute: number;

  active_tenants_today: number;
  total_tenants_using_platform: number;
}

// API responses
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Audit Log types
export type AuditAction =
  | "agent.register"
  | "agent.heartbeat"
  | "agent.drain"
  | "agent.uncordon"
  | "agent.delete"
  | "job.create"
  | "job.assign"
  | "job.complete"
  | "job.fail"
  | "job.cancel"
  | "job.timeout"
  | "token.create"
  | "token.use"
  | "token.revoke"
  | "admin.create"
  | "admin.update"
  | "admin.delete"
  | "admin.login"
  | "admin.rotate_key";

export type AuditActorType = "admin" | "agent" | "system";

export interface AuditLog {
  id: string;
  action: AuditAction;
  actor_type: AuditActorType;
  actor_id: string;
  actor_name?: string;
  resource_type: string;
  resource_id: string;
  resource_name?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Auth
export interface AuthResponse {
  admin: Admin;
  expires_at: string;
}

export interface LoginRequest {
  api_key: string;
}
