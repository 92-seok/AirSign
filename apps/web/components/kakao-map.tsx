"use client";

import { useEffect, useMemo, useRef } from "react";

import type { EquipDashboardItem } from "@/lib/equip-api";
import {
  getKakaoKey,
  loadKakaoSdk,
  type KakaoMapInstance,
  type KakaoOverlay,
} from "@/lib/kakao-sdk";

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
  const mapRef = useRef<KakaoMapInstance | null>(null);
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

  // 1) Map 1회 초기화
  useEffect(() => {
    if (!getKakaoKey()) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const api = window.kakao?.maps;
        if (!api) return;
        const center = new api.LatLng(36.5, 127.8);
        mapRef.current = new api.Map(containerRef.current, {
          center,
          level: 12,
        });
        mapRef.current.setMapTypeId(api.MapTypeId.HYBRID);
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

  // 2) 마커 갱신
  useEffect(() => {
    if (!getKakaoKey()) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const api = window.kakao?.maps;
        if (!api) return;
        const map = mapRef.current;

        overlaysRef.current.forEach((o) => o.setMap(null));
        overlaysRef.current = [];

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

        if (!bounds.isEmpty() && validPoints.length > 0) {
          map.setBounds(bounds);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [validPoints, selectedCode]);

  // 3) selectedCode 변경 시 해당 장비 위치로 지도 중심 이동 + 줌 인
  useEffect(() => {
    if (selectedCode === null) return;
    if (!getKakaoKey()) return;
    let cancelled = false;
    loadKakaoSdk()
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const api = window.kakao?.maps;
        if (!api) return;
        const target = validPoints.find((e) => e.code === selectedCode);
        if (!target) return;
        const ll = new api.LatLng(target.lat, target.lng);
        mapRef.current.setLevel(4);
        mapRef.current.setCenter(ll);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selectedCode, validPoints]);

  if (!getKakaoKey()) {
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
