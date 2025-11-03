//Register SuccessFul Page - and a button to redirect to login page
import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/PageLayout";
import NavBar from "@/components/NavBar";

export default function UpdatePasswordSuccessPage() {
  return (
    <PageLayout header={<NavBar></NavBar>}>
      <div className="flex flex-col items-center justify-center ">
        <div className="bg-white p-8 rounded shadow-md text-center">
          <h1 className="text-2xl font-bold mb-4">
            Update Password Successful.
          </h1>
          <p className="mb-6">Your password has been successfully updated.</p>
          <Link href="/login">
            <Button className="cursor-pointer  bg-gradient-to-r from-cyan-600 to-blue-600 text-white  font-semibold ">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}
