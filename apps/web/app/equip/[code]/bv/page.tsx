"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { BV24Editor } from "@/components/bv24-editor";
import { ApiError } from "@/lib/api";
import {
  fetchEquip,
  parseBVString,
  updateEquipBV,
  type EquipDetailItem,
} from "@/lib/equip-api";

export default function EquipBVPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return (
    <AuthGuard>
      <Content code={Number(code)} />
    </AuthGuard>
  );
}

function Content({ code }: { code: number }) {
  const router = useRouter();
  const [equip, setEquip] = useState<EquipDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchEquip(code);
        if (!cancelled) setEquip(data);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "장비 정보를 불러올 수 없습니다.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleSubmit = async (bright: number[], volume: number[]) => {
    setSubmitting(true);
    try {
      await updateEquipBV(code, { bright, volume });
      toast.success("24시간 밝기·볼륨이 저장되었습니다.");
      router.push("/equip");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "저장에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col">
      <AppHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
        <div className="mb-7 lg:mb-9">
          <Link
            href="/equip"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 장비 목록으로
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-3 bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
            24시간 밝기·볼륨
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {equip
              ? `${equip.name || `장비 #${code}`} · 시간대별 0~100%`
              : `장비 #${code}`}
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border-2 border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
            불러오는 중…
          </div>
        ) : error || !equip ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {error ?? "장비를 찾을 수 없습니다."}
            </p>
          </div>
        ) : (
          <BV24Editor
            initialBright={parseBVString(equip.bright, 80)}
            initialVolume={parseBVString(equip.volume, 50)}
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/equip")}
          />
        )}
      </main>
    </div>
  );
}
