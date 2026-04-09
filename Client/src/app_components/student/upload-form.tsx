"use client"

import React, { useState, useEffect, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Upload,
  Loader2,
  FileText,
  CheckCircle,
  AlertCircle,
  Info,
  KeyRound,
  FileUp,
  X,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const COLLEGES = [
  "Chitkara University, Punjab",
  "Thapar University",
  "JIIT, Noida",
  "Indian Institute of Technology, Delhi",
  "Indian Institute of Technology, Bombay",
  "Indian Institute of Technology, Madras",
  "Indian Institute of Technology, Kanpur",
  "Indian Institute of Technology, Kharagpur",
  "National Institute of Technology, Trichy",
  "National Institute of Technology, Warangal",
  "Birla Institute of Technology and Science, Pilani",
  "Delhi Technological University",
  "Vellore Institute of Technology",
  "Manipal Institute of Technology",
  "SRM Institute of Science and Technology",
  "Amity University",
  "Lovely Professional University",
  "Chandigarh University",
]

interface Mentor {
  _id: string
  name: string
  email: string
}

interface UploadFormProps {
  onSuccess?: () => void
}

export function UploadForm({ onSuccess }: UploadFormProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<string>("copyright")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reportInputRef = useRef<HTMLInputElement>(null)
  // Size limits
  const MAX_RECEIPT_BYTES = 500 * 1024 // 500 KB
  const MAX_REPORT_BYTES = 2 * 1024 * 1024 // 2 MB
  
  // Form State
  const [formData, setFormData] = useState({
    title: "",
    abstract: "",
    college: user?.college || "",
    mentorId: "",
    portalLogin: "",
    portalPassword: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [reportFile, setReportFile] = useState<File | null>(null)
  
  // UI State
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ type: 'idle' })
  const [loadingMentors, setLoadingMentors] = useState(false)

  // Fetch Mentors based on college selection
  useEffect(() => {
    if (formData.college) {
      setLoadingMentors(true)
      fetch(`/api/auth/mentors?college=${encodeURIComponent(formData.college)}`)
        .then((res) => res.json())
        .then((data) => {
          setMentors(data.mentors || [])
          setLoadingMentors(false)
        })
        .catch(() => {
          setMentors([])
          setLoadingMentors(false)
        })
    }
  }, [formData.college])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "application/pdf") {
      if (selectedFile.size > MAX_RECEIPT_BYTES) {
        setStatus({ type: 'error', message: "The file is greater than 500 KB" })
        // clear any previously selected file
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        return
      }
      setFile(selectedFile)
      if (status.type === 'error') setStatus({ type: 'idle' })
    } else if (selectedFile) {
      setStatus({ type: 'error', message: "Please upload a valid PDF file." })
    }
  }

  const handleReportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected && selected.type === "application/pdf") {
      if (selected.size > MAX_REPORT_BYTES) {
        setStatus({ type: 'error', message: "Project report must be 2 MB or smaller." })
        setReportFile(null)
        if (reportInputRef.current) reportInputRef.current.value = ""
        return
      }
      setReportFile(selected)
      if (status.type === 'error') setStatus({ type: 'idle' })
    } else if (selected) {
      setStatus({ type: 'error', message: "Please upload a valid PDF report." })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Ensure report is attached first (report-first UX), but require both
    if (!reportFile) {
      setStatus({ type: 'error', message: "Please attach the project report PDF (max 2 MB)." })
      return
    }

    if (!file) {
      setStatus({ type: 'error', message: "Please attach a PDF receipt (max 500 KB)." })
      return
    }

    // Final size checks before upload (report first)
    if (reportFile && reportFile.size > MAX_REPORT_BYTES) {
      setStatus({ type: 'error', message: "Project report must be 2 MB or smaller." })
      return
    }
    if (file && file.size > MAX_RECEIPT_BYTES) {
      setStatus({ type: 'error', message: "The file is greater than 500 KB" })
      return
    }

    setStatus({ type: 'loading' })

    const payload = new FormData()
    Object.entries(formData).forEach(([key, value]) => payload.append(key, value))
    payload.append("file", file)
  if (reportFile) payload.append("report", reportFile)
  // indicate document type from selected tab
  payload.append("documentType", activeTab === "research" ? "research" : "copyright")

    try {
      const res = await fetch("/api/copyrights", {
        method: "POST",
        body: payload,
      })
      const json = await res.json()

      if (!res.ok) {
        setStatus({ type: 'error', message: json.error || "Failed to upload filing." })
      } else {
        setStatus({ type: 'success' })
        resetForm()
        onSuccess?.()
      }
    } catch {
      setStatus({ type: 'error', message: "Network error. Check your connection." })
    }
  }

  const resetForm = () => {
    setFormData(prev => ({ ...prev, title: "", abstract: "", mentorId: "", portalLogin: "", portalPassword: "" }))
    setFile(null)
    setReportFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (reportInputRef.current) reportInputRef.current.value = ""
  }

  return (
    <TooltipProvider>
      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Upload className="h-5 w-5 text-primary" />
                {activeTab === 'research' ? 'Submit Research Paper' : 'Submit Copyright Filing'}
              </CardTitle>
              <CardDescription>
                System will auto-extract details from your PDF receipt
              </CardDescription>
            </div>
            <Badge variant="outline" className="hidden sm:flex bg-background border-primary/20 text-primary gap-1">
              <FileText className="h-3 w-3" />
              PDF Only
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <Tabs defaultValue={activeTab} onValueChange={(v) => { setActiveTab(v) }}>
            <TabsList>
              <TabsTrigger value="copyright">Copyright</TabsTrigger>
              <TabsTrigger value="research">Research Paper</TabsTrigger>
            </TabsList>
            <form onSubmit={handleSubmit} className="space-y-6">
            {status.type === 'success' && (
              <Alert className="border-green-500/30 bg-green-500/5 text-green-600 animate-in zoom-in-95">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Filing submitted successfully! Your mentor has been notified.</AlertDescription>
              </Alert>
            )}

            {/* General Information */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">{activeTab === 'research' ? 'Research Topic' : 'Project Title'}</Label>
                <Input
                  id="title"
                  placeholder={activeTab === 'research' ? 'e.g., Efficient distributed ML for IoT' : 'e.g., Blockchain-based supply chain system'}
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abstract">Abstract / Summary</Label>
                <Textarea
                  id="abstract"
                  placeholder="Describe your research or project work briefly..."
                  value={formData.abstract}
                  onChange={(e) => handleInputChange("abstract", e.target.value)}
                  className="min-h-[100px] resize-none"
                  required
                />
              </div>
            </div>

            <Separator />

            {/* Affiliation & Mentorship */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Your Institution</Label>
                <Select value={formData.college} onValueChange={(v) => handleInputChange("college", v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned Mentor</Label>
                {loadingMentors ? (
                  <div className="flex h-10 items-center gap-2 rounded-md border bg-muted/50 px-3 text-sm text-muted-foreground italic">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Finding mentors...
                  </div>
                ) : (
                  <Select value={formData.mentorId} onValueChange={(v) => handleInputChange("mentorId", v)}>
                    <SelectTrigger disabled={mentors.length === 0}>
                      <SelectValue placeholder={mentors.length === 0 ? "No mentors in this college" : "Choose mentor"} />
                    </SelectTrigger>
                    <SelectContent>
                      {mentors.map((m) => (
                        <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <Separator />

            {/* Credentials Section (only for Copyright tab) */}
            {activeTab === 'copyright' && (
              <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary/70" />
                    <span className="text-sm font-semibold">Government Portal Sync (Optional)</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="max-w-[200px] text-xs leading-relaxed">Only used by mentors to verify filing status on the official portal.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="portalLogin" className="text-[11px] uppercase tracking-wider text-muted-foreground">Portal ID</Label>
                    <Input
                      id="portalLogin"
                      placeholder="Username"
                      value={formData.portalLogin}
                      onChange={(e) => handleInputChange("portalLogin", e.target.value)}
                      className="h-9 bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="portalPassword" className="text-[11px] uppercase tracking-wider text-muted-foreground">Portal Key</Label>
                    <Input
                      id="portalPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.portalPassword}
                      onChange={(e) => handleInputChange("portalPassword", e.target.value)}
                      className="h-9 bg-background"
                    />
                  </div>
                </div>
              </div>
            )}


            {/* Modern File Drop Zone - report first per UX change */}
            {/* Show error messages directly above the report drop zone for better visibility */}
            {status.type === 'error' && (
              <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}

            {/* Project Report Upload (now displayed first) */}
            <div className="space-y-3">
              <Label>{activeTab === 'research' ? 'Research Paper (Required PDF)' : 'Project Report (Required PDF)'}</Label>
              {!reportFile ? (
                <div 
                  onClick={() => reportInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 py-6 transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                >
                  <div className="rounded-full bg-background p-2 shadow-sm group-hover:scale-110 transition-transform">
                    <FileUp className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mt-2 text-sm">Click to upload {activeTab === 'research' ? 'research paper' : 'report'} (required)</p>
                  <input
                    type="file"
                    className="hidden"
                    ref={reportInputRef}
                    accept=".pdf"
                    onChange={handleReportChange}
                  />
                </div>
                ) : (
                <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold truncate max-w-[200px]">{reportFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(reportFile.size / 1024 / 1024).toFixed(2)} MB • Ready to submit</p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setReportFile(null)} 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Receipt Upload (moved below report) */}
            <div className="space-y-3">
              <Label>{activeTab === 'research' ? 'Research Paper Govt. receipts/acknowledgments' : 'Copyright Receipt (Official PDF)'}</Label>
              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/5 py-8 transition-all hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                >
                  <div className="rounded-full bg-background p-3 shadow-sm group-hover:scale-110 transition-transform">
                    <FileUp className="h-6 w-6 text-primary" />
                  </div>
                  <p className="mt-3 text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground mt-1">{activeTab === 'research' ? 'Upload government receipts or acknowledgments related to the research' : 'Receipt will be processed for AI verification'}</p>
                  <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept=".pdf"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border bg-primary/5 p-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-3">
                    <div className="rounded bg-primary/10 p-2">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold truncate max-w-[200px]">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB • Ready to submit</p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setFile(null)} 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold transition-all active:scale-[0.98]" 
              disabled={status.type === 'loading' || !formData.mentorId || !reportFile || !file}
            >
              {status.type === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing Submission...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Submit for Mentor Review
                </>
              )}
            </Button>
          </form>
          </Tabs>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}