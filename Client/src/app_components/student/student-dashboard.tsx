"use client"

import React, { useState, useMemo } from "react"
import { useAuth } from "@/context/auth-context"
import { UploadForm } from "./upload-form"
import { CopyrightList } from "./copyright-list"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { GraduationCap, School, Mail, LayoutDashboard, PlusCircle } from "lucide-react"
import { Navbar } from "../navbar"

export function StudentDashboard() {
  const { user } = useAuth()
  // Key used to force-refresh the CopyrightList when an upload is successful
  const [refreshKey, setRefreshKey] = useState(0)

  const initials = useMemo(() => {
    if (!user?.name) return "S"
    return user.name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }, [user?.name])

  const handleUploadSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <>
    <Navbar />
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      {/* Profile Header Section */}
      <Card className="mb-8 overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Left side: Profile Info */}
            <div className="flex flex-1 items-center gap-5 p-6">
              <Avatar className="h-16 w-16 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {user?.name}
                  </h1>
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 hover:bg-primary/10 transition-colors">
                    <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                    Student
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <School className="h-4 w-4" />
                    {user?.college}
                  </span>
                  <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Mail className="h-4 w-4" />
                    {user?.email}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8">
        {/* Upload Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <PlusCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">New Submission</h2>
          </div>
          <UploadForm onSuccess={handleUploadSuccess} />
        </section>

        <Separator className="opacity-50" />

        {/* List Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Your Portfolio</h2>
          </div>
          <CopyrightList key={refreshKey} />
        </section>
      </div>
    </div>
    </>
  )
}