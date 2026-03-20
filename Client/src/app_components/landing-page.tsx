import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Navbar } from "./navbar"
import { useAuth } from "@/context/auth-context"
import {
    Shield,
    Upload,
    Eye,
    Lock,
    FileText,
    Users,
    Globe,
    ArrowRight,
    CheckCircle,
    Zap,
} from "lucide-react"

const features = [
    {
        icon: Upload,
        title: "Easy Upload",
        description: "Students can upload copyright filing PDFs with automatic title and filing number extraction.",
        badge: "Core",
    },
    {
        icon: Eye,
        title: "Smart Access Control",
        description: "Internal mentors get full access. External reviewers see only abstracts and comments.",
        badge: "Security",
    },
    {
        icon: Lock,
        title: "Secure Vault",
        description: "Government portal credentials are stored securely and only visible to authorized mentors.",
        badge: "Security",
    },
    {
        icon: FileText,
        title: "PDF Extraction",
        description: "Automatic extraction of key information from uploaded copyright receipt documents.",
        badge: "AI",
    },
    {
        icon: Users,
        title: "College-Based Routing",
        description: "Students select their college and mentor during registration for streamlined workflows.",
        badge: "Workflow",
    },
    {
        icon: Globe,
        title: "Global Research",
        description: "Mentors can browse filings across all colleges for cross-institutional research collaboration.",
        badge: "Discovery",
    },
]

const steps = [
    {
        step: "01",
        title: "Register",
        description: "Create an account as a Student or Mentor and select your college.",
        icon: Users,
    },
    {
        step: "02",
        title: "Upload",
        description: "Students upload copyright PDFs. Data is automatically extracted.",
        icon: Upload,
    },
    {
        step: "03",
        title: "Review",
        description: "Mentors review filings, add comments, and approve submissions.",
        icon: CheckCircle,
    },
]

function AnimatedGreeting({ role }: { role?: string }) {
    // Static one-line greeting per request. Keep CTA button visible.
    const message =
        role === "mentor"
            ? "Welcome back, Mentor — check new submissions on your dashboard"
            : "Welcome back — check your dashboard for updates"

    return (
        <div className="flex items-center gap-4 w-full justify-start">
            <div className="text-left">
                <span className="text-lg font-semibold">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-md">{message}</span>
                </span>
            </div>

            <div>
                <Button size="lg" asChild className="material-elev">
                    <Link to={role === "mentor" ? "/mentor" : "/student"}>Go to Dashboard</Link>
                </Button>
            </div>
        </div>
    )
}

export default function LandingPage() {
    const { user } = useAuth()

    return (
        <>
        <Navbar />
        <div className="flex flex-col">
            
            {/* Hero Section */}
            <section className="relative flex flex-col items-center justify-center px-6 pb-20 pt-16 text-center">
                <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                    Research preview (early access)
                </Badge>

                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                    <Shield className="h-8 w-8 text-primary-foreground" />
                </div>

                <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                    Copyright Information <span className="text-primary">Extraction System</span>
                </h1>

                <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
                    A secure platform for students to upload copyright filing documents and mentors to
                    review them with smart, college-based access control.
                </p>

                <div className="mt-8 flex items-center gap-4">
                    {user ? (
                        <AnimatedGreeting role={user.role} />
                    ) : (
                        <>
                        <Button size="lg" asChild>
                            <Link to="/register">
                                Get Started
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild className="bg-transparent">
                            <Link to="/login">Sign In</Link>
                        </Button>
                        </>
                    )}
                </div>

                <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                    {["End-to-end encryption", "Role-based access", "Auto PDF parsing"].map((item) => (
                        <span key={item} className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            {item}
                        </span>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Features Section */}
            <section className="bg-card px-6 py-16">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-12 text-center">
                        <Badge variant="outline" className="mb-3">Features</Badge>
                        <h2 className="mb-2 text-3xl font-bold text-foreground">
                            Built for Academic Excellence
                        </h2>
                        <p className="mx-auto max-w-2xl text-muted-foreground">
                            Everything you need to manage copyright filings securely and efficiently
                        </p>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => (
                            <Card
                                key={feature.title}
                                className="group border-border transition-all hover:border-primary/20 hover:shadow-md"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                                            <feature.icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                            {feature.badge}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base font-semibold text-foreground">
                                        {feature.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <Separator />

            {/* How It Works Section */}
            <section className="px-6 py-16">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-12 text-center">
                        <Badge variant="outline" className="mb-3">Process</Badge>
                        <h2 className="text-3xl font-bold text-foreground">How It Works</h2>
                    </div>

                    <div className="grid gap-8 sm:grid-cols-3">
                        {steps.map((item) => (
                            <Card
                                key={item.step}
                                className="relative border-border text-center"
                            >
                                <CardContent className="flex flex-col items-center gap-4 pt-6">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                                        {item.step}
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                        <item.icon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">
                                        {item.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <Separator />

            {/* CTA Section */}
            <section className="bg-card px-6 py-16">
                <Card className="mx-auto max-w-2xl border-primary/20 bg-primary/5 text-center">
                    <CardContent className="flex flex-col items-center gap-4 py-10">
                        <Shield className="h-10 w-10 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground">Ready to get started?</h2>
                        <p className="max-w-md text-muted-foreground">
                            Join hundreds of students and mentors already using CIE-Vault to manage their
                            copyright filings.
                        </p>
                        <Button size="lg" asChild>
                            <Link to="/register">
                                Create Free Account
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </section>

            {/* Footer */}
            <footer className="border-t border-border bg-card px-6 py-6">
                <div className="mx-auto flex max-w-5xl items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                            <Shield className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                        <span className="text-sm font-semibold text-foreground">CIE-Vault</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Copyright Information Extraction System
                    </p>
                </div>
            </footer>
        </div>
        </>
    )
}