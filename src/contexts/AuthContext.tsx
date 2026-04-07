import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  accountType: "creator" | "brand" | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  accountType: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<"creator" | "brand" | null>(null);

  // Determine account type: fast from metadata, fallback to DB lookup with timeout
  const resolveAccountType = (user: User): "creator" | "brand" => {
    const metaType = user.user_metadata?.account_type;
    if (metaType === "creator") return "creator";
    if (metaType === "brand") return "brand";
    return "creator"; // default when metadata missing
  };

  useEffect(() => {
    let cancelled = false;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const type = resolveAccountType(session.user);
          setAccountType(type);

          // Async DB lookup only to refine the type if metadata is missing
          if (!session.user.user_metadata?.account_type) {
            const { data: brandProfile } = await supabase
              .from("brand_profiles")
              .select("id")
              .eq("user_id", session.user.id)
              .maybeSingle();
            if (!cancelled && brandProfile) {
              setAccountType("brand");
            }
          }
        } else {
          setAccountType(null);
        }
      } catch (e) {
        console.error("[Auth] init error:", e);
        if (!cancelled) setAccountType("creator");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const type = resolveAccountType(session.user);
          setAccountType(type);

          // Async DB lookup only to refine the type if metadata is missing
          if (!session.user.user_metadata?.account_type) {
            const { data: brandProfile } = await supabase
              .from("brand_profiles")
              .select("id")
              .eq("user_id", session.user.id)
              .maybeSingle();
            if (!cancelled && brandProfile) {
              setAccountType("brand");
            }
          }
        } else {
          setAccountType(null);
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, accountType, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
