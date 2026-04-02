import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Building2, ArrowLeft } from "lucide-react";

const BrandAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/brand/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { account_type: "brand" },
        emailRedirectTo: window.location.origin + "/brand/setup",
      },
    });
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Check your email to confirm your account." });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative panel — blue-tinted for brands */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-[hsl(220,80%,50%,0.1)] via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(220,80%,55%,0.12),transparent_60%)]" />
        <div className="relative z-10 p-12 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(220,80%,55%,0.1)] flex items-center justify-center mb-8">
            <Building2 className="w-8 h-8 text-[hsl(220,80%,65%)]" />
          </div>
          <h2 className="text-3xl font-heading font-bold text-foreground mb-4">
            Find creators.<br />Grow your brand.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Access a curated network of UGC creators ready to produce authentic content for your brand. Launch campaigns in minutes.
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
            <Building2 className="h-5 w-5 text-[hsl(220,80%,65%)]" />
            <span className="text-lg font-heading font-bold text-foreground">Brand Portal</span>
          </div>
          <p className="text-muted-foreground text-sm mb-6">Find UGC creators for your business</p>

          <Tabs defaultValue={searchParams.get("mode") === "signup" ? "signup" : "login"}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-login-email">Email</Label>
                  <Input id="brand-login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-login-password">Password</Label>
                  <Input id="brand-login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,50%)] text-primary-foreground" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-signup-email">Business Email</Label>
                  <Input id="brand-signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand-signup-password">Password</Label>
                  <Input id="brand-signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,50%)] text-primary-foreground" disabled={loading}>
                  {loading ? "Creating account..." : "Create Brand Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Are you a creator? <Link to="/auth" className="text-primary hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrandAuth;
