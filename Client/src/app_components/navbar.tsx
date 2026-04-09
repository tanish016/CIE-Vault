"use client"

import { useEffect, useMemo } from "react"
import { Link } from 'react-router-dom';
import { useAuth } from "@/context/auth-context"
import useSWR from 'swr'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Shield, LogOut, LayoutDashboard, ChevronDown, User, PlusCircle, Bell, Eye } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

function getNotificationContent(n: any) {
  // Mentor notification when a student submits a new filing (type: request)
  if (n.type === "request") {
    const studentName = n.data?.studentName || "Student"
    const title = n.data?.title ? `${studentName} submitted "${n.data.title}"` : `${studentName} submitted a new filing`
    return {
      title,
      description: n.data?.message || `A new submission from ${studentName}`,
    }
  }

  // Student notifications about access requests on their document
  if (n.type === "access_request") {
    const requester = n.data?.requesterName || "A user"
    const titleText = n.data?.title || "a document"
    return {
      title: `${requester} requested access`,
      description: `${requester} requested access to "${titleText}".`,
    }
  }

  // Student notifications when requester cancels their request
  if (n.type === "request_cancelled") {
    const requester = n.data?.requesterName || "A user"
    const titleText = n.data?.title || "a document"
    return {
      title: `${requester} cancelled request`,
      description: `${requester} cancelled their request to view "${titleText}".`,
    }
  }

  // Notifications for when access was granted to the requester
  if (n.type === "access_granted") {
    const approver = n.data?.approvedBy || "Owner"
    const titleText = n.data?.title || "a document"
    return {
      title: `Access granted by ${approver}`,
      description: `${approver} approved your request to view "${titleText}". You can now view the document.`,
    }
  }

  // Notifications for when access was denied to the requester
  if (n.type === "access_denied") {
    const approver = n.data?.approvedBy || "Owner"
    const titleText = n.data?.title || "a document"
    return {
      title: `Access denied by ${approver}`,
      description: `${approver} denied your request to view "${titleText}".`,
    }
  }

  if (n.type === "comment") {
    const mentorName = n.data?.mentorName || "Mentor"
    return {
      title: `New comment from ${mentorName}`,
      description: n.data?.text || "You received a new comment.",
    }
  }

  if (n.type === "status") {
    const mentorName = n.data?.mentorName || "Mentor"
    const status = n.data?.status || "updated"
    return {
      title: `Request ${status}`,
      description: `Your request was ${status} by ${mentorName}`,
    }
  }

  if (n.type === "published") {
    const studentName = n.data?.studentName || "Student"
    return {
      title: `${studentName} published a document`,
      description: n.data?.isPublic ? `A document was published and is publicly available.` : `A document was updated.`,
    }
  }

  return {
    title: "Notification",
    description: "You have a new update.",
  }
}

export function Navbar() {
  const { user, logout, isLoading } = useAuth()

  // Memoized initials calculation to avoid re-runs on every render
  const initials = useMemo(() => {
    if (!user?.name) return "U"
    return user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [user?.name])

  const dashboardHref = user?.role === "student" ? "/student" : "/mentor"
  const navigate = useNavigate()
  const location = useLocation()

  // Notifications
  const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json())
  const { data: notesData, mutate } = useSWR('/api/notifications', fetcher, {
    refreshInterval: 5000,
  })
  const notifications = notesData?.notifications || []
  const unreadCount = notifications.filter((n: any) => !n.read).length

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'PATCH', credentials: 'include' })
      mutate()
    } catch (err) {
      console.error(err)
    }
  }

  // When user directly opens their dashboard and sees content, clear unread badge but keep history.
  useEffect(() => {
    const isOnDashboard = location.pathname === dashboardHref
    if (isOnDashboard && unreadCount > 0) {
      markAllRead()
    }
  }, [location.pathname, dashboardHref, unreadCount])

  const markRead = async (id: string, targetUrl?: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' })
      mutate()
      if (targetUrl) navigate(targetUrl)
    } catch (err) {
      console.error(err)
    }
  }

  const clearNotificationHistory = async () => {
    try {
      await fetch('/api/notifications/clear', { method: 'DELETE', credentials: 'include' })
      mutate({ notifications: [] }, false)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          
          {/* Brand Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 transition-all hover:scale-[1.02] active:scale-95"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/20">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden text-xl font-extrabold tracking-tight text-foreground xs:inline-block">
              CIE-Vault
            </span>
          </Link>

          {/* Navigation Items */}
          <nav className="flex items-center gap-2 sm:gap-4">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                
                {/* Quick Action (Desktop) */}
                {/* Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground">
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-80 p-1">
                    <DropdownMenuLabel className="px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span>Notifications</span>
                        {notifications.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={clearNotificationHistory}
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {notifications.length === 0 && (
                      <div className="p-3 text-sm text-muted-foreground">No notifications</div>
                    )}
                    {notifications.map((n: any) => (
                      <DropdownMenuItem key={n._id} className="flex flex-col items-start gap-1 py-2">
                        {(() => {
                          const content = getNotificationContent(n)
                          return (
                            <>
                              <div className="flex w-full items-center justify-between">
                                <div className="text-sm font-medium text-foreground">{!n.read ? "New Notification" : content.title}</div>
                                {!n.read && <Badge variant="destructive" className="text-[10px]">New</Badge>}
                              </div>
                              <div className="w-full text-xs text-muted-foreground truncate">{content.description}</div>
                            </>
                          )
                        })()}
                        <div className="mt-2 flex w-full justify-end">
                          <Button size="sm" variant="ghost" onClick={() => markRead(n._id, dashboardHref)}>View</Button>
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" asChild className="hidden md:flex">
                      <Link to={dashboardHref}>
                        <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                        Dashboard
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Manage your filings</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" asChild className="hidden md:flex">
                      <Link to="/public">
                        <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                        Public
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Browse public papers</p>
                  </TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="hidden h-6 md:block" />

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="group flex items-center gap-2 rounded-full pl-1 pr-2 transition-colors hover:bg-muted"
                    >
                      <Avatar className="h-8 w-8 border border-border transition-transform group-hover:scale-105">
                        {user?.avatarUrl ? (
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {initials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="hidden max-w-[120px] truncate text-sm font-semibold text-foreground sm:inline-block">
                        {user.name}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </Button>
                  </DropdownMenuTrigger>
                  
                  <DropdownMenuContent align="end" className="w-64 p-1 shadow-xl">
                    <DropdownMenuLabel className="px-3 py-3">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-bold leading-none text-foreground">{user.name}</p>
                        <p className="text-xs font-medium leading-none text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider">
                          {user.role}
                        </Badge>
                        <span className="truncate text-[11px] font-medium text-muted-foreground">
                          {user.college}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link to={dashboardHref} className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>

                    {user.role === "student" && (
                      <DropdownMenuItem asChild className="cursor-pointer py-2">
                        <Link to="/student" className="flex items-center gap-2">
                          <PlusCircle className="h-4 w-4 text-muted-foreground" />
                          New Filing
                        </Link>
                      </DropdownMenuItem>
                    )}

                    {user.role === "student" && (
                      <DropdownMenuItem asChild className="cursor-pointer py-2">
                        <Link to="/plagiarism-check" className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          Plagiarism check
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem asChild className="cursor-pointer py-2">
                      <Link to="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Account Settings
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                      onClick={logout}
                      className="flex cursor-pointer items-center gap-2 py-2 text-destructive transition-colors focus:bg-destructive focus:text-destructive-foreground"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild className="text-sm font-semibold">
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button size="sm" asChild className="rounded-full bg-primary px-5 text-sm font-bold shadow-md shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </header>
    </TooltipProvider>
  )
}