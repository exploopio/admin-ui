"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [apiKey, setApiKey] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!apiKey.trim()) {
      return;
    }

    const success = await login(apiKey.trim());
    if (success) {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Rediver Admin</CardTitle>
          <CardDescription>
            Platform administration console
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="api-key"
                  type="password"
                  placeholder="radm_xxxxxxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your admin API key to access the platform
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || !apiKey.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              Don&apos;t have an API key?{" "}
              <span className="text-primary">Contact your administrator</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
