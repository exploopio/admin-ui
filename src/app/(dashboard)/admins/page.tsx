"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  MoreHorizontal,
  Shield,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { Admin, AdminRole } from "@/types/api";
import { toast } from "sonner";

export default function AdminsPage() {
  const { admin: currentAdmin } = useAuthStore();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Create admin dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    email: "",
    name: "",
    role: "viewer" as AdminRole,
  });

  // Rotate key dialog
  const [rotateDialog, setRotateDialog] = useState<{
    open: boolean;
    admin: Admin | null;
    newKey: string | null;
  }>({ open: false, admin: null, newKey: null });

  // Delete confirmation
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    admin: Admin | null;
  }>({ open: false, admin: null });

  const fetchAdmins = useCallback(async () => {
    try {
      const response = await apiClient.listAdmins({
        page,
        per_page: perPage,
      });
      setAdmins(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error("Failed to fetch admins:", error);
      toast.error("Failed to fetch admins");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, perPage]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAdmins();
  };

  const handleCreate = async () => {
    if (!createForm.email || !createForm.name) {
      toast.error("Email and name are required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiClient.createAdmin({
        email: createForm.email,
        name: createForm.name,
        role: createForm.role,
      });
      setNewApiKey(response.api_key);
      toast.success("Admin created");
      fetchAdmins();
    } catch (error) {
      console.error("Failed to create admin:", error);
      toast.error("Failed to create admin");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRotateKey = async () => {
    if (!rotateDialog.admin) return;
    try {
      const response = await apiClient.rotateAdminApiKey(rotateDialog.admin.id);
      setRotateDialog((d) => ({ ...d, newKey: response.api_key }));
      toast.success("API key rotated");
    } catch (error) {
      console.error("Failed to rotate key:", error);
      toast.error("Failed to rotate API key");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.admin) return;
    try {
      await apiClient.deleteAdmin(deleteDialog.admin.id);
      toast.success("Admin deleted");
      setDeleteDialog({ open: false, admin: null });
      fetchAdmins();
    } catch (error) {
      console.error("Failed to delete admin:", error);
      toast.error("Failed to delete admin");
    }
  };

  const handleToggleActive = async (admin: Admin) => {
    try {
      await apiClient.updateAdmin(admin.id, { is_active: !admin.is_active });
      toast.success(admin.is_active ? "Admin deactivated" : "Admin activated");
      fetchAdmins();
    } catch (error) {
      console.error("Failed to update admin:", error);
      toast.error("Failed to update admin");
    }
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewApiKey(null);
    setCreateForm({
      email: "",
      name: "",
      role: "viewer",
    });
  };

  const getRoleBadge = (role: AdminRole) => {
    const config: Record<AdminRole, { variant: "default" | "secondary" | "outline" }> = {
      super_admin: { variant: "default" },
      ops_admin: { variant: "secondary" },
      viewer: { variant: "outline" },
    };
    return (
      <Badge variant={config[role].variant} className="capitalize">
        {role.replace("_", " ")}
      </Badge>
    );
  };

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const totalPages = Math.ceil(total / perPage);

  if (isLoading) {
    return <AdminsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admins</h1>
          <p className="text-muted-foreground">
            Manage platform administrators
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
          {isSuperAdmin && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                {newApiKey ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Admin Created</DialogTitle>
                      <DialogDescription>
                        Copy this API key now. You won&apos;t be able to see it again.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                        <code className="flex-1 text-sm font-mono break-all">
                          {newApiKey}
                        </code>
                        <CopyButton text={newApiKey} />
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <p className="text-yellow-800 dark:text-yellow-200">
                          This API key will only be shown once. Share it securely
                          with the new administrator.
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
                      <DialogTitle>Add Admin</DialogTitle>
                      <DialogDescription>
                        Create a new platform administrator
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="admin@example.com"
                          value={createForm.email}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              email: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={createForm.name}
                          onChange={(e) =>
                            setCreateForm((f) => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={createForm.role}
                          onValueChange={(v) =>
                            setCreateForm((f) => ({
                              ...f,
                              role: v as AdminRole,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer (read-only)</SelectItem>
                            <SelectItem value="ops_admin">Ops Admin (manage agents/tokens)</SelectItem>
                            <SelectItem value="super_admin">Super Admin (full access)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCloseCreateDialog}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating ? "Creating..." : "Create Admin"}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Permissions Info */}
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 p-4 bg-muted rounded-md">
          <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Limited Access</p>
            <p className="text-muted-foreground">
              Only super admins can create, modify, or delete other administrators.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created</TableHead>
              {isSuperAdmin && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No admins found</p>
                </TableCell>
              </TableRow>
            ) : (
              admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{admin.name}</span>
                      {admin.id === currentAdmin?.id && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{getRoleBadge(admin.role)}</TableCell>
                  <TableCell>
                    {admin.is_active ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {admin.last_login_at ? (
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(admin.last_login_at), {
                          addSuffix: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(admin.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={admin.id === currentAdmin?.id}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              setRotateDialog({ open: true, admin, newKey: null })
                            }
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Rotate API Key
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(admin)}>
                            {admin.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteDialog({ open: true, admin })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
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

      {/* Rotate Key Dialog */}
      <Dialog
        open={rotateDialog.open}
        onOpenChange={(open) => setRotateDialog({ open, admin: null, newKey: null })}
      >
        <DialogContent>
          {rotateDialog.newKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Rotated</DialogTitle>
                <DialogDescription>
                  Copy the new API key now. The old key has been invalidated.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <code className="flex-1 text-sm font-mono break-all">
                    {rotateDialog.newKey}
                  </code>
                  <CopyButton text={rotateDialog.newKey} />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    setRotateDialog({ open: false, admin: null, newKey: null })
                  }
                >
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Rotate API Key</DialogTitle>
                <DialogDescription>
                  This will generate a new API key for{" "}
                  <span className="font-medium">{rotateDialog.admin?.name}</span>.
                  The current key will be immediately invalidated.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() =>
                    setRotateDialog({ open: false, admin: null, newKey: null })
                  }
                >
                  Cancel
                </Button>
                <Button onClick={handleRotateKey}>Rotate Key</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, admin: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Admin</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteDialog.admin?.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, admin: null })}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
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

function AdminsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>
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
