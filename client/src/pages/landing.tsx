import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";
import logoImage from "@assets/logo-0 (1)_1764114456004.png";
import heroImage from "@assets/login-jsta-image.jpg";

export default function LandingPage() {
  const { t, language } = useTranslation();
  const isRTL = language === "ar";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex">
        <section className="flex-1 grid lg:grid-cols-2">
          <div 
            className={`flex flex-col justify-center px-8 md:px-12 lg:px-16 py-12 ${
              isRTL ? "lg:order-2 text-right" : "lg:order-1 text-left"
            }`}
          >
            <div className={`max-w-xl ${isRTL ? "mr-0 ml-auto" : "ml-0 mr-auto"}`}>
              <div className={`mb-8 ${isRTL ? "flex justify-end" : "flex justify-start"}`}>
                <img 
                  src={logoImage} 
                  alt="JSTA Logo" 
                  className="h-24 w-auto object-contain"
                  data-testid="img-hero-logo"
                />
              </div>
              
              <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {t("landing.heroTitle")}
              </h1>
              
              <p className="mb-10 text-lg text-muted-foreground leading-relaxed">
                {t("landing.heroSubtitle")}
              </p>
              
              <div className={`flex flex-col sm:flex-row gap-4 ${
                isRTL ? "sm:justify-end" : "sm:justify-start"
              }`}>
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-hero-register">
                    {isRTL && <ArrowRight className="h-4 w-4 rotate-180" />}
                    {t("landing.getStarted")}
                    {!isRTL && <ArrowRight className="h-4 w-4" />}
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

          <div 
            className={`hidden lg:block ${
              isRTL ? "lg:order-1" : "lg:order-2"
            }`}
          >
            <div className="w-full h-full">
              <img 
                src={heroImage} 
                alt="JSTA Tourism" 
                className="w-full h-full object-cover"
                data-testid="img-hero-image"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
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
