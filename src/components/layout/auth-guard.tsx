"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, validateSession, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // If not authenticated, try to validate existing session
      if (!isAuthenticated) {
        const isValid = await validateSession();
        if (!isValid) {
          router.push("/login");
          return;
        }
      }
      setIsChecking(false);
    };

    checkAuth();
  }, [isAuthenticated, validateSession, router]);

  // Show loading while checking auth
  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated after check, don't render children
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
