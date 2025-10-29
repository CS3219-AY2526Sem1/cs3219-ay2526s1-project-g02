"use client";
import React, { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import Link from "next/dist/client/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "./providers/AuthProvider";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { LOGIN_MUTATION } from "@/lib/queries";

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
      const res = await fetch(`${process.env.NEXT_PUBLIC_GRAPHQL_URL}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: LOGIN_MUTATION,
          variables: { input: { email, password } },
        }),
      });
      console.log("RES", res);
      if (!res.ok) {
        console.error("HTTP", res.status, await res.text()); // you'll see class-validator errors here
        return;
      }

      const json = await res.json();
      console.log("JSON", json);

      if (json.errors?.length) {
        setError("Invalid email or password");
        return;
      }

      const payload = json.data.login;

      const access_token = payload?.access_token ?? null;
      console.log("ACCESS TOK", access_token);
      const refresh_token = payload?.refresh_token ?? null;
      console.log("REFRESH TOK", refresh_token);

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        setError("Internal server error");
        return;
      }

      // redirect like before
      router.push("/");
    } catch (err) {
      console.error("An error occurred during login:", err);
      setError("Internal server error");
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

            <div className="flex flex-row justify-between">
              <Button
                className="w-[45%]"
                onClick={async (e) => {
                  e.preventDefault();
                  await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: `http://localhost.com:3000/auth/callback`,
                    },
                  });
                }}
              >
                <div className="flex flex-row justify-center items-center gap-2">
                  <div>
                    <FcGoogle> </FcGoogle>
                  </div>
                  <div> Login with Google</div>
                </div>
              </Button>

              <Button
                className="w-[45%] "
                onClick={async (e) => {
                  e.preventDefault();
                  await supabase.auth.signInWithOAuth({
                    provider: "github",
                    options: {
                      redirectTo: `http://localhost.com:3000/auth/callback`,
                    },
                  });
                }}
              >
                <div>
                  <FaGithub></FaGithub>
                </div>
                <div> Login with GitHub</div>
              </Button>
            </div>
            <div className="text-xs font-bold text-red-500">{error}</div>
          </form>
        </div>
      </div>
    </div>
  );
}
