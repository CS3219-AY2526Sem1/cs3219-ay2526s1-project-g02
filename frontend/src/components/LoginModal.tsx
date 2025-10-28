"use client";
import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import Link from "next/dist/client/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./providers/AuthProvider";

export default function LoginModal() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { loading, session } = useAuth();

  useEffect(() => {
    if (session) {
      router.push("/");
    }
  }, [loading, session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:4001/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError("Invalid email or password");
        return;
      }

      const { access_token, refresh_token } = data;
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        setError("Internal server error");
        return;
      }

      if (res.ok) {
        router.push("/");
      }
    } catch (error) {
      console.error("An error occurred during login:", error);
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg rounded-2xl border border-[#e5e7eb] bg-[#ffffff] shadow-xl ring-1 ring-[#e5e7eb]">
      <div className="p-6 flex flex-col gap-4">
        <div className="text-2xl font-bold">Login</div>
        <div>
          <form className="flex flex-col gap-3">
            <div>
              {" "}
              <label htmlFor="email">Email:</label>
              <Input
                onChange={(e) => setEmail(e.target.value)}
                id="email"
                type="email"
              />
            </div>
            <div>
              <label htmlFor="password">Password:</label>
              <Input
                onChange={(e) => setPassword(e.target.value)}
                id="password"
                type="password"
              />
              <Link href="/forgot-password" className="mt-2 underline">
                Forgot Password?
              </Link>
            </div>

            <Button className="mt-4" onClick={(e) => handleLogin(e)}>
              Login
            </Button>
            <div className="text-xs font-bold text-red-500">{error}</div>
          </form>
        </div>
      </div>
    </div>
  );
}
