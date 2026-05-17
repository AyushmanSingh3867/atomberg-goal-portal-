"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { api } from "@/lib/api";

import { Suspense } from "react";

function AuthCallback() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const { setUser }   = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    const role  = searchParams.get("role");
    const error = searchParams.get("error");

    if (error) {
      router.push(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!token) {
      router.push("/login?error=No+token+received");
      return;
    }

    // Set cookie on frontend explicitly
    document.cookie = `token=${token}; path=/; max-age=86400; SameSite=Lax`;

    // Store token in localStorage if store uses it
    localStorage.setItem("ag_token", token);

    // Fetch user profile
    const fetchUser = async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user);

        // Redirect based on role
        const redirectMap: Record<string, string> = {
          EMPLOYEE: "/",
          MANAGER:  "/dashboard",
          ADMIN:    "/admin",
        };
        router.push(redirectMap[data.user.role] || "/");
      } catch {
        router.push("/login?error=Failed+to+load+profile");
      }
    };

    fetchUser();
  }, [searchParams, router, setUser]);

  return (
    <div className="min-h-screen bg-[#05050a] flex items-center justify-center p-4">
      <div className="text-center">
        {/* Microsoft logo animation */}
        <div className="w-16 h-16 mx-auto mb-6 relative">
          <div className="grid grid-cols-2 gap-1 w-full h-full">
            <div className="bg-[#f25022] rounded-tl-sm" />
            <div className="bg-[#7fba00] rounded-tr-sm" />
            <div className="bg-[#00a4ef] rounded-bl-sm" />
            <div className="bg-[#ffb900] rounded-br-sm" />
          </div>
          <div className="absolute inset-0 animate-ping opacity-20 grid grid-cols-2 gap-1">
            <div className="bg-[#f25022] rounded-tl-sm" />
            <div className="bg-[#7fba00] rounded-tr-sm" />
            <div className="bg-[#00a4ef] rounded-bl-sm" />
            <div className="bg-[#ffb900] rounded-br-sm" />
          </div>
        </div>
        <h2 className="text-white font-bold text-xl mb-2">
          Signing you in...
        </h2>
        <p className="text-slate-400 text-sm">
          Verifying your Microsoft account
        </p>
        <div className="mt-6 flex gap-1 justify-center">
          {[0,1,2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05050a] flex items-center justify-center text-white">Loading...</div>}>
      <AuthCallback />
    </Suspense>
  );
}
