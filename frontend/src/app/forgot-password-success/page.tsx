//Register SuccessFul Page - and a button to redirect to login page
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordSuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md text-center">
        <h1 className="text-2xl font-bold mb-4">Reset Password Link Sent.</h1>
        <p className="mb-6">
          Please check your email for the link to reset your password.
        </p>
        <Link href="/login">
          <Button>Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}
