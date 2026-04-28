"use client";

import { useEffect, useMemo, useRef } from "react";

import type { EquipDashboardItem } from "@/lib/equip-api";

interface KakaoLatLng {
  __brand?: "LatLng";
}
interface KakaoMap {
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
  setBounds(bounds: KakaoLatLngBounds): void;
}
interface KakaoLatLngBounds {
  extend(latlng: KakaoLatLng): void;
  isEmpty(): boolean;
}
interface KakaoOverlay {
  setMap(map: KakaoMap | null): void;
}
interface KakaoMapsApi {
  load(cb: () => void): void;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: HTMLElement | string;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoOverlay;
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsApi };
  }
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const SDK_URL_BASE = "https://dapi.kakao.com/v2/maps/sdk.js";

let sdkPromise: Promise<void> | null = null;

function loadKakaoSdk(key: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.kakao?.maps) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[data-kakao-sdk="1"]`,
      );
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = `${SDK_URL_BASE}?appkey=${key}&autoload=false`;
        script.async = true;
        script.dataset.kakaoSdk = "1";
        document.head.appendChild(script);
      }
      const onLoaded = () => {
        const api = window.kakao?.maps;
        if (!api) {
          reject(new Error("카카오맵 SDK 초기화 실패"));
          return;
        }
        api.load(() => resolve());
      };
      if (existing && window.kakao?.maps) onLoaded();
      else {
        script.addEventListener("load", onLoaded, { once: true });
        script.addEventListener(
          "error",
          () => reject(new Error("카카오맵 SDK 로드 실패")),
          { once: true },
        );
      }
    });
  }
  return sdkPromise;
}

interface Props {
  equips: EquipDashboardItem[];
  selectedCode: number | null;
  onMarkerClick?: (equip: EquipDashboardItem) => void;
  className?: string;
}

export function KakaoMap({
  equips,
  selectedCode,
  onMarkerClick,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const overlaysRef = useRef<KakaoOverlay[]>([]);
  const onClickRef = useRef(onMarkerClick);
  useEffect(() => {
    onClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  const validPoints = useMemo(
    () =>
      equips.filter(
        (e): e is EquipDashboardItem & { lat: number; lng: number } =>
          e.lat !== null &&
          e.lng !== null &&
          Number.isFinite(e.lat) &&
          Number.isFinite(e.lng),
      ),
    [equips],
  );

  // 1) SDK + Map 1회 초기화
  useEffect(() => {
    if (!KAKAO_KEY) return;
    let cancelled = false;
    loadKakaoSdk(KAKAO_KEY)
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const api = window.kakao?.maps;
        if (!api) return;
        const center = new api.LatLng(36.5, 127.8); // 한국 중심 기본값
        mapRef.current = new api.Map(containerRef.current, {
          center,
          level: 12,
        });
      })
      .catch((err: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[KakaoMap] SDK load failed", err);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) 마커 갱신 (equips 또는 selectedCode 변경 시)
  useEffect(() => {
    if (!KAKAO_KEY) return;
    let cancelled = false;
    loadKakaoSdk(KAKAO_KEY)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const api = window.kakao?.maps;
        if (!api) return;
        const map = mapRef.current;

        // 기존 overlay 제거
        overlaysRef.current.forEach((o) => o.setMap(null));
        overlaysRef.current = [];

        // 새 마커 생성
        const bounds = new api.LatLngBounds();
        validPoints.forEach((e) => {
          const el = document.createElement("div");
          el.className = "airsign-marker";
          el.dataset.status = e.status;
          el.dataset.selected = String(selectedCode === e.code);
          el.title = e.name;
          el.addEventListener("click", (ev) => {
            ev.stopPropagation();
            onClickRef.current?.(e);
          });
          const overlay = new api.CustomOverlay({
            position: new api.LatLng(e.lat, e.lng),
            content: el,
            xAnchor: 0.5,
            yAnchor: 0.5,
            zIndex: selectedCode === e.code ? 10 : 1,
          });
          overlay.setMap(map);
          overlaysRef.current.push(overlay);
          bounds.extend(new api.LatLng(e.lat, e.lng));
        });

        // 첫 마커 그릴 때 화면 맞춤
        if (!bounds.isEmpty() && validPoints.length > 0) {
          map.setBounds(bounds);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [validPoints, selectedCode]);

  if (!KAKAO_KEY) {
    return (
      <div
        className={`${className ?? ""} flex items-center justify-center text-center text-sm text-muted-foreground bg-muted/40 p-6`}
      >
        카카오맵 API 키가 설정되지 않았습니다.
        <br />
        <code className="text-xs">.env.local</code>의{" "}
        <code className="text-xs">NEXT_PUBLIC_KAKAO_MAP_KEY</code>를 확인해주세요.
      </div>
    );
  }
  return <div ref={containerRef} className={className} />;
}
