"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "./providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import SettingsModal from "./SettingsModal";
import { useState } from "react";

export default function NavBar() {
  const { session, setSession, loading } = useAuth();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  async function handleLogOut(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data } = await supabase.auth.getSession();
      const access_token = data.session?.access_token;

      console.log("ACCESS TOKEN ON LOGOUT:", access_token);

      const res = await fetch("http://localhost:4001/users/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token }),
      });

      const result = await res.json();
      console.log(result.message || "Signout response:", result);

      await supabase.auth.signOut();
      setSession(null);

      router.push("/");
    } catch (error) {
      console.error("Error during signout:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="h-12 w-12 rounded-full border-4 border-gray-300 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <nav className="w-full border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link href="/" className="text-xl font-semibold hover:text-primary">
            NoClue
          </Link>

          <div className="flex gap-3">
            {!session ? (
              <>
                <Link href="/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Register</Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setIsSettingsOpen(true)}
                  className="cursor-pointer"
                >
                  Settings
                </Button>
                <Button
                  className="cursor-pointer"
                  onClick={(e) => handleLogOut(e)}
                >
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </>
  );
}
