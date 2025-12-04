import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { ArrowRight, Shield, FileText, RefreshCw } from "lucide-react";
import heroImage from "@assets/login-jsta-image.jpg";

export default function LandingPage() {
  const { t, isRTL } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 relative">
        {/* Hero Section */}
        <div className="relative min-h-[calc(100vh-4rem)] flex">
          {/* Hero Image - Right side on LTR, Left side on RTL */}
          <div 
            className="absolute inset-y-0 w-1/2 hidden lg:block"
            style={{ 
              left: isRTL ? 0 : 'auto',
              right: isRTL ? 'auto' : 0
            }}
          >
            <div 
              className={`absolute inset-0 z-10 ${isRTL ? 'bg-gradient-to-l' : 'bg-gradient-to-r'} from-background via-background/80 to-transparent`}
            />
            <img 
              src={heroImage} 
              alt="JSTA Tourism" 
              className="w-full h-full object-cover"
              data-testid="img-hero-image"
            />
          </div>

          {/* Hero Content */}
          <div 
            className="relative z-20 w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-8 md:px-12 lg:px-16 py-12"
            style={{ 
              marginLeft: isRTL ? 'auto' : 0,
              marginRight: isRTL ? 0 : 'auto',
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
              {/* Main heading with gradient text effect */}
              <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl text-foreground leading-tight">
                {t("landing.heroTitle")}
              </h1>
              
              {/* Subtitle */}
              <p className="mb-8 text-lg sm:text-xl text-muted-foreground leading-relaxed">
                {t("landing.heroSubtitle")}
              </p>
              
              {/* CTA Buttons */}
              <div 
                className="flex flex-col sm:flex-row gap-4 mb-12"
                style={{ justifyContent: isRTL ? 'flex-end' : 'flex-start' }}
              >
                <Link href="/register">
                  <Button size="lg" className="w-full sm:w-auto gap-2 shadow-md" data-testid="button-hero-register">
                    {t("landing.getStarted")}
                    <ArrowRight className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="button-hero-login">
                    {t("landing.memberLogin")}
                  </Button>
                </Link>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-border" data-testid="section-features">
                <div className="flex items-center gap-3" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} data-testid="feature-registration">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground" data-testid="text-feature-registration">{t("landing.featureRegistration")}</span>
                </div>
                <div className="flex items-center gap-3" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} data-testid="feature-renewal">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground" data-testid="text-feature-renewal">{t("landing.featureRenewal")}</span>
                </div>
                <div className="flex items-center gap-3" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }} data-testid="feature-secure">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground" data-testid="text-feature-secure">{t("landing.featureSecure")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
