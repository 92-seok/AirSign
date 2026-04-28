"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { AuthGuard } from "@/components/auth-guard";
import { EquipForm } from "@/components/equip-form";
import { ApiError } from "@/lib/api";
import { createEquip, type EquipPayload } from "@/lib/equip-api";

export default function NewEquipPage() {
  return (
    <AuthGuard>
      <Content />
    </AuthGuard>
  );
}

function Content() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (payload: EquipPayload) => {
    setSubmitting(true);
    try {
      const created = await createEquip(payload);
      toast.success(`장비 #${created.code}을(를) 등록했습니다.`);
      router.push("/equip");
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "장비 등록에 실패했습니다.";
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
            장비 등록
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            새 LED 전광판 장비 정보를 등록합니다.
          </p>
        </div>
        <EquipForm
          submitting={submitting}
          submitLabel="장비 등록"
          onSubmit={handleSubmit}
          onCancel={() => router.push("/equip")}
        />
      </main>
    </div>
  );
}
