import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useAuth } from "./providers/AuthProvider";
import { Input } from "./ui/input";
import { Divide } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  DELETE_ACCOUNT_WITH_INPUT,
  IS_USERNAME_TAKEN,
  MY_USERNAME_QUERY,
  UPDATE_MY_USERNAME,
  VERIFY_PASSWORD,
} from "@/lib/queries";
import UpdatePasswordModal from "./UpdatePasswordModal";

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

  const [activeTab, setActiveTab] = useState<
    "update" | "delete" | "changepw"
  >("update");


  const { session } = useAuth();
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const [isUserNameTaken, setIsUserNameTaken] = useState(false);
  const [initialUser, setInitialUser] = useState("");

  useEffect(() => {
    const getData = setTimeout(async () => {
      try {
        setIsChecking(true);

        const userNameRes = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: IS_USERNAME_TAKEN,
            variables: { username },
          }),
        });

        const userNamejson = await userNameRes.json();

        const userNameTaken: boolean = userNamejson.data.isUsernameTaken;

        setIsUserNameTaken(userNameTaken);
      } catch (error) {
        console.error(error);
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => clearTimeout(getData);
  }, [username]);

  useEffect(() => {
    async function getUsername() {
      const id = session.user.id;
      const res = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: MY_USERNAME_QUERY,
          variables: { id },
        }),
      });
      const json = await res.json();

      const myUsername: string = json.data?.myUsername ?? "";
      setInitialUser(myUsername);
      setUsername(myUsername);
    }

    getUsername();
  }, []);

  async function handleChangeUser(e: React.FormEvent) {
    e.preventDefault();
    if (!isChecking) {
      const id = session.user.id;
      try {
        const res = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: UPDATE_MY_USERNAME,
            variables: { id, username },
          }),
        });
        const json = await res.json();
        onClose();
      } catch (error) {
        console.error(error);
      }
    }
  }

  async function handleDeleteAccount() {
    const userId = session.user.id;
    const email = session.user.email;

    const verifyrRes = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: VERIFY_PASSWORD,
        variables: { input: { email, password } },
      }),
    });

    if (!verifyrRes.ok) {
      console.error("HTTP", verifyrRes.status, await verifyrRes.text());
      setError("Request failed");
      return;
    }

    const verifyJson = await verifyrRes.json();
    if (verifyJson.errors?.length) {
      const e = verifyJson.errors[0];
      // e.extensions?.status === 401 when invalid
      setError(e.message || "Invalid credentials");
      return;
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_GRAPHQL_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: DELETE_ACCOUNT_WITH_INPUT,
        variables: { input: { userId } },
      }),
    });

    const json = await res.json();

    if (json.errors?.length) {
      const first = json.errors[0];
      const status = first.extensions?.status; // if you map HttpException -> extensions.status
      const err = new Error(first.message) as Error & { status?: number };
      err.status = status;
      throw err;
    }

    if (res.ok) {
      onClose();
      await supabase.auth.signOut({ scope: "local" });

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
              activeTab === "changepw"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
            onClick={() => {
              setActiveTab("changepw");
              setIsConfirmed(false);
              setError("");
            }}
          >
            Change Password
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
              <Input
                onChange={(e) => {
                  setUsername(e.target.value);
                  setIsUserNameTaken(false); // clear stale verdict immediately
                  setIsChecking(true);
                }}
                value={username as string}
                type="text"
                placeholder="Username"
                className="w-full rounded-md border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isUserNameTaken && username.trim() !== initialUser && (
                <div className="text-red-500 text-xs">
                  *Username has already been taken.
                </div>
              )}
              {username.trim() &&
                username.trim() !== initialUser &&
                isChecking && (
                  <div className="text-gray-500 text-xs">Checking…</div>
                )}

              <div className="mb-4 flex justify-end">
                <Button
                  onClick={(e) => {
                    handleChangeUser(e);
                  }}
                  className=" cursor-pointer  bg-gradient-to-r from-cyan-600 to-blue-600 text-white  font-semibold "
                >
                  Save Changes
                </Button>
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

          {activeTab === "changepw" && (
            <div className="flex flex-col gap-y-6">
              <UpdatePasswordModal
                isForgot={false}
                onClose={onClose}
              ></UpdatePasswordModal>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
