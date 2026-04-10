import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Camera, ArrowLeft, LogOut } from "lucide-react";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, accountType, signOut } = useAuth();

  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Redirect when user logs in and accountType is resolved
  useEffect(() => {
    if (!user || accountType === null) return;
    if (justLoggedIn) return;
    // If a brand user is already logged in and navigates here, sign them out
    if (accountType === "brand") {
      signOut();
      return;
    }
    navigate("/dashboard", { replace: true });
  }, [user, accountType, navigate, signOut, justLoggedIn]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setJustLoggedIn(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      setJustLoggedIn(false);
      setLoading(false);
      return;
    }
    if (data.user) {
      const metaType = data.user.user_metadata?.account_type;
      if (metaType === "brand") {
        toast({ title: "Wrong portal", description: "This is a brand account. Redirecting to brand login.", variant: "destructive" });
        await signOut();
        navigate("/brand/auth", { replace: true });
        setLoading(false);
        return;
      }
      navigate("/dashboard", { replace: true });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both password fields match.", variant: "destructive" });
      return;
    }
    setLoading(true);

    // Check username uniqueness
    if (username.trim()) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.trim())
        .maybeSingle();
      if (existing) {
        toast({ title: "Username taken", description: "This username is already in use. Please choose another.", variant: "destructive" });
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username, account_type: "creator" },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      toast({ title: "Email already exists", description: "An account with this email already exists. Try logging in instead.", variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Check your email to confirm your account." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(12,100%,64%,0.12),transparent_60%)]" />
        <div className="relative z-10 p-12 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8">
            <Camera className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
            Create content.<br />Get paid.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Join thousands of UGC creators landing brand deals. Build your portfolio, connect your socials, and start earning.
          </p>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/get-started" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2 mb-2">
            <Camera className="h-5 w-5 text-primary" />
            <span className="text-lg font-heading font-bold text-foreground">Creator Portal</span>
          </div>
          <p className="text-muted-foreground text-sm mb-6">Sign in or create your creator account</p>

          <Tabs defaultValue={searchParams.get("mode") === "signup" ? "signup" : "login"}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-gradient-coral" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input id="signup-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <Input id="signup-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-gradient-coral" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Are you a brand? <Link to="/brand/auth" className="text-primary hover:underline">Sign in here</Link>
          </p>

          {user && (
            <div className="mt-6 border-t border-border pt-4 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                <p>Logged in as <span className="font-medium text-foreground">{user.email}</span></p>
                <p className="mt-0.5">Account type: <span className="font-medium">{accountType ?? "loading..."}</span></p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSignOut}>
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
