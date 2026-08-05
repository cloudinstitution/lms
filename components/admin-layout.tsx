"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Settings,
  Bell,
  Menu,
  LogOut,
  Sun,
  Moon,
  QrCode,
  Briefcase,
  User,
} from "lucide-react"
import { getAdminSession } from "@/lib/session-storage"
import { getNavigationForRole, getPageTitleForRole, canAccessPath } from "@/lib/role-config"
import { useAuth } from "@/lib/auth-context"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isMounted, setIsMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [adminData, setAdminData] = useState<any>(null)
  const { user, userClaims, loading } = useAuth()

  useEffect(() => {
    setIsMounted(true)
    
    // First check session storage (for backward compatibility)
    const data = getAdminSession()
    
    if (!data && !user) {
      router.push("/login")
      return
    }
      // If we have user claims, use those for role-based access
    if (userClaims) {
      const role = userClaims.role || 'teacher'
      
      // Check if the user can access this page based on role
      if (!canAccessPath(role, pathname)) {
        // Redirect to dashboard if trying to access unauthorized page
        router.push("/admin/dashboard")
        return
      }
      
      // Update admin data with claims
      const updatedData = {
        ...data,
        role: role,
        name: user?.displayName || data?.name || 'User',
        email: user?.email || data?.username || '',
        id: user?.uid || data?.id
      }
      
      setAdminData(updatedData)
      console.log('Updated admin data with claims:', updatedData)
    } else if (data) {
      // Fall back to session storage data
      // Check if the user can access this page based on role
      if (data.role && !canAccessPath(data.role, pathname)) {
        // Redirect to dashboard if trying to access unauthorized page
        router.push("/admin/dashboard")
        return
      }
      
      setAdminData(data)
    }
  }, [router, pathname, user, userClaims, loading])

  const handleLogout = () => {
    localStorage.clear()
    router.push("/login")
  }

  if (!isMounted || !adminData) {
    return null
  }  // Get navigation based on user role - explicitly cast to allowed role types
  let userRole: 'admin' | 'teacher' = 'teacher'
  
  if (adminData.role === 'admin') {
    userRole = 'admin'
  } else if (adminData.roleId === 1) {
    userRole = 'admin'
  }
  
  console.log('User role for navigation:', userRole, 'Admin data:', adminData)
  const navigation = getNavigationForRole(userRole)
  
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Mobile */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <AdminSidebar pathname={pathname} navigation={navigation} />
        </SheetContent>
      </Sheet>

      {/* Sidebar - Desktop */}
      <div className="hidden md:flex h-screen w-64">
        <AdminSidebar pathname={pathname} navigation={navigation} />
      </div>      {/* Main content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-end px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {theme === "light" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt={adminData.name || "Admin"} />
                      <AvatarFallback>{adminData.name?.[0] || "A"}</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-sm font-medium text-left">
                      <div>{adminData.name || "Admin"}</div>
                      <div className="text-xs text-muted-foreground">
                        <span>{adminData.username}</span>
                        <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary rounded-full text-[10px] uppercase font-semibold">
                          {adminData.role || 'admin'}
                        </span>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6">
            <div className="px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function AdminSidebar({ pathname, navigation }: { pathname: string, navigation: Array<{ name: string, href: string, icon: React.ElementType }> }) {
  // Get admin data to determine portal name based on role
  const adminData = getAdminSession();
    // Determine role from both role field and roleId
  let role: 'admin' | 'teacher' = 'teacher';
  if (adminData?.role === 'admin') {
    role = 'admin';
  } else if (adminData?.roleId === 1) {
    role = 'admin';
  }
  
  console.log('Sidebar role:', role, 'Admin data:', adminData);
  const portalTitle = getPageTitleForRole(role);
  
  return (    <div className="flex flex-col h-screen border-r bg-card">
      <div className="flex items-center flex-shrink-0 h-16 px-4 border-b">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <GraduationCap className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">{portalTitle}</span>
        </Link>
      </div>
      <nav className="flex-1 px-2 pb-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
              }`}
            >
              <item.icon
                className={`mr-3 flex-shrink-0 h-5 w-5 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                }`}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
