import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { Navbar } from "./navbar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { User, Mail, Globe } from "lucide-react";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<any>({});
  const [form, setForm] = useState<any>({
    name: "",
    email: "",
    username: "",
    website: "",
    bio: "",
    role: "",
    image: "",
    college: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (user) {
      const p = {
        name: user.name || "",
        email: user.email || "",
        username: user.username || "",
        website: user.website || "",
        bio: user.bio || "",
        role: user.role || "",
        image: user.avatarUrl || "",
        college: user.college || "",
      };
      setProfile(p);
      setForm(p);
    }
  }, [user]);

  if (isLoading) return null;
  if (!user) {
    navigate("/login");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = { name: form.name, college: form.college };
      if (form.password) payload.password = form.password;

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to update profile");
        setLoading(false);
        return;
      }

      setSuccess("Profile updated successfully");

      // refresh the page so auth-context revalidates
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: any) {
    const { name, value, files, type } = e.target;
    if (type === "file" && files && files[0]) {
      const file = files[0];

      // Validate file type is an image
      if (!file.type || !file.type.startsWith("image/")) {
        setError("Please select an image file (jpg, png, gif, etc.)");
        setSelectedFile(null);
        return;
      }

      // Validate size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError("Image is too large. Maximum size is 5MB.");
        setSelectedFile(null);
        return;
      }

      const url = URL.createObjectURL(file);
      setError(null);
      setSelectedFile(file);
      setForm((p: any) => ({ ...p, image: url }));
      return;
    }
    setForm((p: any) => ({ ...p, [name]: value }));
  }

  async function handleImageUpload() {
    if (!selectedFile) {
      alert("Please choose an image first");
      return;
    }
    // Upload file via FormData to server endpoint that stores files and returns new avatarUrl
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append('avatar', selectedFile as File);

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to upload avatar');
        return;
      }

      const newAvatar = (json.user && json.user.avatarUrl) || null;
      if (newAvatar) {
        setForm((p: any) => ({ ...p, image: newAvatar }));
        setProfile((p: any) => ({ ...p, image: newAvatar, avatarUrl: newAvatar }));
        setSuccess('Avatar uploaded successfully');
        setSelectedFile(null);
        // Refresh the page so auth context / navbar can pick up the new avatar
        setTimeout(() => window.location.reload(), 400);
      }
    } catch (err) {
      console.error(err);
      setError('Network error during avatar upload');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className='container w-11/12 mx-auto my-8'>
        <h1 className='text-3xl font-bold mb-6'>Account Settings</h1>

        {error && <div className="text-red-600 mb-2">{error}</div>}
        {success && <div className="text-green-600 mb-2">{success}</div>}

        <div className='flex items-center gap-4 mb-8'>
          <Avatar className='h-20 w-20'>
            {form.image ? (
              <AvatarImage src={form.image} alt={form.name || profile.name} />
            ) : (
              <AvatarFallback>{(profile.name || "?").slice(0,2)}</AvatarFallback>
            )}
          </Avatar>
          <div>
            <h2 className='text-xl font-semibold'>{form.name || profile.name}</h2>
            <p className='text-muted-foreground'>{form.email || profile.email}</p>
            <h2 className='text-muted-foreground font-bold hover:text-[#331919fc]'>Role: {form.role || profile.role}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile information.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label htmlFor="name" className='font-bold'>Full Name</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <Input id="name" name="name" value={form.name} onChange={handleChange} />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 mt-3">
                <Label htmlFor="email" className='font-bold'>Email</Label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Input id="email" name="email" value={form.email} disabled />
                </div>
                <p className="text-sm text-muted-foreground cursor-default hover:font-bold">Your email cannot be changed.</p>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 mt-4">
                <Label htmlFor="website" className='font-bold'>Website</Label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Input id="website" name="website" value={form.website} onChange={handleChange} />
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3 mt-4">
                <Label htmlFor="bio" className='font-bold'>Bio</Label>
                <Textarea id="bio" name="bio" value={form.bio} rows={3} onChange={handleChange} />
                <p className="text-sm text-muted-foreground">Brief description for your profile.</p>
              </div>
              <Separator className="my-4" />

              <div className='mt-4'>
                <h1 className='text-sm font-bold text-muted-foreground mb-2 underline'>Upload your Profile Picture</h1>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Input className="col-span-3" type="file" name="image" accept="image/*" onChange={handleChange} />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleImageUpload}>Upload Image</Button>
                    <Button type="button" variant="destructive" onClick={async () => {
                      // Confirm and call delete endpoint
                      if (!confirm('Remove your profile picture? This will delete the stored image.')) return;
                      try {
                        setLoading(true);
                        const res = await fetch('/api/profile/avatar', { method: 'DELETE', credentials: 'include' });
                        const json = await res.json();
                        if (!res.ok) { setError(json.error || 'Failed to remove avatar'); return; }
                        // Clear local state and refresh so navbar updates
                        setForm((p: any) => ({ ...p, image: '' }));
                        setProfile((p: any) => ({ ...p, image: '', avatarUrl: '' }));
                        setSuccess('Avatar removed');
                        setTimeout(() => window.location.reload(), 300);
                      } catch (err) {
                        console.error(err);
                        setError('Network error while removing avatar');
                      } finally {
                        setLoading(false);
                      }
                    }}>Remove Image</Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-evenly">
              <Button variant="outline" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Update'}</Button>
              <Button variant="outline" type="button" onClick={() => setForm(profile)}>Cancel</Button>
            </CardFooter>
          </Card>
        </form>

        <Separator className="my-8" />

        <div className='flex justify-center items-center'>
          <div>
            <Button variant="outline" onClick={() => setShowPasswordForm(true)}>Change Password</Button>
          </div>
        </div>

        <AlertDialog open={showPasswordForm} onOpenChange={setShowPasswordForm}>
          <AlertDialogContent className="top-8 left-1/2 translate-x-[-50%] translate-y-0">
            <AlertDialogHeader>
              <AlertDialogTitle>Change Password</AlertDialogTitle>
            </AlertDialogHeader>

            <div className="space-y-3 mt-2">
              <div className="space-y-2">
                <Label htmlFor="oldpw">Current password</Label>
                <Input id="oldpw" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newpw">New password</Label>
                <Input id="newpw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmpw">Confirm new password</Label>
                <Input id="confirmpw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            <AlertDialogFooter>
              <div className="flex gap-2 ml-auto">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <Button
                  onClick={async () => {
                    if (newPassword !== confirmPassword) { alert('Passwords do not match'); return; }
                    if (newPassword.length < 6) { alert('New password must be at least 6 characters'); return; }
                    setPwLoading(true);
                    try {
                      const res = await fetch('/api/profile/password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ oldPassword, newPassword }),
                      });
                      const json = await res.json();
                      if (!res.ok) { alert(json.error || 'Failed to change password'); setPwLoading(false); return; }
                      alert('Password changed successfully');
                      setShowPasswordForm(false);
                      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
                    } catch (err) {
                      console.error(err);
                      alert('Network error');
                    } finally { setPwLoading(false); }
                  }}
                  disabled={pwLoading}
                >{pwLoading ? 'Updating...' : 'Update Password'}</Button>
              </div>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
