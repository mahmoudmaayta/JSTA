import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";
import logoImage from "@assets/logo-0 (1)_1764114456004.png";
import heroImage from "@assets/login-jsta-image.jpg";

export default function LandingPage() {
  const { t, isRTL } = useTranslation();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      
      <main className="flex-1 relative">
        <div 
          className="absolute inset-y-0 w-1/2 hidden lg:block"
          style={{ 
            left: isRTL ? 0 : 'auto',
            right: isRTL ? 'auto' : 0
          }}
        >
          <img 
            src={heroImage} 
            alt="JSTA Tourism" 
            className="w-full h-full object-cover"
            data-testid="img-hero-image"
          />
        </div>

        <div 
          className="absolute inset-y-0 w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-12 lg:px-16 py-12"
          style={{ 
            left: isRTL ? 'auto' : 0,
            right: isRTL ? 0 : 'auto',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          <div 
            className="max-w-xl w-full"
            style={{ 
              marginLeft: isRTL ? 'auto' : 0,
              marginRight: isRTL ? 0 : 'auto'
            }}
          >
            <div 
              className="mb-8 flex"
              style={{ justifyContent: isRTL ? 'flex-end' : 'flex-start' }}
            >
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
            
            <div 
              className="flex flex-col sm:flex-row gap-4"
              style={{ justifyContent: isRTL ? 'flex-end' : 'flex-start' }}
            >
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
      </main>
    </div>
  );
}
