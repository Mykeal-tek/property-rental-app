import AppLogo from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Home, Users } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<"landlord" | "tenant" | null>(null);
  const [, setLocation] = useLocation();

  const handleContinue = () => {
    if (!selectedRole) return;
    setLocation(`/auth?role=${selectedRole}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-[640px] border border-border/60 bg-card p-7 shadow-[0_20px_55px_rgba(0,0,0,0.12)] md:p-9">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <div className="mb-7 text-center">
            <div className="mb-4 flex items-center justify-center">
              <AppLogo markClassName="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Select Your Role</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue as landlord or tenant to access the right dashboard.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              className={`rounded-xl border-2 p-6 text-left transition-all ${
                selectedRole === "landlord"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-background hover:border-accent/50 hover:bg-accent/5"
              }`}
              onClick={() => setSelectedRole("landlord")}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className={`rounded-lg p-3 ${selectedRole === "landlord" ? "bg-accent/20" : "bg-muted"}`}>
                  <Home className={`h-6 w-6 ${selectedRole === "landlord" ? "text-accent" : "text-muted-foreground"}`} />
                </div>
                <span className="text-lg font-semibold">Landlord</span>
              </div>
              <p className="text-sm text-muted-foreground">List your properties and manage bookings.</p>
              {selectedRole === "landlord" && (
                <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent">Selected</div>
              )}
            </button>

            <button
              type="button"
              className={`rounded-xl border-2 p-6 text-left transition-all ${
                selectedRole === "tenant"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-background hover:border-accent/50 hover:bg-accent/5"
              }`}
              onClick={() => setSelectedRole("tenant")}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className={`rounded-lg p-3 ${selectedRole === "tenant" ? "bg-accent/20" : "bg-muted"}`}>
                  <Users className={`h-6 w-6 ${selectedRole === "tenant" ? "text-accent" : "text-muted-foreground"}`} />
                </div>
                <span className="text-lg font-semibold">Tenant</span>
              </div>
              <p className="text-sm text-muted-foreground">Browse homes and book with confidence.</p>
              {selectedRole === "tenant" && (
                <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent">Selected</div>
              )}
            </button>
          </div>

          <Button
            size="lg"
            className="h-12 w-full"
            onClick={handleContinue}
            disabled={!selectedRole}
          >
            {selectedRole
              ? `Continue as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`
              : "Select a role to continue"}
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </Card>
      </div>
    </div>
  );
}
