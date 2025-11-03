import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ApolloWrapper } from "@/lib/apollo-provider";
import "@/app/globals.css";
import NavBar from "@/components/NavBar";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NoClue App",
  description: "Full-stack application with Next.js and NestJS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ApolloWrapper>
          <AuthProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
              {children}
            </div>
          </AuthProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
