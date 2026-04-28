"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError } from "@/lib/api";
import {
  createScenario,
  fetchScenarioTypes,
  updateScenario,
  type ScenarioListItem,
  type ScenarioPayload,
  type ScenarioTypeOption,
} from "@/lib/scenario-api";

interface Props {
  open: boolean;
  equipCode: number | null;
  /** 편집 모드면 기존 시나리오 전달, 신규면 null */
  initial: ScenarioListItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ScenarioFormSheet({
  open,
  equipCode,
  initial,
  onClose,
  onSaved,
}: Props) {
  const [types, setTypes] = useState<ScenarioTypeOption[]>([]);
  const [name, setName] = useState("");
  const [typeCode, setTypeCode] = useState("");
  const [orderby, setOrderby] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewData, setViewData] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 시트 열릴 때마다 폼 초기화 — set-state-in-effect 룰 회피 위해 setTimeout(0)
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setName(initial?.name ?? "");
      setTypeCode(initial?.typeCode ?? "");
      setOrderby(
        initial?.orderby !== null && initial?.orderby !== undefined
          ? String(initial.orderby)
          : "",
      );
      setStartDate(toLocalInput(initial?.startDate ?? ""));
      setEndDate(toLocalInput(initial?.endDate ?? ""));
      setViewData(initial?.viewData ?? "");
      setText(initial?.text ?? "");
    }, 0);
    return () => clearTimeout(t);
  }, [open, initial]);

  // 타입 옵션 1회
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const ts = await fetchScenarioTypes();
        if (!cancelled) setTypes(ts);
      } catch {
        // 무시
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (equipCode === null) {
      toast.error("장비를 먼저 선택해주세요.");
      return;
    }
    if (!typeCode) {
      toast.error("시나리오 타입을 선택해주세요.");
      return;
    }
    if (!name.trim()) {
      toast.error("이름은 필수입니다.");
      return;
    }
    setSubmitting(true);
    const payload: ScenarioPayload = {
      typeCode,
      equipCode,
      name: name.trim(),
      orderby: orderby ? Number(orderby) : undefined,
      startDate: fromLocalInput(startDate) || undefined,
      endDate: fromLocalInput(endDate) || undefined,
      viewData: viewData.trim() || undefined,
      text: text || undefined,
    };
    try {
      if (initial) {
        await updateScenario(initial.code, payload);
        toast.success("시나리오를 저장했습니다.");
      } else {
        const created = await createScenario(payload);
        toast.success(`시나리오 ${created.code}을(를) 등록했습니다.`);
      }
      onSaved();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "저장에 실패했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-xl">
            {initial ? "시나리오 수정" : "시나리오 등록"}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            기본 정보를 입력하세요. 타입별 상세 빌더(텍스트·이미지·동영상 등)는
            다음 단계에서 추가됩니다.
          </p>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-5"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                타입 <span className="text-rose-500">*</span>
              </Label>
              <select
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
                disabled={submitting || !!initial}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 outline-none disabled:opacity-50"
              >
                <option value="">선택 안 함</option>
                {types.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.code} · {t.name}
                  </option>
                ))}
              </select>
              {initial && (
                <p className="text-[11px] text-muted-foreground">
                  타입은 등록 후 변경 불가
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">순서</Label>
              <Input
                type="number"
                min={0}
                value={orderby}
                onChange={(e) => setOrderby(e.target.value)}
                disabled={submitting}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              시나리오 이름 <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 시청앞 미세먼지 안내"
              disabled={submitting}
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">시작일시</Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">종료일시</Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={submitting}
                className="h-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              사용자 입력 (viewData)
            </Label>
            <Input
              value={viewData}
              onChange={(e) => setViewData(e.target.value)}
              placeholder="ST별 포맷 (텍스트|색상, 파일명|볼륨, pm25|pm10|... 등)"
              disabled={submitting}
              className="h-10 font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              레거시 PHP 호환 raw 입력. 다음 단계에서 타입별 상세 폼으로 교체됨.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              HTML 본문 (ST_007 전용)
            </Label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={submitting}
              rows={4}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 outline-none font-mono disabled:opacity-50"
              placeholder="<div>...</div>"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "저장 중…" : initial ? "저장" : "등록"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** 'YYYY-MM-DD HH:MM:SS' → 'YYYY-MM-DDTHH:MM' (datetime-local 입력 호환) */
function toLocalInput(s: string): string {
  if (!s || s.length < 16) return "";
  return `${s.slice(0, 10)}T${s.slice(11, 16)}`;
}

/** 'YYYY-MM-DDTHH:MM' → 'YYYY-MM-DD HH:MM:00' */
function fromLocalInput(s: string): string {
  if (!s || s.length < 16) return "";
  return `${s.slice(0, 10)} ${s.slice(11, 16)}:00`;
}
