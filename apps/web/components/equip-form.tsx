"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchAirDos,
  fetchAirSis,
  fetchAirStations,
  fetchWeatherDos,
  fetchWeatherSis,
  fetchWeatherStations,
  type AirStation,
  type WeatherStation,
} from "@/lib/areas-api";
import { openPostcode } from "@/lib/daum-postcode";
import {
  fetchCategories,
  fetchDisplayTypes,
  type CategoryOption,
  type DisplayOption,
  type EquipDetailItem,
  type EquipPayload,
} from "@/lib/equip-api";
import { geocodeAddress } from "@/lib/kakao-sdk";

interface Props {
  initial?: EquipDetailItem;
  submitting: boolean;
  submitLabel?: string;
  onSubmit: (payload: EquipPayload) => void | Promise<void>;
  onCancel?: () => void;
}

export function EquipForm({
  initial,
  submitting,
  submitLabel = "저장",
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [cate, setCate] = useState(initial?.cate ?? "");
  const [displayType, setDisplayType] = useState(initial?.displayType ?? "");
  const [ip, setIp] = useState(initial?.ip ?? "");
  const [port, setPort] = useState(initial?.port ?? "");
  const [addr, setAddr] = useState(initial?.addr ?? "");
  const [lat, setLat] = useState(
    initial?.lat !== null && initial?.lat !== undefined
      ? String(initial.lat)
      : "",
  );
  const [lng, setLng] = useState(
    initial?.lng !== null && initial?.lng !== undefined
      ? String(initial.lng)
      : "",
  );
  const [weather, setWeather] = useState(
    initial?.weather !== null && initial?.weather !== undefined
      ? String(initial.weather)
      : "",
  );
  const [air, setAir] = useState(
    initial?.air !== null && initial?.air !== undefined
      ? String(initial.air)
      : "",
  );

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [displayTypes, setDisplayTypes] = useState<DisplayOption[]>([]);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [cats, dts] = await Promise.all([
          fetchCategories(),
          fetchDisplayTypes(),
        ]);
        if (!cancelled) {
          setCategories(cats);
          setDisplayTypes(dts);
        }
      } catch {
        // 옵션은 못 불러와도 폼은 동작
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAddressSearch = async () => {
    const data = await openPostcode();
    if (!data) return;
    const picked = data.roadAddress || data.address || data.jibunAddress;
    setAddr(picked);
    setGeocoding(true);
    try {
      const result = await geocodeAddress(picked);
      if (result) {
        setLat(result.lat.toString());
        setLng(result.lng.toString());
        toast.success("주소·좌표가 입력되었습니다.");
      } else {
        toast.message("주소를 찾았지만 좌표 변환에 실패했어요. 직접 입력해주세요.");
      }
    } catch {
      toast.error("좌표 검색 중 오류가 발생했습니다.");
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("장비 이름은 필수입니다.");
      return;
    }
    const payload: EquipPayload = {
      name: name.trim(),
      cate: cate || undefined,
      displayType: displayType || undefined,
      ip: ip.trim() || undefined,
      port: port.trim() || undefined,
      addr: addr.trim() || undefined,
      lat: lat.trim() || undefined,
      lng: lng.trim() || undefined,
      weather: weather ? Number(weather) : undefined,
      air: air ? Number(air) : undefined,
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
      <Section title="기본 정보" desc="장비를 식별하기 위한 정보입니다.">
        <Field label="장비 이름" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 시청앞 미세먼지 전광판"
            disabled={submitting}
            className="h-10"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="카테고리">
            <NativeSelect
              value={cate}
              onChange={(e) => setCate(e.target.value)}
              disabled={submitting}
            >
              <option value="">선택 안 함</option>
              {categories.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="디스플레이 타입">
            <NativeSelect
              value={displayType}
              onChange={(e) => setDisplayType(e.target.value)}
              disabled={submitting}
            >
              <option value="">선택 안 함</option>
              {displayTypes.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code}
                  {d.name ? ` · ${d.name}` : ""}
                  {d.sizeX && d.sizeY ? ` (${d.sizeX}×${d.sizeY})` : ""}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>
      </Section>

      <Section title="네트워크" desc="장비와 통신할 IP 주소·포트입니다.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Field label="IP 주소">
              <Input
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="예: 192.168.0.10"
                disabled={submitting}
                className="h-10 font-mono"
              />
            </Field>
          </div>
          <Field label="포트">
            <Input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="8080"
              disabled={submitting}
              className="h-10 font-mono"
              inputMode="numeric"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="설치 위치"
        desc="주소 검색 시 좌표가 자동으로 입력됩니다."
      >
        <Field label="주소">
          <div className="flex gap-2">
            <Input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="주소 검색을 눌러주세요"
              disabled={submitting || geocoding}
              className="h-10 flex-1"
              readOnly
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddressSearch}
              disabled={submitting || geocoding}
              className="h-10 shrink-0"
            >
              {geocoding ? "검색 중…" : "주소 검색"}
            </Button>
          </div>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="위도 (Latitude)">
            <Input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="37.5665"
              disabled={submitting}
              className="h-10 font-mono"
              inputMode="decimal"
            />
          </Field>
          <Field label="경도 (Longitude)">
            <Input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="126.9780"
              disabled={submitting}
              className="h-10 font-mono"
              inputMode="decimal"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="측정소 매핑"
        desc="대시보드에서 표출할 대기·기상 측정소를 시도/시군 단위로 선택하세요."
      >
        <div className="space-y-2">
          <Label className="text-xs lg:text-sm">대기 측정소 (PM2.5/PM10/O₃)</Label>
          <AirCascade
            valueCode={air}
            onChange={(code) => setAir(code)}
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs lg:text-sm">기상 측정소 (기온/습도/풍속)</Label>
          <WeatherCascade
            valueCode={weather}
            onChange={(code) => setWeather(code)}
            disabled={submitting}
          />
        </div>
      </Section>

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            취소
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? "저장 중…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

interface CascadeProps {
  valueCode: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

function AirCascade({ valueCode, onChange, disabled }: CascadeProps) {
  const [dos, setDos] = useState<string[]>([]);
  const [sis, setSis] = useState<string[]>([]);
  const [stations, setStations] = useState<AirStation[]>([]);
  const [doName, setDoName] = useState("");
  const [siName, setSiName] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchAirDos()
      .then((d) => {
        if (!cancelled) setDos(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!doName) {
      const t = setTimeout(() => setSis([]), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    void fetchAirSis(doName)
      .then((d) => {
        if (!cancelled) setSis(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [doName]);

  useEffect(() => {
    if (!doName || !siName) {
      const t = setTimeout(() => setStations([]), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    void fetchAirStations(doName, siName)
      .then((d) => {
        if (!cancelled) setStations(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [doName, siName]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <NativeSelect
        value={doName}
        onChange={(e) => {
          setDoName(e.target.value);
          setSiName("");
          onChange("");
        }}
        disabled={disabled}
      >
        <option value="">시·도 선택</option>
        {dos.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={siName}
        onChange={(e) => {
          setSiName(e.target.value);
          onChange("");
        }}
        disabled={disabled || !doName}
      >
        <option value="">시·군·구</option>
        {sis.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={valueCode}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || stations.length === 0}
      >
        <option value="">측정소 선택</option>
        {stations.map((st) => (
          <option key={st.code} value={String(st.code)}>
            {st.name || `#${st.code}`}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function WeatherCascade({ valueCode, onChange, disabled }: CascadeProps) {
  const [dos, setDos] = useState<string[]>([]);
  const [sis, setSis] = useState<string[]>([]);
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [doName, setDoName] = useState("");
  const [siName, setSiName] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchWeatherDos()
      .then((d) => {
        if (!cancelled) setDos(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!doName) {
      const t = setTimeout(() => setSis([]), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    void fetchWeatherSis(doName)
      .then((d) => {
        if (!cancelled) setSis(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [doName]);

  useEffect(() => {
    if (!doName || !siName) {
      const t = setTimeout(() => setStations([]), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    void fetchWeatherStations(doName, siName)
      .then((d) => {
        if (!cancelled) setStations(d);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [doName, siName]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <NativeSelect
        value={doName}
        onChange={(e) => {
          setDoName(e.target.value);
          setSiName("");
          onChange("");
        }}
        disabled={disabled}
      >
        <option value="">시·도 선택</option>
        {dos.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={siName}
        onChange={(e) => {
          setSiName(e.target.value);
          onChange("");
        }}
        disabled={disabled || !doName}
      >
        <option value="">시·군·구</option>
        {sis.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        value={valueCode}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || stations.length === 0}
      >
        <option value="">관측소 선택</option>
        {stations.map((st) => (
          <option key={st.code} value={String(st.code)}>
            {st.eup || `#${st.code}`}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5 lg:p-7 space-y-5 shadow-sm">
      <header className="space-y-1">
        <h3 className="text-base lg:text-lg font-semibold">{title}</h3>
        {desc && (
          <p className="text-xs lg:text-sm text-muted-foreground">{desc}</p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
      </Label>
      {children}
    </div>
  );
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", ...rest } = props;
  return (
    <select
      {...rest}
      className={`h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30 ${className}`}
    />
  );
}
