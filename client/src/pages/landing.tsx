import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import {
  Building2,
  FileCheck,
  Shield,
  Users,
  ArrowRight,
  CheckCircle2,
  Clock,
  Upload,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Office Registration",
    description: "Register your tourism office and submit required documentation for membership approval.",
  },
  {
    icon: FileCheck,
    title: "License Renewals",
    description: "Request license renewals and download official documents for Ministry submission.",
  },
  {
    icon: Shield,
    title: "Secure Portal",
    description: "Your documents and data are securely stored and accessible only to authorized users.",
  },
  {
    icon: Upload,
    title: "Document Management",
    description: "Upload, track, and manage all your official documents in one centralized location.",
  },
];

const processSteps = [
  {
    step: 1,
    title: "Create Account",
    description: "Register with your email and create a secure password",
    icon: Users,
  },
  {
    step: 2,
    title: "Submit Information",
    description: "Fill in your office details and upload required documents",
    icon: Upload,
  },
  {
    step: 3,
    title: "Await Approval",
    description: "The association reviews your application",
    icon: Clock,
  },
  {
    step: 4,
    title: "Access Portal",
    description: "Once approved, access your dashboard and manage renewals",
    icon: CheckCircle2,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <section className="py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                  <Building2 className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Tourism Offices Membership & License Renewal Portal
              </h1>
              <p className="mb-8 text-lg text-muted-foreground">
                Welcome to the official portal for tourism office registration, membership management, and license renewal services. Streamline your administrative processes with our secure online platform.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-hero-register">
                    Create New Account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-hero-login">
                    Login to Your Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-4">
                Portal Features
              </h2>
              <p className="text-muted-foreground">
                Everything you need to manage your tourism office membership and licenses
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature, index) => (
                <Card key={index} className="border-0 bg-card shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center mb-12">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-4">
                Registration Process
              </h2>
              <p className="text-muted-foreground">
                Follow these simple steps to register your tourism office
              </p>
            </div>
            <div className="mx-auto max-w-4xl">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {processSteps.map((item) => (
                  <div key={item.step} className="relative text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="relative">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                          {item.step}
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 border-primary">
                          <item.icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                    </div>
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-muted-foreground mb-6">
                Join the portal today and simplify your tourism office management
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="gap-2" data-testid="button-cta-register">
                    Create Your Account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Tourism Offices Portal
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Jordan Society of Tourism Agents. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
