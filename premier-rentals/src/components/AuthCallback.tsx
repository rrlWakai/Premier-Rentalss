// src/components/AuthCallback.tsx

import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // This handles invite / magic link / OAuth redirects
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (data.session) {
          navigate("/admin/dashboard"); // or homepage
        } else {
          navigate("/admin"); // fallback to login
        }
      } catch (err) {
        console.error("Auth callback error:", err);
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