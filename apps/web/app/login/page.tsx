"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { login, setSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id.trim() || !pw) {
      toast.error("아이디와 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await login(id.trim(), pw);
      setSession(res.access_token, res.user);
      toast.success(`환영합니다, ${res.user.name?.trim() || res.user.id}님`);
      router.push("/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-500 p-12 text-white">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-40 -left-40 size-[500px] rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-20 size-[400px] rounded-full bg-cyan-300/30 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-medium">
            <span className="size-1.5 rounded-full bg-white" />
            AirSign
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight break-keep">
            미세먼지 전광판
            <br />
            통합 관리 시스템
          </h1>
          <p className="text-base text-white/85 max-w-md">
            현장에 설치된 LED 전광판을 한 곳에서 제어하고,
            미세먼지 정보를 실시간으로 표출합니다.
          </p>
        </div>
        <div className="relative z-10 text-xs text-white/70">
          © {new Date().getFullYear()} AirSign · 미세먼지 전광판 통합 관리 시스템
        </div>
      </aside>

      <section className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm space-y-7">
          <div className="space-y-1 lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              AirSign
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">로그인</h2>
            <p className="text-sm text-muted-foreground">
              관리자 계정으로 로그인하세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">아이디</Label>
              <Input
                id="userId"
                name="id"
                autoComplete="username"
                placeholder="아이디 입력"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={loading}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPw">비밀번호</Label>
              <Input
                id="userPw"
                name="pw"
                type="password"
                autoComplete="current-password"
                placeholder="비밀번호 입력"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                disabled={loading}
                className="h-10"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-11 text-sm"
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            계정 문제는 시스템 관리자에게 문의해 주세요.
          </p>
        </div>
      </section>
    </div>
  );
}
