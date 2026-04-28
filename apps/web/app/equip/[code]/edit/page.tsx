"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { EquipForm } from "@/components/equip-form";
import { ApiError } from "@/lib/api";
import {
  fetchEquip,
  updateEquip,
  type EquipDetailItem,
  type EquipPayload,
} from "@/lib/equip-api";

export default function EditEquipPage({
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
  const [initial, setInitial] = useState<EquipDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await fetchEquip(code);
        if (!cancelled) setInitial(data);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError
            ? err.message
            : "장비 정보를 불러올 수 없습니다.";
        setError(msg);
        toast.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const handleSubmit = async (payload: EquipPayload) => {
    setSubmitting(true);
    try {
      await updateEquip(code, payload);
      toast.success("장비 정보를 저장했습니다.");
      router.push("/equip");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "장비 수정에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col">
      <AppHeader />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-10">
        <div className="mb-7 lg:mb-9">
          <Link
            href="/equip"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 장비 목록으로
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-3 bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
            장비 #{code} 수정
          </h1>
          {initial?.name && (
            <p className="text-sm text-muted-foreground mt-2">
              {initial.name}
            </p>
          )}
        </div>

        {loading ? (
          <div className="rounded-xl border-2 border-dashed bg-card/50 p-10 text-center text-sm text-muted-foreground">
            장비 정보 불러오는 중…
          </div>
        ) : error || !initial ? (
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {error ?? "장비를 찾을 수 없습니다."}
            </p>
          </div>
        ) : (
          <EquipForm
            initial={initial}
            submitting={submitting}
            submitLabel="저장"
            onSubmit={handleSubmit}
            onCancel={() => router.push("/equip")}
          />
        )}
      </main>
    </div>
  );
}
