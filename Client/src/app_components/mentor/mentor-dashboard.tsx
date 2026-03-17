"use client"

import React, { useMemo } from "react"
import { useAuth } from "@/context/auth-context"
import useSWR from "swr"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CopyrightCard } from "./copyright-card"
import {
  BookOpen,
  Users,
  Globe,
  School,
  Mail,
  Clock,
  CheckCircle,
  MessageSquare,
} from "lucide-react"
import { Navbar } from "../navbar"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Shared Interface to match your CopyrightCard
interface CopyrightCardData {
  _id: string
  title: string
  filingNumber: string
  abstract: string
  college: string
  status: "pending" | "approved" | "rejected"
  portalLogin: string
  portalPassword: string
  fileUrl: string
  fileName: string
  extractedTitle: string
  extractedFilingNumber: string
  createdAt: string
  student: { _id?: string; name: string; email: string; college: string }
  mentor: { name: string; email: string; college: string }
  accessLevel?: "full" | "external"
}

export function MentorDashboard() {
  const { user } = useAuth()

  // Fetching data with 5s polling
  const {
    data: studentsData,
    isLoading: studentsLoading,
    mutate: mutateStudents,
  } = useSWR("/api/mentor/students", fetcher, { refreshInterval: 5000 })

  const {
    data: globalData,
    isLoading: globalLoading,
    mutate: mutateGlobal,
  } = useSWR("/api/mentor/global", fetcher, { refreshInterval: 5000 })

  const myStudents: CopyrightCardData[] = studentsData?.copyrights || []
  const globalResearch: CopyrightCardData[] = globalData?.copyrights || []

  // Memoized Stats
  const stats = useMemo(() => {
    const uniqueStudentCount = new Set(
      myStudents.map((c) => c.student?._id || c.student?.email || c.student?.name)
    ).size

    return {
      pending: myStudents.filter((c) => c.status === "pending").length,
      approved: myStudents.filter((c) => c.status === "approved").length,
      total: uniqueStudentCount,
    }
  }, [myStudents])

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  return (
    <>
    <Navbar />
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
      {/* Header Profile Section */}
      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {getInitials(user?.name || "M")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{user?.name}</h1>
                  <Badge variant="secondary" className="font-medium">
                    <BookOpen className="mr-1 h-3 w-3" />
                    Mentor
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <School className="h-4 w-4" />
                    {user?.college}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="text-primary" />} label="Students" value={stats.total} />
        <StatCard icon={<Clock className="text-orange-500" />} label="Pending" value={stats.pending} />
        <StatCard icon={<CheckCircle className="text-green-500" />} label="Approved" value={stats.approved} />
        <StatCard icon={<Globe className="text-blue-500" />} label="Global" value={globalResearch.length} />
      </div>

      <Separator />

      {/* Main Content Tabs */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" />
            My Students
            {stats.pending > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                {stats.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="global" className="gap-2">
            <Globe className="h-4 w-4" />
            Global Repository
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-0">
          {studentsLoading ? (
            <LoadingSkeleton />
          ) : myStudents.length === 0 ? (
            <EmptyState
              icon={<Users className="h-8 w-8 text-muted-foreground/50" />}
              title="No students assigned"
              description="New students will appear here once they list you as their mentor."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {myStudents.map((c) => (
                <CopyrightCard
                  key={c._id}
                  copyright={c}
                  accessLevel="full"
                  onStatusUpdate={() => mutateStudents()}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="global" className="mt-0">
          {globalLoading ? (
            <LoadingSkeleton />
          ) : globalResearch.length === 0 ? (
            <EmptyState
              icon={<Globe className="h-8 w-8 text-muted-foreground/50" />}
              title="No global research found"
              description="Filings from other departments and colleges will appear here."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {globalResearch.map((c) => (
                <CopyrightCard
                  key={c._id}
                  copyright={c}
                  accessLevel={c.accessLevel || "external"}
                  onStatusUpdate={() => mutateGlobal()}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  )
}

// Internal Helper Components
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="border-border p-6">
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-20 w-full rounded-md" />
        </Card>
      ))}
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-dashed bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background border shadow-sm">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}