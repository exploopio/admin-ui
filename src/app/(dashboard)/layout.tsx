'use client'

import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AuthGuard } from '@/components/layout/auth-guard'
import { Separator } from '@/components/ui/separator'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4" />
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
