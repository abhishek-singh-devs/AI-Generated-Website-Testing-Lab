import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/lab/common";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — AI Website Testing Lab" },
      { name: "description", content: "Choose a new password for your Testing Lab account." },
      { property: "og:title", content: "Reset password — AI Website Testing Lab" },
      { property: "og:description", content: "Choose a new password for your Testing Lab account." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid px-5">
      <form onSubmit={submit} className="surface-panel w-full max-w-sm p-6">
        <Logo />
        <h1 className="mt-5 text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Make it at least 8 characters.</p>
        <div className="mt-6 grid gap-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
        </div>
        <Button type="submit" variant="glow" className="mt-5 h-10 w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />} Update password
        </Button>
      </form>
    </div>
  );
}