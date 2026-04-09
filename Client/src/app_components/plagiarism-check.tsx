"use client"

import { useEffect, useState } from "react"
import { Navbar } from "./navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

interface Doc {
  _id: string
  title: string
  abstract: string
  fileUrl: string
  fileName: string
  documentType: string
}

export default function PlagiarismCheck() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { percentage: number; advice: string }>>({})

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch('/api/copyrights', { credentials: 'include' })
      .then(res => res.json())
      .then((data) => {
        if (!mounted) return
        setDocs(data.copyrights || [])
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setDocs([])
        setLoading(false)
      })
    return () => { mounted = false }
  }, [])

  const checkPlagiarism = async (id: string) => {
    setCheckingId(id)
    try {
      const res = await fetch('/api/plagiarism/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id })
      })
      const json = await res.json()
      if (!res.ok) {
        setResults(prev => ({ ...prev, [id]: { percentage: 0, advice: json.error || 'Failed to check' } }))
      } else {
        setResults(prev => ({ ...prev, [id]: { percentage: json.percentage || 0, advice: json.advice || '' } }))
      }
    } catch (err) {
      setResults(prev => ({ ...prev, [id]: { percentage: 0, advice: 'Network error' } }))
    } finally {
      setCheckingId(null)
    }
  }

  const researchDocs = docs.filter(d => d.documentType === 'research')

  return (
    <>
      <Navbar />
      <div className="mx-auto max-w-4xl py-8 px-4">
      <h2 className="mb-2 text-2xl font-bold">Plagiarism Check</h2>
      <p className="mb-4 text-sm text-muted-foreground">Select a document and run a plagiarism check. If you provide a Gemini API key in the server environment the system will try to use it; otherwise a local similarity check will be used.</p>

      <div className="space-y-6">
        {loading && <div>Loading documents...</div>}
        {!loading && docs.length === 0 && <div>No documents found.</div>}

        {(!loading && researchDocs.length === 0) && <div>No research papers are available.</div>}

        {researchDocs.map((d) => (
          <Card key={d._id} className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{d.title || d.fileName}</span>
                <span className="text-xs text-muted-foreground">{d.documentType}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {d.documentType === 'research' ? (
                <div className="mb-4">
                  <iframe src={d.fileUrl} title={d.title || d.fileName} className="h-96 w-full border" />
                </div>
              ) : (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">{d.abstract}</p>
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">Open PDF</a>
                </div>
              )}

              <Separator />

              <div className="mt-3 flex items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">{results[d._id] ? `Plagiarism: ${results[d._id].percentage}%` : ''}</div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={d.fileUrl} target="_blank" rel="noreferrer">View</a>
                  </Button>
                  <Button size="sm" onClick={() => checkPlagiarism(d._id)} disabled={checkingId === d._id}>
                    {checkingId === d._id ? 'Checking...' : 'Check Plagiarism'}
                  </Button>
                </div>
              </div>

              {results[d._id] && (
                <div className="mt-3 rounded border bg-muted/10 p-3">
                  <div className="text-sm font-semibold">Result: {results[d._id].percentage}%</div>
                  <div className="text-sm text-muted-foreground mt-1">Advice: {results[d._id].advice}</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    </>
  )
}
