// src/components/AuthCallback.tsx

import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // 🔥 CRITICAL: exchange invite token for session
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error) {
          console.error("Auth exchange error:", error.message);
          navigate("/admin");
          return;
        }

        // ✅ Get session after exchange
        const { data } = await supabase.auth.getSession();

        if (data.session) {
          // small delay ensures session is fully ready
          setTimeout(() => {
            navigate("/admin/dashboard");
          }, 300);
        } else {
          navigate("/admin");
        }
      } catch (err) {
        console.error("Auth callback failed:", err);
        navigate("/admin");
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center">
      <p className="text-sm text-gray-500">Signing you in...</p>
    </div>
  );
}