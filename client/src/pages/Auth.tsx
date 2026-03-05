import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";
import AppLogo from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

type AuthMode = "login" | "signup";

export default function Auth() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const role = new URLSearchParams(search).get("role") as "landlord" | "tenant" | null;
  const [mode, setMode] = useState<AuthMode>("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const signupMutation = trpc.auth.signup.useMutation();
  const loginMutation = trpc.auth.login.useMutation();
  const googleMutation = trpc.auth.google.useMutation();

  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!role) {
      setLocation("/login");
    }
  }, [role, setLocation]);

  const passwordChecks = useMemo(
    () => [
      { label: "At least 8 characters", valid: password.length >= 8 },
      { label: "At least 1 uppercase letter", valid: /[A-Z]/.test(password) },
      { label: "At least 1 lowercase letter", valid: /[a-z]/.test(password) },
      { label: "At least 1 number", valid: /\d/.test(password) },
      { label: "At least 1 special character", valid: /[^A-Za-z0-9]/.test(password) },
    ],
    [password]
  );

  const getPasswordError = () => {
    if (!password) return "Password is required";
    if (!passwordChecks[0].valid) return "Password must be at least 8 characters";
    if (!passwordChecks[1].valid) return "Password must include at least one uppercase letter";
    if (!passwordChecks[2].valid) return "Password must include at least one lowercase letter";
    if (!passwordChecks[3].valid) return "Password must include at least one number";
    if (!passwordChecks[4].valid) return "Password must include at least one special character";
    return null;
  };

  const handleGoogleCredential = async (credential: string) => {
    setError("");
    setSuccessMessage("");
    setIsLoading(true);
    try {
      await googleMutation.mutateAsync({ credential, role: role ?? undefined });
      await utils.auth.me.invalidate();
      await utils.auth.me.fetch();
      setLocation("/dashboard");
    } catch (err: any) {
      const message =
        err?.data?.message || err?.message || err?.shape?.message || "Google sign-in failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const renderGoogleButton = () => {
      const googleApi = (window as any).google;
      if (!googleApi || !googleButtonRef.current) return;

      if (!googleInitializedRef.current) {
        googleApi.accounts.id.initialize({
          client_id: googleClientId,
          callback: ({ credential }: { credential: string }) => {
            if (!credential) return;
            void handleGoogleCredential(credential);
          },
        });
        googleInitializedRef.current = true;
      }

      googleButtonRef.current.innerHTML = "";
      googleApi.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: mode === "signup" ? "signup_with" : "continue_with",
        width: 360,
      });
    };

    if ((window as any).google) {
      renderGoogleButton();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", renderGoogleButton, { once: true });
      return () => existing.removeEventListener("load", renderGoogleButton);
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [googleClientId, mode, role]);

  if (!role) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await loginMutation.mutateAsync({ email, password, role });
      await utils.auth.me.invalidate();
      await utils.auth.me.fetch();
      setLocation("/dashboard");
    } catch (err: any) {
      const message =
        err?.data?.message || err?.message || err?.shape?.message || "Failed to login";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!name.trim()) return setError("Name is required");
    if (!email.trim()) return setError("Email is required");
    const passwordError = getPasswordError();
    if (passwordError) return setError(passwordError);
    if (password !== confirmPassword) return setError("Passwords don't match");

    setIsLoading(true);
    try {
      await signupMutation.mutateAsync({
        email,
        password,
        name,
        role,
      });

      setSuccessMessage("Account created successfully! Switching to login...");
      setTimeout(() => {
        setMode("login");
        setEmail("");
        setPassword("");
        setName("");
        setConfirmPassword("");
        setSuccessMessage("");
      }, 1800);
    } catch (err: any) {
      const message =
        err?.data?.message || err?.message || err?.shape?.message || "Failed to create account";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <button
            onClick={() => setLocation("/login")}
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Role Selection
          </button>

          <div className="mb-4 flex items-center justify-center">
            <AppLogo markClassName="h-10 w-10" />
          </div>

          <div className="mb-4 inline-block rounded-full border border-accent/20 bg-accent/10 px-3 py-1">
            <p className="text-xs font-semibold text-accent">
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </p>
          </div>
        </div>

        <div className="mb-6 flex gap-2 rounded-lg bg-muted p-1">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 rounded px-4 py-2 text-sm font-medium transition ${
              mode === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded px-4 py-2 text-sm font-medium transition ${
              mode === "signup"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        <Card className="border-border/50 p-6">
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="mb-1 text-xl font-semibold text-serif">Welcome back</h2>
                <p className="text-sm text-muted-foreground">Sign in to your account</p>
              </div>

              <div className="mt-6 space-y-4">
                {googleClientId ? (
                  <div
                    ref={googleButtonRef}
                    className="w-full overflow-hidden rounded-xl border border-border/60 bg-background/60 p-2"
                  />
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Google sign-in is not configured. Set `VITE_GOOGLE_CLIENT_ID`.
                  </p>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="login-email" className="text-sm">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="login-password" className="text-sm">
                    Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 inline-flex items-center text-muted-foreground hover:text-foreground"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <h2 className="mb-1 text-xl font-semibold text-serif">Create account</h2>
                <p className="text-sm text-muted-foreground">Join as a {role}</p>
              </div>

              <div className="mt-6 space-y-4">
                {googleClientId ? (
                  <>
                    <div
                      ref={googleButtonRef}
                      className="w-full overflow-hidden rounded-xl border border-border/60 bg-background/60 p-2"
                    />
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border/50"></div>
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">Or create with email</span>
                      </div>
                    </div>
                  </>
                ) : null}

                <div>
                  <Label htmlFor="signup-name" className="text-sm">
                    Full Name
                  </Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="signup-email" className="text-sm">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="signup-password" className="text-sm">
                    Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 inline-flex items-center text-muted-foreground hover:text-foreground"
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-2 space-y-1.5 rounded-md border border-border/50 bg-muted/40 p-3">
                    {passwordChecks.map((item) => (
                      <p key={item.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.valid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="h-3.5 w-3.5" />
                        )}
                        <span>{item.label}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="signup-confirm" className="text-sm">
                    Confirm Password
                  </Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="signup-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 inline-flex items-center text-muted-foreground hover:text-foreground"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="rounded border border-emerald-300/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                    {successMessage}
                  </div>
                )}

                <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
