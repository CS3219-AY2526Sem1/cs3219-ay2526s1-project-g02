"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout";
import NavBar from "@/components/NavBar";

export default function DeleteSuccessPage() {
  return (
    <PageLayout header={<NavBar></NavBar>}>
      <div className="flex h-screen w-screen flex-col items-center justify-center text-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Goodbye 👋</h1>
          <p className="text-gray-600 mb-6">
            Your account has been{" "}
            <span className="font-semibold text-red-600">
              deleted successfully
            </span>
            .
            <br />
            We’re sad to see you go — but you’re always welcome back.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button
                variant="default"
                className=" cursor-pointer px-6  bg-gradient-to-r from-cyan-600 to-blue-600 text-white  font-semibold "
              >
                Return Home
              </Button>
            </Link>

            <Link href="/register">
              <Button variant="outline" className="px-6 cursor-pointer">
                Create New Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
