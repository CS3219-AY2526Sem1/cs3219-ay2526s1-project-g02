"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useRouter } from "next/navigation";
import { useAuth } from "./providers/AuthProvider";
import { IS_EMAIL_TAKEN, IS_USERNAME_TAKEN, REGISTER } from "@/lib/queries";

export default function RegisterModal() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [username, setUsername] = useState("");

  const [is12Chars, setIs12Chars] = useState(false);
  const [hasUppandLow, setHasUppandLow] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);
  const [hasSymbol, setHasSymbol] = useState(false);
  const [isSame, setIsSame] = useState(false);

  const [isEmailTaken, setIsEmailTaken] = useState<boolean | null>(false);
  const [isUserNameTaken, setIsUserNameTaken] = useState<boolean | null>(false);
  const [isChecking, setIsChecking] = useState(true);
  const { loading, session } = useAuth();

  useEffect(() => {
    if (session) router.replace("/");
  }, [session]);

  useEffect(() => {
    setIs12Chars(password.length >= 12);
    setHasUppandLow(/^(?=.*[a-z])(?=.*[A-Z]).+$/.test(password));
    setHasNumber(/\d/.test(password));
    setHasSymbol(/[!@#$%^&*(),.?":{}|<>]/.test(password));
    setIsSame(password === repeatPassword);
  }, [password, repeatPassword]);

  useEffect(() => {
    const getData = setTimeout(async () => {
      try {
        setIsChecking(true);
        const res = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: IS_EMAIL_TAKEN,
            variables: { email },
          }),
        });

        const json = await res.json();

        const taken: boolean = json.data.isEmailTaken;

        setIsEmailTaken(taken);

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
    }, 80);

    return () => clearTimeout(getData);
  }, [email, username]);

  const submitCon =
    is12Chars &&
    hasUppandLow &&
    hasNumber &&
    hasSymbol &&
    isSame &&
    !isEmailTaken &&
    !isUserNameTaken;

  const handleRegisterButton = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (submitCon && !isChecking) {
        const resp = await fetch(`${process.env.NEXT_PUBLIC_GRAPHQL_URL}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            query: REGISTER,
            variables: {
              input: {
                email,
                password,
                username,
              },
            },
          }),
        });
        if (!resp.ok) {
          throw new Error(`Network error: ${resp.status} ${resp.statusText}`);
        }

        // Parse and handle GraphQL errors
        const { data, errors } = await resp.json();
        if (data) {
          router.push("/registerSuccess");
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div className="relative w-full max-w-lg rounded-2xl border border-[#e5e7eb] bg-[#ffffff] shadow-xl ring-1 ring-[#e5e7eb]">
        <div className="p-6 flex flex-col gap-4">
          <div className="text-2xl font-bold">Register</div>
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
                <div>
                  {isEmailTaken && (
                    <div className="text-red-500 text-xs">
                      *Email has already been taken.
                    </div>
                  )}
                </div>
              </div>

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
                    <div className=" text-red-500">
                      *Passwords must contain:
                    </div>
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

              <div>
                <label htmlFor="username">Username:</label>
                <Input
                  onChange={(e) => setUsername(e.target.value)}
                  id="username"
                  type="text"
                />
                <div>
                  {isUserNameTaken && (
                    <div className="text-red-500 text-xs">
                      *Username has already been taken.
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={(e) => handleRegisterButton(e)}
                className="mt-5 cursor-pointer  bg-gradient-to-r from-cyan-600 to-blue-600 text-white  font-semibold "
              >
                Register
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
