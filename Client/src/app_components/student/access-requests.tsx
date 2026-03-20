import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type RequestUser = {
  _id: string;
  name?: string;
  email?: string;
};

type PendingForDoc = {
  copyrightId: string;
  title: string;
  requests: RequestUser[];
};

export default function AccessRequestsList() {
  const [pending, setPending] = useState<PendingForDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPending();
  }, []);

  async function loadPending() {
    setLoading(true);
    setError(null);
    try {
      // Get user's copyrights
      const res = await fetch(`/api/copyrights`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      const copyrights = json.copyrights || [];

      // For each copyright, fetch requests
      const promises = copyrights.map(async (c: any) => {
        const r = await fetch(`/api/copyrights/${c._id}/requests`, { credentials: 'include' });
        if (!r.ok) return null;
        const jr = await r.json();
        const requests = jr.requests || [];
        if (Array.isArray(requests) && requests.length > 0) {
          return {
            copyrightId: c._id,
            title: c.title,
            requests,
          } as PendingForDoc;
        }
        return null;
      });

      const results = await Promise.all(promises);
      const filtered = results.filter((x) => x !== null) as PendingForDoc[];
      setPending(filtered);
    } catch (err) {
      console.error(err);
      setError("Failed to load access requests");
    } finally {
      setLoading(false);
    }
  }

  async function respond(copyrightId: string, userId: string, approve: boolean) {
    setProcessing(userId);
    try {
      const res = await fetch(`/api/copyrights/${copyrightId}/approve-access`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, approve }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to respond');
        setProcessing(null);
        return;
      }

      // Refresh pending list
      await loadPending();
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setProcessing(null);
    }
  }

  if (loading) return <div>Loading requests...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (pending.length === 0) return <div>No pending access requests.</div>;

  return (
    <div className="grid gap-4">
      {pending.map((p) => (
        <Card key={p.copyrightId}>
          <CardHeader>
            <CardTitle>{p.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {p.requests.map((r) => (
                <div key={r._id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{(r.name || "?").slice(0,2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{r.name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{r.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" disabled={!!processing} onClick={() => respond(p.copyrightId, r._id, false)}>
                      Deny
                    </Button>
                    <Button size="sm" disabled={!!processing} onClick={() => respond(p.copyrightId, r._id, true)}>
                      {processing === r._id ? 'Processing...' : 'Grant Access'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
