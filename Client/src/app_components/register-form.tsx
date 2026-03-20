import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Shield,
  Loader2,
  Mail,
  Lock,
  User,
  GraduationCap,
  BookOpen,
  School,
  AlertCircle,
  Info,
} from "lucide-react";

const COLLEGES = [
  "Chitkara University, Punjab",
  "Chandigarh University",
  "Thapar University",
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
];

export function RegisterForm() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [college, setCollege] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Note: mentor selection removed from registration flow. Students will be assigned mentors later.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (!college) {
      setError("Please select your college/institution");
      setLoading(false);
      return;
    }

    const result = await register({
      name,
      email,
      password,
      role,
      college,
    });
    if ("error" in result && result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-8">
        <Card className="w-full max-w-lg border-border shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Create Account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join CIE-Vault to manage your copyright filings
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-email" className="text-foreground">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="reg-password" className="text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-foreground">Role</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Students upload copyright filings. Mentors review and provide feedback on filings.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={role === "student" ? "default" : "outline"}
                    className={`flex items-center gap-2 ${role !== "student" ? "bg-transparent" : ""}`}
                    onClick={() => setRole("student")}
                  >
                    <GraduationCap className="h-4 w-4" />
                    Student
                  </Button>
                  <Button
                    type="button"
                    variant={role === "mentor" ? "default" : "outline"}
                    className={`flex items-center gap-2 ${role !== "mentor" ? "bg-transparent" : ""}`}
                    onClick={() => setRole("mentor")}
                  >
                    <BookOpen className="h-4 w-4" />
                    Mentor
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-foreground">
                  <span className="flex items-center gap-2">
                    <School className="h-4 w-4 text-muted-foreground" />
                    College / Institution
                  </span>
                </Label>
                <Select value={college} onValueChange={setCollege}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your college" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLEGES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mentor selection removed — students will be assigned mentors later by admins or via dashboard. */}

              <Button type="submit" className="mt-1 w-full" disabled={loading} size="lg">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </CardContent>

          <Separator />

          <CardFooter className="justify-center py-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </TooltipProvider>
  );
}