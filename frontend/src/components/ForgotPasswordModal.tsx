"use client";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { RESET_PASSWORD_LINK } from "@/lib/queries";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_GRAPHQL_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: RESET_PASSWORD_LINK,
          variables: { input: { email } },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push("/forgot-password-success");
      }
    } catch (e) {
      console.error(e);
    }
  }
  return (
    <div className="relative w-full max-w-lg rounded-2xl border border-[#e5e7eb] bg-[#ffffff] shadow-xl ring-1 ring-[#e5e7eb]">
      <div className="p-6 flex flex-col gap-4">
        <div className="text-2xl font-bold">Forgot Password</div>
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

            <Button
              className="mt-4 cursor-pointer  bg-gradient-to-r from-cyan-600 to-blue-600 text-white  font-semibold "
              onClick={(e) => handleResetPassword(e)}
            >
              Reset Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
