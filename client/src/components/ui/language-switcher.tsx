import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2"
      data-testid="button-language-toggle"
    >
      <Globe className="h-4 w-4" />
      <span>{language === "en" ? "العربية" : "English"}</span>
    </Button>
  );
}
