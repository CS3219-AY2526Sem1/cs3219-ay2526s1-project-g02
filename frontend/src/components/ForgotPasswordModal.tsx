"use client";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:4001/users/resetpasswordlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      console.log("RESET PASSWORD RESPONSE:", data);
      console.log("RESPONSE OK?", res.ok);

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

            <Button onClick={(e) => handleResetPassword(e)}>
              Reset Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
