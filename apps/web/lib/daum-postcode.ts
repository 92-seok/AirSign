"use client";

export interface DaumPostcodeData {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
  bname: string;
  buildingName: string;
  addressType: string;
  userSelectedType: string;
}

interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeData) => void;
  onclose?: (state: string) => void;
}

interface DaumPostcodeInstance {
  open(): void;
}

interface DaumPostcodeConstructor {
  new (options: DaumPostcodeOptions): DaumPostcodeInstance;
}

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcodeConstructor };
  }
}

const SDK_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let postcodePromise: Promise<void> | null = null;

export function loadDaumPostcode(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.daum?.Postcode) return Promise.resolve();
  if (!postcodePromise) {
    postcodePromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[data-daum-postcode="1"]`,
      );
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = SDK_URL;
        script.async = true;
        script.dataset.daumPostcode = "1";
        document.head.appendChild(script);
      }
      const handle = () => {
        if (window.daum?.Postcode) resolve();
        else reject(new Error("다음 우편번호 SDK 초기화 실패"));
      };
      if (window.daum?.Postcode) handle();
      else {
        script.addEventListener("load", handle, { once: true });
        script.addEventListener(
          "error",
          () => reject(new Error("다음 우편번호 SDK 로드 실패")),
          { once: true },
        );
      }
    });
  }
  return postcodePromise;
}

export async function openPostcode(): Promise<DaumPostcodeData | null> {
  await loadDaumPostcode();
  const Postcode = window.daum?.Postcode;
  if (!Postcode) return null;
  return new Promise<DaumPostcodeData | null>((resolve) => {
    let resolved = false;
    new Postcode({
      oncomplete: (data) => {
        resolved = true;
        resolve(data);
      },
      onclose: () => {
        if (!resolved) resolve(null);
      },
    }).open();
  });
}
