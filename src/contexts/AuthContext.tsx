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

  const resolveAccountType = (user: User): "creator" | "brand" => {
    const metaType = user.user_metadata?.account_type;
    if (metaType === "creator") return "creator";
    if (metaType === "brand") return "brand";
    return "creator";
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setAccountType(resolveAccountType(session.user));
          // Async refinement — don't await, just update if different
          supabase.from("brand_profiles").select("id").eq("user_id", session.user.id).maybeSingle()
            .then(({ data }) => {
              if (data) setAccountType("brand");
            });
        } else {
          setAccountType(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data }) => {
      const sess = data.session;
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setAccountType(resolveAccountType(sess.user));
      } else {
        setAccountType(null);
      }
      setLoading(false);
    }).catch(() => {
      setUser(null);
      setSession(null);
      setAccountType(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
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
