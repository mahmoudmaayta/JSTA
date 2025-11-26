import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/layout/header";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n";
import { loginSchema, type LoginForm } from "@shared/schema";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import logoImage from "@assets/logo-0 (1)_1764114456004.png";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t("auth.invalidCredentials"));
      }
      return response.json();
    },
    onSuccess: async (data) => {
      await refetch();
      if (data.user.role === "ADMIN") {
        setLocation("/admin");
      } else {
        setLocation("/office/dashboard");
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const onSubmit = (data: LoginForm) => {
    setError(null);
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img 
                src={logoImage} 
                alt="JSTA Logo" 
                className="h-16 w-auto object-contain mx-auto"
                data-testid="img-login-logo"
              />
            </div>
            <CardTitle className="text-2xl">{t("auth.loginTitle")}</CardTitle>
            <CardDescription>
              {t("auth.loginSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          autoComplete="email"
                          className="ltr"
                          data-testid="input-email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("auth.password")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            data-testid="input-password"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-login"
                >
                  {loginMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {t("auth.loggingIn")}
                    </>
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("auth.noAccount")}
                </span>
              </div>
            </div>
            <Link href="/register" className="w-full">
              <Button variant="outline" className="w-full" data-testid="link-register">
                {t("auth.signUp")}
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
