"use client";
import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { UPDATE_PASSWORD } from "@/lib/queries";

export default function UpdatePasswordModal() {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [is12Chars, setIs12Chars] = useState(false);
  const [hasUppandLow, setHasUppandLow] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSymbol, setHasSymbol] = useState(false);

  const [isSame, setIsSame] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setError(undefined);
    setIs12Chars(password.length >= 12);
    setHasUppandLow(/^(?=.*[a-z])(?=.*[A-Z]).+$/.test(password));
    setHasNumber(/\d/.test(password));
    setHasSymbol(/[!@#$%^&*(),.?":{}|<>]/.test(password));
    setIsSame(password === repeatPassword);
  }, [password, repeatPassword]);

  const router = useRouter();

  useEffect(() => {
    setIsSame(password === repeatPassword);
  }, [password, repeatPassword]);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: password,
      });

      setError(error?.message);

      if (!error) {
        router.push("/update-password-success");
      }
    } catch (e) {
      console.error(e);
    }
  }
  return (
    <div className="relative w-full max-w-lg rounded-2xl border border-[#e5e7eb] bg-[#ffffff] shadow-xl ring-1 ring-[#e5e7eb]">
      <div className="p-6 flex flex-col gap-4">
        <div className="text-2xl font-bold">Update Password</div>
        <div>
          <form className="flex flex-col gap-3">
            <div>
              <label htmlFor="password">Password:</label>
              <Input
                onChange={(e) => setPassword(e.target.value)}
                id="password"
                type="password"
              />
              <div className="text-xs font-bold">
                {is12Chars && hasUppandLow && hasNumber && hasSymbol ? (
                  <div className=" text-green-500">
                    *Passwords must contain:
                  </div>
                ) : (
                  <div className=" text-red-500">*Passwords must contain:</div>
                )}
                <div className="ml-4 flex flex-col gap-1 text-xs">
                  {is12Chars ? (
                    <div className=" text-green-500">
                      - At least 12 characters
                    </div>
                  ) : (
                    <div className=" text-red-500">
                      - At least 12 characters
                    </div>
                  )}
                  {hasUppandLow ? (
                    <div className=" text-green-500">
                      - Uppercase and lowercase letters
                    </div>
                  ) : (
                    <div className=" text-red-500">
                      - Uppercase and lowercase letters
                    </div>
                  )}
                  {hasNumber ? (
                    <div className=" text-green-500">- Numbers</div>
                  ) : (
                    <div className=" text-red-500">- Numbers</div>
                  )}
                  {hasSymbol ? (
                    <div className=" text-green-500">- Symbols</div>
                  ) : (
                    <div className="text-red-500">- Symbols</div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="password">Repeat Password:</label>
              <Input
                onChange={(e) => setRepeatPassword(e.target.value)}
                id="repeat-password"
                type="password"
              />
              <div>
                {!isSame && (
                  <div className="text-red-500 text-xs">
                    *Passwords must match
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs font-bold text-red-500">{error}</div>

            <Button
              className="cursor-pointer  bg-gradient-to-r from-cyan-600 to-blue-600 text-white  font-semibold "
              onClick={(e) => handleUpdatePassword(e)}
            >
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
