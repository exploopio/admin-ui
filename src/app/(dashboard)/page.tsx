"use client";

import { useEffect, useState } from "react";
import {
  Server,
  ListTodo,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Users,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import type { PlatformStats, Agent, Job } from "@/types/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentAgents, setRecentAgents] = useState<Agent[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsData, agentsData, jobsData] = await Promise.all([
        apiClient.getPlatformStats(),
        apiClient.listAgents({ per_page: 5 }),
        apiClient.listJobs({ per_page: 5 }),
      ]);

      setStats(statsData);
      setRecentAgents(agentsData.data);
      setRecentJobs(jobsData.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-gray-500";
      case "draining":
        return "bg-yellow-500";
      case "unhealthy":
        return "bg-red-500";
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "running":
        return "bg-blue-500";
      case "pending":
      case "queued":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and real-time metrics
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_agents ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats?.online_agents ?? 0} online</span>
              {" / "}
              <span className="text-gray-500">{stats?.offline_agents ?? 0} offline</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jobs Today</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_jobs_today ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-blue-600">{stats?.running_jobs ?? 0} running</span>
              {" / "}
              <span className="text-yellow-600">{stats?.pending_jobs ?? 0} pending</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats && stats.completed_jobs_today + stats.failed_jobs_today > 0
                ? Math.round(
                    (stats.completed_jobs_today /
                      (stats.completed_jobs_today + stats.failed_jobs_today)) *
                      100
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats?.completed_jobs_today ?? 0} completed</span>
              {" / "}
              <span className="text-red-600">{stats?.failed_jobs_today ?? 0} failed</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_tenants_today ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.total_tenants_using_platform ?? 0} total using platform
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Job Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avg_job_duration_seconds
                ? formatDuration(stats.avg_job_duration_seconds)
                : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.jobs_per_minute?.toFixed(1) ?? 0} jobs/min
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agents found</p>
              ) : (
                recentAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${getStatusColor(agent.status)}`}
                      />
                      <div>
                        <p className="text-sm font-medium">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {agent.region} | {agent.current_jobs}/{agent.max_concurrent_jobs} jobs
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {agent.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs found</p>
              ) : (
                recentJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${getStatusColor(job.status)}`}
                      />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {job.scanner_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {job.target}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {job.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }
  return `${Math.round(seconds / 3600)}h`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
