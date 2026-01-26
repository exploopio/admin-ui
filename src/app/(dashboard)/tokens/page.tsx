"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Key,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import type { BootstrapToken } from "@/types/api";
import { toast } from "sonner";

export default function TokensPage() {
  const [tokens, setTokens] = useState<BootstrapToken[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create token dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    description: "",
    max_uses: 5,
    expires_in_hours: 24,
  });

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    token: BootstrapToken | null;
  }>({ open: false, token: null });

  const fetchTokens = useCallback(async () => {
    try {
      const response = await apiClient.listBootstrapTokens({
        page,
        per_page: perPage,
      });
      setTokens(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch tokens:", error);
      toast.error("Failed to fetch tokens");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, perPage]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTokens();
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await apiClient.createBootstrapToken({
        description: createForm.description || undefined,
        max_uses: createForm.max_uses,
        expires_in_hours: createForm.expires_in_hours,
      });
      setNewToken(response.token);
      toast.success("Bootstrap token created");
      fetchTokens();
    } catch (error) {
      console.error("Failed to create token:", error);
      toast.error("Failed to create token");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!deleteDialog.token) return;
    try {
      await apiClient.revokeBootstrapToken(deleteDialog.token.id);
      toast.success("Token revoked");
      setDeleteDialog({ open: false, token: null });
      fetchTokens();
    } catch (error) {
      console.error("Failed to revoke token:", error);
      toast.error("Failed to revoke token");
    }
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewToken(null);
    setCreateForm({
      description: "",
      max_uses: 5,
      expires_in_hours: 24,
    });
  };

  const getTokenStatus = (token: BootstrapToken) => {
    if (token.is_expired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (token.is_exhausted) {
      return <Badge variant="outline">Exhausted</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const totalPages = Math.ceil(total / perPage);

  if (isLoading) {
    return <TokensPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bootstrap Tokens</h1>
          <p className="text-muted-foreground">
            Create and manage agent bootstrap tokens
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              {newToken ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Token Created</DialogTitle>
                    <DialogDescription>
                      Copy this token now. You won&apos;t be able to see it again.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <code className="flex-1 text-sm font-mono break-all">
                        {newToken}
                      </code>
                      <CopyButton text={newToken} />
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <p className="text-yellow-800 dark:text-yellow-200">
                        This token will only be shown once. Make sure to copy it
                        before closing this dialog.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCloseCreateDialog}>Done</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Create Bootstrap Token</DialogTitle>
                    <DialogDescription>
                      Create a new token for platform agent registration
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Input
                        id="description"
                        placeholder="e.g., Production deployment batch 1"
                        value={createForm.description}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="max-uses">Max Uses</Label>
                        <Select
                          value={createForm.max_uses.toString()}
                          onValueChange={(v) =>
                            setCreateForm((f) => ({
                              ...f,
                              max_uses: parseInt(v),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expires">Expires In</Label>
                        <Select
                          value={createForm.expires_in_hours.toString()}
                          onValueChange={(v) =>
                            setCreateForm((f) => ({
                              ...f,
                              expires_in_hours: parseInt(v),
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 hour</SelectItem>
                            <SelectItem value="6">6 hours</SelectItem>
                            <SelectItem value="24">24 hours</SelectItem>
                            <SelectItem value="72">3 days</SelectItem>
                            <SelectItem value="168">1 week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseCreateDialog}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Token"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">About Bootstrap Tokens</p>
              <p className="text-muted-foreground">
                Bootstrap tokens are used for initial platform agent registration.
                Each token has a limited number of uses and expiration time.
                Once an agent registers, it receives its own API key for ongoing
                communication.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Token Prefix</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tokens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Key className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No tokens found</p>
                </TableCell>
              </TableRow>
            ) : (
              tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell>
                    <code className="text-sm">{token.token_prefix}...</code>
                  </TableCell>
                  <TableCell>
                    <span className="truncate max-w-[200px] block">
                      {token.description || "-"}
                    </span>
                  </TableCell>
                  <TableCell>{getTokenStatus(token)}</TableCell>
                  <TableCell>
                    <span className="font-medium">{token.current_uses}</span>
                    <span className="text-muted-foreground">
                      /{token.max_uses}
                    </span>
                  </TableCell>
                  <TableCell>
                    {token.is_expired ? (
                      <span className="text-muted-foreground">Expired</span>
                    ) : (
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(token.expires_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(token.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteDialog({ open: true, token })}
                      disabled={token.is_expired || token.is_exhausted}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, token: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Token</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this token? Agents that haven&apos;t
              registered yet won&apos;t be able to use it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, token: null })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke}>
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleCopy}>
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

function TokensPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="rounded-md border">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
