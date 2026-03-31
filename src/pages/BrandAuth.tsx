import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Building2 } from "lucide-react";

const BrandAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      supabase.from("brand_profiles").select("business_name").eq("user_id", user.id).single().then(({ data }) => {
        if (!data?.business_name) {
          navigate("/brand/setup");
        } else {
          navigate("/brand/dashboard");
        }
      });
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

  const handleKeyDown = (e: React.KeyboardEvent, handler: (e: React.FormEvent) => void) => {
    if (e.key === "Enter") handler(e);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="text-lg font-heading font-bold text-foreground">UGC Zone for Brands</span>
        </div>
        <Card className="border-border/50 bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-heading">Brand Portal</CardTitle>
            <CardDescription>Find UGC creators for your business</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand-login-email">Email</Label>
                    <Input id="brand-login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleLogin)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-login-password">Password</Label>
                    <Input id="brand-login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => handleKeyDown(e, handleLogin)} required />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="brand-remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded border-border" />
                    <Label htmlFor="brand-remember" className="text-sm text-muted-foreground cursor-pointer">Stay logged in</Label>
                  </div>
                  <Button type="submit" className="w-full bg-gradient-coral" disabled={loading}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand-signup-email">Business Email</Label>
                    <Input id="brand-signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-signup-password">Password</Label>
                    <Input id="brand-signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-coral" disabled={loading}>
                    {loading ? "Creating account..." : "Create Brand Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BrandAuth;
