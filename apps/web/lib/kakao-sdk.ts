"use client";

export interface KakaoLatLng {
  __brand?: "LatLng";
}
export interface KakaoMapInstance {
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
  setBounds(bounds: KakaoLatLngBounds): void;
  setMapTypeId(typeId: number): void;
}
export interface KakaoLatLngBounds {
  extend(latlng: KakaoLatLng): void;
  isEmpty(): boolean;
}
export interface KakaoOverlay {
  setMap(map: KakaoMapInstance | null): void;
}
export interface KakaoMapTypeId {
  ROADMAP: number;
  SKYVIEW: number;
  HYBRID: number;
}
export interface KakaoGeocoderResult {
  x: string;
  y: string;
  address_name: string;
}
export interface KakaoGeocoder {
  addressSearch(
    addr: string,
    cb: (result: KakaoGeocoderResult[], status: string) => void,
  ): void;
}
export interface KakaoServices {
  Status: { OK: string; ZERO_RESULT: string; ERROR: string };
  Geocoder: new () => KakaoGeocoder;
}
export interface KakaoMapsApi {
  load(cb: () => void): void;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMapInstance;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: HTMLElement | string;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoOverlay;
  MapTypeId: KakaoMapTypeId;
  services: KakaoServices;
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsApi };
  }
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
const SDK_URL_BASE = "https://dapi.kakao.com/v2/maps/sdk.js";

let sdkPromise: Promise<void> | null = null;

export function getKakaoKey(): string | undefined {
  return KAKAO_KEY;
}

export function loadKakaoSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.kakao?.maps?.services) return Promise.resolve();
  if (!KAKAO_KEY) {
    return Promise.reject(
      new Error("카카오맵 API 키가 설정되지 않았습니다."),
    );
  }
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[data-kakao-sdk="1"]`,
      );
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = `${SDK_URL_BASE}?appkey=${KAKAO_KEY}&autoload=false&libraries=services`;
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
      if (existing && window.kakao?.maps?.services) onLoaded();
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

export interface GeocodeResult {
  lat: number;
  lng: number;
  address: string;
}

export async function geocodeAddress(
  addr: string,
): Promise<GeocodeResult | null> {
  await loadKakaoSdk();
  const services = window.kakao?.maps?.services;
  if (!services) return null;
  return new Promise<GeocodeResult | null>((resolve) => {
    const geocoder = new services.Geocoder();
    geocoder.addressSearch(addr, (result, status) => {
      if (status === services.Status.OK && result.length > 0) {
        resolve({
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x),
          address: result[0].address_name,
        });
      } else {
        resolve(null);
      }
    });
  });
}
