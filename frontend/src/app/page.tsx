"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import NavBar from "@/components/NavBar";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";

import { Code2, Users, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { session } = useAuth();
  return (
    <>
      <PageLayout header={<NavBar></NavBar>}>
        <div>
          <main className=" w-full mx-auto  pt-20 pb-32">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-cyan-200 mb-8">
                <Zap className="w-4 h-4 text-cyan-600" />
                <span className="text-sm font-medium text-slate-700">
                  Real-time LeetCode collaboration
                </span>
              </div>

              <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
                Find Your Perfect
                <span className="block bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Coding Partner
                </span>
              </h1>

              <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
                Connect with developers worldwide to solve LeetCode problems
                together. Match with peers, collaborate in real-time, and level
                up your coding skills.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
                {!session ? (
                  <Link href="/register">
                    <button className="cursor-pointer group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300 flex items-center gap-2">
                      Register
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                ) : (
                  <Link href="/matching">
                    <button className="cursor-pointer group px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold text-lg hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300 flex items-center gap-2">
                      Start Matching
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-8 mt-12">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/50 hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Users className="w-7 h-7 text-cyan-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Smart Matching
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Get paired with developers at your skill level based on your
                    preferences and goals.
                  </p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/50 hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Code2 className="w-7 h-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Live Collaboration
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Code together in real-time with a shared editor and instant
                    communication.
                  </p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/50 hover:shadow-xl transition-shadow">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-xl flex items-center justify-center mb-4 mx-auto">
                    <Zap className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Skill Growth
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    Learn faster by solving problems together and sharing
                    different approaches.
                  </p>
                </div>
              </div>
            </div>
          </main>

          <footer className="container mx-auto px-6 py-8 border-t border-slate-200">
            <p className="text-center text-slate-500 text-sm">
              © 2025 NoClue. Elevate your coding journey together.
            </p>
          </footer>
        </div>
      </PageLayout>
    </>
  );
}
