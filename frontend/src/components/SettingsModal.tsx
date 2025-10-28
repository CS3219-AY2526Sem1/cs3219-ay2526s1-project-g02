import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useAuth } from "./providers/AuthProvider";
import { Input } from "./ui/input";
import { Divide } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SettingsModal({
  onClose,
  isConfirmed,
  setIsConfirmed,
  error,
  setError,
}: {
  onClose: () => void;
  isConfirmed: boolean;
  setIsConfirmed: Dispatch<SetStateAction<boolean>>;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
}) {
  const [activeTab, setActiveTab] = useState<"update" | "delete" | "get">(
    "get"
  );

  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const router = useRouter();

  async function handleDeleteAccount() {
    const userId = session.user.id;
    const email = session.user.email;

    const verifyRes = await fetch(
      "http://localhost:4001/users/verify-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }
    );

    if (!verifyRes.ok) {
      setError("Incorrect password. Please try again.");
      return;
    }
    const data = await verifyRes.json();

    if (!data) {
      return;
    }

    const deleteAccount = await fetch("http://localhost:4001/users/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (deleteAccount.ok) {
      onClose();
      await supabase.auth.signOut();
      router.push("/delete-success");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white px-6 pt-6 shadow-2xl transition-all"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">My Account</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-gray-100 cursor-pointer"
          >
            <div>X</div>
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "get"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
            onClick={() => {
              setActiveTab("get");
              setIsConfirmed(false);
              setError("");
            }}
          >
            Account Details
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "update"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
            onClick={() => {
              setActiveTab("update");
              setIsConfirmed(false);
              setError("");
            }}
          >
            Update Details
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "delete"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
            onClick={() => {
              setActiveTab("delete");
              setIsConfirmed(false);
              setError("");
            }}
          >
            Delete Account
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[180px]">
          {activeTab === "update" && (
            <div className="flex flex-col gap-y-4">
              <p className="text-gray-700 text-sm">
                You can update your account details below.
              </p>
              <input
                type="text"
                placeholder="Username"
                className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mb-4 flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </div>
          )}

          {activeTab === "delete" && (
            <div className="flex flex-col gap-y-6">
              <h3 className="text-lg font-semibold text-red-600">
                Delete Account
              </h3>
              <p className="text-sm text-gray-700">
                All your data will be permanently deleted and this action is
                irreversible. Are you sure you want to continue?
              </p>
              <div className="flex justify-end mb-4">
                {isConfirmed ? (
                  <div className="w-full flex flex-col gap-y-2 text-sm text-gray-700">
                    <div>Key in your password to confirm this action.</div>
                    <label htmlFor="password">Password:</label>
                    <Input
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      className="w-full "
                    ></Input>
                    {error && (
                      <div className="text-red-500 font-semibold">{error}</div>
                    )}
                    <Button
                      onClick={() => handleDeleteAccount()}
                      className=" text-white mt-6"
                      variant="destructive"
                    >
                      Confirm
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setIsConfirmed(true);
                    }}
                    className=" text-white"
                    variant="destructive"
                  >
                    Delete Account
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
