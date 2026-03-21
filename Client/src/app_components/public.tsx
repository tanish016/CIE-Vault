import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Eye } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Navbar } from "./navbar";

type PublicItem = {
	_id: string;
	title: string;
	abstract: string;
	college: string;
	filingNumber?: string;
	createdAt: string;
	student?: { name?: string; college?: string } | null;
	documentType?: string;
};

export default function PublicPage() {
	const [items, setItems] = useState<PublicItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [query, setQuery] = useState("");
	const [college, setCollege] = useState("");
	const [error, setError] = useState<string | null>(null);

	async function fetchItems() {
		setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams();
			if (query) params.set("q", query);
			if (college) params.set("college", college);

			const res = await fetch(`/api/public/copyrights?${params.toString()}`);
			if (!res.ok) throw new Error("Failed to fetch");
			const json = await res.json();
			setItems(json.results || []);
		} catch (err) {
			setError("Failed to load public items");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchItems();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<>
		<Navbar />
		<div className="p-6 max-w-5xl mx-auto">
			<h1 className="text-2xl font-semibold mb-4">Public Copyrights</h1>

			<Card className="mb-6">
				<CardContent>
					<div className="grid grid-cols-12 gap-3 items-center">
						<div className="col-span-7">
							<Label className="mb-1">Search</Label>
							<Input placeholder="Search title or abstract" value={query} onChange={(e) => setQuery(e.target.value)} />
						</div>
						<div className="col-span-3">
							<Label className="mb-1">College (optional)</Label>
							<Input placeholder="College" value={college} onChange={(e) => setCollege(e.target.value)} />
						</div>
						<div className="col-span-2 flex items-end mt-5">
							<Button onClick={fetchItems} className="w-full">Search</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{loading && <div>Loading...</div>}
			{error && <div className="text-red-600">{error}</div>}

			<div className="grid gap-4">
				{items.length === 0 && !loading && <div>No public items found.</div>}

				{items.map((it) => (
					<PublicItemCard key={it._id} item={it} />
				))}
			</div>
				</div>
				</>
		);
}

function PublicItemCard({ item }: { item: PublicItem }) {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const [statusLoading, setStatusLoading] = useState(true);
	const [requested, setRequested] = useState(false);
	const [granted, setGranted] = useState(false);
	const [owner, setOwner] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editTitle, setEditTitle] = useState(item.title);
	const [editAbstract, setEditAbstract] = useState(item.abstract);
	const [saving, setSaving] = useState(false);

	async function loadStatus() {
		if (!user) return;
		setStatusLoading(true);
		try {
			const res = await fetch(`/api/copyrights/${item._id}/access-status`, { credentials: 'include' });
			if (!res.ok) throw new Error('Failed');
			const json = await res.json();
			setRequested(!!json.requested);
			setGranted(!!json.granted);
			setOwner(!!json.owner);
		} catch (err) {
			// ignore
		} finally {
			setStatusLoading(false);
		}
	}

	useEffect(() => {
		// On mount, check access status if user is logged in so owner state is known
		if (user) {
			loadStatus();
		} else {
			// No user -> nothing to check
			setStatusLoading(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	const handleOpen = async () => {
		setOpen(true);
		// If status wasn't checked yet and user exists, ensure it's loaded
		if (user && !statusLoading) await loadStatus();
	};

	const handleRequestAccess = async () => {
		try {
			const res = await fetch(`/api/copyrights/${item._id}/request-access`, { method: 'POST', credentials: 'include' });
			if (!res.ok) {
				const json = await res.json();
				alert(json.error || 'Request failed');
				return;
			}
			setRequested(true);
			alert('Access request sent to the owner');
		} catch (err) {
			console.error(err);
			alert('Request failed');
		}
	};

	const handleUnpublish = async () => {
		if (!confirm('Remove this paper from public listing?')) return;
		try {
			const res = await fetch(`/api/copyrights/${item._id}/publish`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ isPublic: false }),
			});
			if (!res.ok) {
				const json = await res.json();
				alert(json.error || 'Failed to unpublish');
				return;
			}
			alert('This paper has been removed from public view.');
			window.location.reload();
		} catch (err) {
			console.error(err);
			alert('Network error');
		}
	};

	const handleSaveEdits = async () => {
		if (!editTitle || !editAbstract) {
			alert('Title and abstract are required');
			return;
		}
		setSaving(true);
		try {
			const res = await fetch(`/api/copyrights/${item._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ title: editTitle, abstract: editAbstract }),
			});
			if (!res.ok) {
				const json = await res.json();
				alert(json.error || 'Failed to save');
				setSaving(false);
				return;
			}
			alert('Changes saved');
			window.location.reload();
		} catch (err) {
			console.error(err);
			alert('Network error');
			setSaving(false);
		}
	};

	const handleCancelRequest = async () => {
		if (!confirm('Cancel your access request?')) return;
		try {
			const res = await fetch(`/api/copyrights/${item._id}/request-access`, { method: 'DELETE', credentials: 'include' });
			if (!res.ok) {
				const json = await res.json();
				alert(json.error || 'Failed to cancel request');
				return;
			}
			setRequested(false);
			alert('Access request cancelled');
		} catch (err) {
			console.error(err);
			alert('Network error');
		}
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg">{item.title}</CardTitle>
						<div className="text-sm text-muted-foreground">{item.college}</div>
					</div>
					<div className="flex items-center gap-4">
						<div className="text-right text-sm text-muted-foreground">
							<div>By: {item.student?.name ?? "Anonymous"}</div>
							<div className="mt-1">{new Date(item.createdAt).toLocaleDateString()}</div>
						</div>
						<Avatar>
							<AvatarFallback>{(item.student?.name || "?").slice(0,2)}</AvatarFallback>
						</Avatar>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="text-sm text-muted-foreground">{item.abstract}</div>
			</CardContent>
			<CardFooter className="flex justify-end gap-2">
				<AlertDialog open={open} onOpenChange={(val) => { if (val) handleOpen(); else { setOpen(false); setEditMode(false); } }}>
					{owner ? (
						<div className="flex items-center gap-2">
							<Button variant="outline" onClick={() => { setEditMode(true); setOpen(true); }}>Edit</Button>
							<Button variant="destructive" onClick={handleUnpublish}>Remove from Public</Button>
						</div>
					) : (
						<AlertDialogTrigger asChild>
							<Button variant="outline"><Eye className="mr-2" /> View</Button>
						</AlertDialogTrigger>
					)}
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>{item.title}</AlertDialogTitle>
							<AlertDialogDescription>
								Details for this public copyright.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<div className="py-2">
							<div className="mb-2"><strong>College:</strong> {item.college}</div>
							{item.filingNumber && <div className="mb-2"><strong>Filing:</strong> {item.filingNumber}</div>}
							<div className="mb-2"><strong>Abstract:</strong><div className="text-sm text-muted-foreground mt-1">{item.abstract}</div></div>
							<div className="mt-4 text-sm text-muted-foreground">Published: {new Date(item.createdAt).toLocaleString()}</div>
						</div>

						<div className="flex justify-between items-center gap-4">
							<div>
								{statusLoading ? (
									<span className="text-sm">Checking access...</span>
								) : owner ? (
									<span className="text-sm text-muted-foreground">You are the owner</span>
								) : granted ? (
									<a className="text-sm text-primary underline" href={`/api/copyrights/${item._id}/file`} target="_blank" rel="noreferrer">Open PDF</a>
								) : requested ? (
									<div className="flex items-center gap-2">
										<span className="text-sm">Access requested</span>
										<Button size="sm" variant="ghost" onClick={handleCancelRequest}>Cancel</Button>
									</div>
								) : user ? (
									<Button onClick={handleRequestAccess} size="sm">Request Access</Button>
								) : (
									<a className="text-sm text-primary underline" href="/login">Sign in to request</a>
								)}
						</div>

						<AlertDialogFooter>
							<AlertDialogCancel>Close</AlertDialogCancel>
						</AlertDialogFooter>
						</div>

						{editMode && (
							<div className="mt-4 space-y-3">
								<div className="space-y-1">
									<Label>Title</Label>
									<Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
								</div>
								<div className="space-y-1">
									<Label>Abstract</Label>
									<Input value={editAbstract} onChange={(e) => setEditAbstract(e.target.value)} />
								</div>
								<div className="flex items-center gap-2">
									<Button size="sm" onClick={handleSaveEdits} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
									<Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
								</div>
							</div>
						)}
					</AlertDialogContent>
				</AlertDialog>
			</CardFooter>
		</Card>
	);
}


