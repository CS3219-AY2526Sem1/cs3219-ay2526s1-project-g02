"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "./providers/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import SettingsModal from "./SettingsModal";
import { useState } from "react";
import { Code2 } from "lucide-react";

export default function NavBar() {
  const { session, setSession, loading } = useAuth();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState("");

  async function handleLogOut(e: React.FormEvent) {
    e.preventDefault();
    try {
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
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-slate-800">
            <div className="flex  items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Code2 className="w-6 h-6 text-white" />
              </div>
              <div>NoClue</div>
            </div>
          </Link>

          <div className="flex gap-3">
            {!session ? (
              <>
                <Link href="/login">
                  <Button variant="outline" className="cursor-pointer">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="cursor-pointer  bg-gradient-to-r from-cyan-600 to-blue-600 text-white  font-semibold ">
                    Register
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/attempt-history">
                  <Button
                    variant="outline"
                    className="cursor-pointer border-cyan-600 text-cyan-600 hover:bg-cyan-50"
                  >
                    Attempt History
                  </Button>
                </Link>
                <div>
                  <Button
                    onClick={() => setIsSettingsOpen(true)}
                    className="cursor-pointer  bg-gradient-to-r from-cyan-600 to-blue-600 text-white  font-semibold "
                  >
                    My Account
                  </Button>
                </div>
                <div>
                  <Button
                    className="cursor-pointer  bg-gradient-to-r from-cyan-600 to-blue-600 text-white  font-semibold "
                    onClick={(e) => handleLogOut(e)}
                  >
                    Logout
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => {
            setIsSettingsOpen(false);
            setIsConfirmed(false);
            setError("");
          }}
          isConfirmed={isConfirmed}
          setIsConfirmed={setIsConfirmed}
          error={error}
          setError={setError}
        />
      )}
    </>
  );
}
