import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import {
  FileCheck,
  Shield,
  Users,
  ArrowRight,
  CheckCircle2,
  Clock,
  Upload,
} from "lucide-react";
import logoImage from "@assets/logo-0 (1)_1764114456004.png";

export default function LandingPage() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Users,
      title: t("landing.featureRegistration"),
      description: t("landing.featureRegistrationDesc"),
    },
    {
      icon: FileCheck,
      title: t("landing.featureRenewal"),
      description: t("landing.featureRenewalDesc"),
    },
    {
      icon: Shield,
      title: t("landing.featureDocuments"),
      description: t("landing.featureDocumentsDesc"),
    },
    {
      icon: Upload,
      title: t("landing.featureTracking"),
      description: t("landing.featureTrackingDesc"),
    },
  ];

  const processSteps = [
    {
      step: 1,
      title: t("registration.step1"),
      description: t("registration.accountInfo"),
      icon: Users,
    },
    {
      step: 2,
      title: t("registration.step2"),
      description: t("registration.officeInfo"),
      icon: Upload,
    },
    {
      step: 3,
      title: t("registration.step3"),
      description: t("registration.branchInfo"),
      icon: Clock,
    },
    {
      step: 4,
      title: t("registration.step4"),
      description: t("registration.documentUpload"),
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        <section className="py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 flex justify-center">
                <img 
                  src={logoImage} 
                  alt="JSTA Logo" 
                  className="h-20 w-auto object-contain"
                  data-testid="img-hero-logo"
                />
              </div>
              <h1 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                {t("landing.heroTitle")}
              </h1>
              <p className="mb-8 text-lg text-muted-foreground">
                {t("landing.heroSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-hero-register">
                    {t("landing.getStarted")}
                    <ArrowRight className="h-4 w-4 rtl-flip" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-hero-login">
                    {t("landing.memberLogin")}
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
                {t("landing.features")}
              </h2>
              <p className="text-muted-foreground">
                {t("landing.heroSubtitle")}
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
                {t("registration.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("registration.subtitle")}
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
                {t("landing.getStarted")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("landing.heroSubtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register">
                  <Button size="lg" className="gap-2" data-testid="button-cta-register">
                    {t("auth.register")}
                    <ArrowRight className="h-4 w-4 rtl-flip" />
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
              <img 
                src={logoImage} 
                alt="JSTA Logo" 
                className="h-6 w-auto object-contain"
              />
              <span className="text-sm text-muted-foreground">
                JSTA Portal
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} {t("landing.heroTitle")}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
