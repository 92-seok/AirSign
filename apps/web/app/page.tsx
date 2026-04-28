"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { getToken } from "@/lib/auth";

const SEQUENCE_TOTAL_MS = 3500;
const EXIT_MS = 550;

export default function Home() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  const navigate = useCallback(() => {
    setExiting((prev) => {
      if (prev) return prev;
      const dest = getToken() ? "/dashboard" : "/login";
      window.setTimeout(() => router.replace(dest), EXIT_MS);
      return true;
    });
  }, [router]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(navigate, reduced ? 200 : SEQUENCE_TOTAL_MS);
    return () => window.clearTimeout(t);
  }, [navigate]);

  return (
    <div
      className={`relative min-h-svh overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 transition-all duration-500 ease-out ${
        exiting ? "opacity-0 scale-[1.03]" : "opacity-100 scale-100"
      }`}
    >
      {/* 배경 글로우 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 size-[680px] rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 size-[520px] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 size-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      {/* 풀스크린 터치 캡처 — iOS Safari/Android 모두 호환 */}
      <button
        type="button"
        onClick={navigate}
        aria-label="시작 화면 — 탭하여 진행"
        className="absolute inset-0 z-10 w-full h-full cursor-pointer focus:outline-none"
      />

      {/* 텍스트 — pointer-events-none으로 클릭은 button에 양보 */}
      <div className="absolute inset-0 z-20 flex items-center justify-center px-6 pointer-events-none">
        <div className="text-center w-full max-w-2xl break-keep">
          <div className="intro-line" style={{ animationDelay: "0.2s" }}>
            <h2 className="text-sm sm:text-base md:text-lg font-medium text-white/85 tracking-wide">
              AirSign
            </h2>
          </div>

          <div
            className="intro-line mt-3 sm:mt-4"
            style={{ animationDelay: "1.0s" }}
          >
            <h1 className="text-[clamp(1.5rem,6.5vw,3rem)] font-bold tracking-tight leading-snug bg-gradient-to-r from-sky-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              미세먼지 전광판 통합 관리 시스템
            </h1>
          </div>

          <div
            className="intro-line inline-flex items-center gap-2 mt-6 sm:mt-8 text-[11px] text-white/40"
            style={{ animationDelay: "2.0s" }}
          >
            <span className="font-mono tracking-widest">AirSign</span>
            <span className="size-1 rounded-full bg-white/30" />
            <span>v0.1</span>
          </div>
        </div>
      </div>

      {/* 하단 안내 */}
      <div
        className="absolute bottom-6 inset-x-0 z-20 text-center text-[11px] text-white/35 intro-line pointer-events-none"
        style={{ animationDelay: "2.6s" }}
      >
        화면을 탭하면 바로 이동합니다
      </div>
    </div>
  );
}
