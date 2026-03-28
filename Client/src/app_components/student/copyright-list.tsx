import React, { useMemo, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
import { FileText, Calendar, User, Inbox, Sparkles, AlertCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// Constants for UI consistency
const STATUS_MAP = {
  pending: { variant: "outline", label: "Pending Review", className: "text-orange-500 border-orange-200 bg-orange-50/50" },
  approved: { variant: "default", label: "Approved", className: "bg-green-600 hover:bg-green-700" },
  rejected: { variant: "destructive", label: "Rejected", className: "" },
} as const;

interface CopyrightItem {
  _id: string
  title: string
  filingNumber: string
  abstract: string
  college: string
  status: keyof typeof STATUS_MAP
  extractedTitle?: string
  extractedFilingNumber?: string
  createdAt: string
  mentor?: {
    name: string
    email: string
    college: string
  }
}

export function CopyrightList() {
  const { data, isLoading, error } = useSWR("/api/copyrights", fetcher, {
    refreshInterval: 5000,
  })

  const copyrights: CopyrightItem[] = useMemo(() => data?.copyrights || [], [data])

  if (isLoading) return <LoadingSkeleton />

  if (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm font-medium text-destructive">Failed to load filings</p>
          <button onClick={() => window.location.reload()} className="mt-2 text-xs underline">Retry</button>
        </CardContent>
      </Card>
    )
  }

  if (copyrights.length === 0) {
    return (
      <Card className="border-dashed border-border bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background border shadow-sm">
            <Inbox className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No filings yet</h3>
          <p className="max-w-xs text-sm text-muted-foreground mt-1">
            Upload your first filing using the form above to track your progress.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-4 bg-muted/10">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              Your total filings
            </CardTitle>
            <Badge variant="secondary" className="font-mono px-2.5 py-0.5">
              {copyrights.length}
            </Badge>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="w-[40%]">Document Title</TableHead>
                  <TableHead>Filing Number</TableHead>
                  <TableHead>Assigned Mentor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {copyrights.map((c) => (
                  <TableRow key={c._id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <DocumentDialog copyright={c} />
                        {c.extractedTitle && c.extractedTitle.toLowerCase() !== c.title.toLowerCase() && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary cursor-help">
                                <Sparkles className="h-3 w-3" />
                                <span className="truncate max-w-[250px] italic">"{c.extractedTitle}"</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="text-xs">
                              AI detected title from PDF
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                      {c.filingNumber || <span className="opacity-30">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate max-w-[120px]">{c.mentor?.name || "Pending..."}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={STATUS_MAP[c.status].variant} 
                        className={`capitalize font-medium shadow-sm ${STATUS_MAP[c.status].className}`}
                      >
                        {STATUS_MAP[c.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile/Small Screen Card View */}
          <div className="flex flex-col divide-y md:hidden">
            {copyrights.map((c) => (
              <div key={c._id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <DocumentDialog copyright={c} compact />
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      ID: {c._id.slice(-6)}
                    </span>
                  </div>
                  <Badge 
                    variant={STATUS_MAP[c.status].variant} 
                    className={`shrink-0 text-[10px] px-2 py-0 capitalize ${STATUS_MAP[c.status].className}`}
                  >
                    {STATUS_MAP[c.status].label}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-y-2 text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-md">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    {c.mentor?.name || "No Mentor"}
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Calendar className="h-3 w-3" />
                    {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

function LoadingSkeleton() {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <Skeleton className="h-7 w-40" />
      </CardHeader>
      <Separator />
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function DocumentDialog({ copyright, compact }: { copyright: CopyrightItem; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const { data } = useSWR(open ? `/api/copyrights/${copyright._id}/comments` : null, fetcher)
  const comments = data?.comments || []
  const { user } = useAuth()
  const { mutate } = useSWRConfig()
  const [isPublic, setIsPublic] = useState<boolean>((copyright as any).isPublic || false)
  const [docType, setDocType] = useState<string>((copyright as any).documentType || 'copyright')

  // Update local state if copyright prop changes
  React.useEffect(() => {
    setIsPublic((copyright as any).isPublic || false)
    setDocType((copyright as any).documentType || 'copyright')
  }, [copyright])

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {compact ? (
          <h4 className="font-bold text-sm leading-tight text-foreground cursor-pointer transition-all duration-200 hover:text-primary hover:underline underline-offset-4">
            {copyright.title}
          </h4>
        ) : (
          <span className="font-semibold text-foreground leading-none cursor-pointer transition-all duration-200 hover:text-primary hover:underline underline-offset-4 group-hover:text-primary">
            {copyright.title}
          </span>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Title: {copyright.title}</AlertDialogTitle>
          <AlertDialogDescription>Abstract: {copyright.abstract}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>Mentor: <span className="text-foreground">{copyright.mentor?.name || 'Unassigned'}</span></div>
            <div>Date: <span className="text-foreground">{new Date(copyright.createdAt).toLocaleDateString()}</span></div>
          </div>

          {((copyright as any).fileUrl) && (
            <div>
              <a href={(copyright as any).fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Open uploaded PDF</a>
            </div>
          )}

          <div className="pt-2">
            <h3 className="text-sm font-semibold">Comments</h3>
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">No comments yet.</p>
            ) : (
              <div className="mt-2 space-y-3 max-h-60 overflow-auto pr-2">
                {comments.map((cm: any) => (
                  <div key={cm._id} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-foreground">{cm.mentor?.name || 'Mentor'}</div>
                      <div className="text-[11px] text-muted-foreground">{new Date(cm.createdAt).toLocaleString()}</div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{cm.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* If the current user is the owning student and document is approved, allow publish controls */}
  {user && String(user._id) === String((copyright as any).student) && copyright.status === 'approved' && (
          <div className="space-y-3 p-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                <span className="text-sm">Make this document public</span>
              </label>
              <div className="ml-auto flex items-center gap-2">
                <Label className="text-sm">Type</Label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="border rounded px-2 py-1 text-sm">
                  <option value="copyright">Copyright</option>
                  <option value="research">Research Paper</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-1 rounded border" onClick={async () => {
                try {
                  const res = await fetch(`/api/copyrights/${copyright._id}/publish`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ isPublic, documentType: docType })
                  })
                  if (!res.ok) throw new Error('Failed')
                  // revalidate list
                  mutate('/api/copyrights')
                  setOpen(false)
                } catch (err) {
                  console.error(err)
                  alert('Failed to update publish settings')
                }
              }}>Save</button>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}