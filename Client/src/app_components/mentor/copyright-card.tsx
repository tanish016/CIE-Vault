
import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  FileText,
  Calendar,
  User,
  School,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Sparkles,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react"
import { CommentSection } from "./comment-section"

// Constants for better maintainability
const STATUS_CONFIG = {
  pending: { variant: "outline", label: "Pending Review", color: "" },
  approved: { variant: "default", label: "Approved", color: "bg-green-600 hover:bg-green-700" },
  rejected: { variant: "destructive", label: "Rejected", color: "" },
} as const;

interface CopyrightCardProps {
  copyright: {
    _id: string
    title: string
    filingNumber: string
    abstract: string
    college: string
    status: keyof typeof STATUS_CONFIG
    portalLogin: string
    portalPassword: string
    fileUrl: string
    fileName: string
    extractedTitle?: string
    extractedFilingNumber?: string
    createdAt: string
    student: {
      _id?: string
      name: string
      email: string
      college: string
    }
    mentor: {
      name: string
      email: string
      college: string
    }
  }
  accessLevel: "full" | "external"
  onStatusUpdate?: () => void
}

export function CopyrightCard({ copyright, accessLevel, onStatusUpdate }: CopyrightCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<"approved" | "rejected" | null>(null)

  // Memoized helpers for performance
  const initials = useMemo(() => 
    (copyright.student?.name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
    [copyright.student?.name]
  )

  const handleStatusUpdate = useCallback(async (status: "approved" | "rejected") => {
    setUpdatingStatus(status)
    try {
      const res = await fetch(`/api/copyrights/${copyright._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) onStatusUpdate?.()
    } catch (error) {
      console.error("Status update failed:", error)
    } finally {
      setUpdatingStatus(null)
    }
  }, [copyright._id, onStatusUpdate])

  const isFullAccess = accessLevel === "full"
  const isFileHidden = !copyright.fileUrl || copyright.fileUrl.includes("[Hidden")

  return (
    <TooltipProvider>
      <Card className="overflow-hidden border-border transition-all duration-200 hover:shadow-lg">
        <CardHeader className="pb-3 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10 border shadow-sm">
                <AvatarFallback className="bg-primary/5 text-xs font-bold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="text-lg font-bold leading-tight tracking-tight text-foreground">
                  {copyright.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                      <User className="h-3.5 w-3.5" />
                      {copyright.student?.name || "Unknown"}
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{copyright.student?.email}</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5" />
                    {copyright.college}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(copyright.createdAt).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'short', day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
              <Badge 
                variant="secondary" 
                className={`flex items-center gap-1 px-2 py-0.5 ${isFullAccess ? "bg-primary/10 text-primary border-primary/20" : ""}`}
              >
                {isFullAccess ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {accessLevel === "full" ? "Assigned Mentor" : "External View"}
              </Badge>
              <Badge
                variant={STATUS_CONFIG[copyright.status].variant}
                className={`capitalize ${copyright.status === 'approved' ? STATUS_CONFIG.approved.color : ''}`}
              >
                {STATUS_CONFIG[copyright.status].label}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <p className={`text-sm leading-relaxed text-muted-foreground ${!expanded && "line-clamp-2"}`}>
              {copyright.abstract}
            </p>
          </div>

          <Collapsible open={expanded} onOpenChange={setExpanded} className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-primary hover:bg-primary/5">
                {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
                {expanded ? "Collapse Details" : "View Details & Comments"}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col gap-5 rounded-xl border bg-muted/30 p-5 shadow-inner">
                
                {/* AI Extraction Section */}
                {(copyright.extractedTitle || copyright.extractedFilingNumber) && (
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        AI PDF Insight
                      </h4>
                    </div>
                    <div className="grid gap-2 rounded-lg bg-card border p-3 text-sm shadow-sm">
                      {copyright.extractedTitle && (
                        <div className="grid grid-cols-[80px_1fr]">
                          <span className="font-semibold text-muted-foreground">Title:</span>
                          <span className="text-foreground">{copyright.extractedTitle}</span>
                        </div>
                      )}
                      {copyright.extractedFilingNumber && (
                        <div className="grid grid-cols-[80px_1fr]">
                          <span className="font-semibold text-muted-foreground">Filing #:</span>
                          <span className="font-mono text-primary">{copyright.extractedFilingNumber}</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                <Separator className="opacity-50" />

                {/* Credentials Section */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-semibold">Government Portal Access</h4>
                    </div>
                    {isFullAccess && (
                      <Button
                        variant="outline"
                        size="xs"
                        className="h-7 text-[11px]"
                        onClick={() => setShowCredentials(!showCredentials)}
                      >
                        {showCredentials ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                        {showCredentials ? "Hide" : "Reveal"}
                      </Button>
                    )}
                  </div>

                  {isFullAccess ? (
                    showCredentials ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border bg-card p-3 font-mono text-sm animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-muted-foreground font-sans">Username</span>
                          <span className="truncate">{copyright.portalLogin || "—"}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase text-muted-foreground font-sans">Password</span>
                          <span className="truncate">{copyright.portalPassword || "—"}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-xs text-muted-foreground">
                        <Lock className="h-3 w-3" /> Click Reveal to see credentials
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-orange-500/5 border border-orange-500/20 p-3 text-xs text-orange-600 dark:text-orange-400">
                      <Lock className="h-4 w-4 shrink-0" />
                      Only the assigned mentor can view portal credentials.
                    </div>
                  )}
                </section>

                <Separator className="opacity-50" />

                {/* File Management */}
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold">Legal Documentation</h4>
                  {!isFileHidden ? (
                    <div className="flex items-center justify-between rounded-lg border bg-card p-2 pr-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="rounded bg-primary/10 p-2">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {copyright.fileName || "document.pdf"}
                        </span>
                      </div>
                      <Button variant="link" size="sm" asChild>
                         <a href={copyright.fileUrl} target="_blank" rel="noopener noreferrer">View File</a>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                      <XCircle className="h-3.5 w-3.5" /> 
                      {accessLevel === "external" ? "Protected content" : "No file attached"}
                    </div>
                  )}
                </section>

                {/* Status Actions (Mentor Only) */}
                {isFullAccess && copyright.status === "pending" && (
                  <section className="rounded-lg bg-background border p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-sm font-bold">Review Verdict</p>
                      <div className="flex gap-2">
                        <ReviewDialog 
                          type="approved" 
                          title={copyright.title} 
                          loading={updatingStatus === "approved"}
                          onConfirm={() => handleStatusUpdate("approved")} 
                        />
                        <ReviewDialog 
                          type="rejected" 
                          title={copyright.title} 
                          loading={updatingStatus === "rejected"}
                          onConfirm={() => handleStatusUpdate("rejected")} 
                        />
                      </div>
                    </div>
                  </section>
                )}

                <div className="pt-2">
                  <CommentSection copyrightId={copyright._id} />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

/**
 * Sub-component for Cleaner Review Logic
 */
function ReviewDialog({ type, title, onConfirm, loading }: { 
  type: "approved" | "rejected", 
  title: string, 
  onConfirm: () => void,
  loading: boolean
}) {
  const isApprove = type === "approved";
  
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          className={isApprove 
            ? "border-green-500/50 text-green-600 hover:bg-green-50" 
            : "border-red-500/50 text-red-600 hover:bg-red-50"
          }
        >
          {loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : (isApprove ? <CheckCircle className="mr-1 h-3.5 w-3.5" /> : <XCircle className="mr-1 h-3.5 w-3.5" />)}
          {isApprove ? "Approve" : "Reject"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isApprove ? "Confirm Approval" : "Confirm Rejection"}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to {type} <strong>{title}</strong>? 
            {isApprove ? " The student will be notified of this update." : " We recommend leaving a comment below to explain the reason for rejection."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className={isApprove ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}