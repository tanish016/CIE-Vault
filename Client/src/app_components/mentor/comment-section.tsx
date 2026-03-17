import React, { useState } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { MessageSquare, Send, Loader2, Clock, MessageCircle } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Comment {
  _id: string
  text: string
  createdAt: string
  mentor: {
    name: string
    email: string
    college: string
  }
}

interface CommentSectionProps {
  copyrightId: string
}

export function CommentSection({ copyrightId }: CommentSectionProps) {
  const { data, isLoading, mutate } = useSWR(
    `/api/copyrights/${copyrightId}/comments`,
    fetcher,
  )
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || submitting) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/copyrights/${copyrightId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (response.ok) {
        setText("")
        await mutate() // Revalidate SWR cache
      }
    } catch (error) {
      console.error("Failed to post comment:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const comments: Comment[] = data?.comments || []

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MessageSquare className="h-4 w-4 text-primary" />
            Comments
          </h4>
          <Badge variant="secondary" className="text-xs">
            {comments.length}
          </Badge>
        </div>

        {/* Add comment form */}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Add a comment or suggestion..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="resize-none text-sm focus-visible:ring-primary"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !text.trim()}
              className="transition-all"
            >
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              {submitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>

        {/* Comments list */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg border-dashed">
            <MessageCircle className="mb-2 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground/70">Be the first to share feedback</p>
          </div>
        ) : (
          <ScrollArea className="h-fit max-h-[400px] pr-4">
            <div className="flex flex-col gap-3">
              {comments.map((comment) => (
                <div key={comment._id} className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                          {getInitials(comment.mentor?.name || "M")}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="text-xs">{comment.mentor?.email}</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {comment.mentor?.name || "Mentor"}
                        </span>
                        <Badge variant="outline" className="hidden sm:inline-flex text-[10px] px-1.5 py-0">
                          {comment.mentor?.college}
                        </Badge>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80 break-words">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </TooltipProvider>
  )
}