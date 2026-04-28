import type { NextConfig } from "next";

/**
 * dev/prod 모두 same-origin /api 호출을 NestJS(:3001)로 프록시.
 * 이로써 모바일이 PC 와이파이 IP로 접근해도 fetch가 자기 호스트로 가게 되어
 * CORS / IP 미스매치 문제가 발생하지 않음.
 *
 * 운영 시에는 Apache(XAMPP) mod_proxy가 같은 역할을 하므로 rewrites는 dev 전용.
 */
const API_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_TARGET}/api/:path*`,
      },
      // 레거시 LED 전광판 미리보기 자산 (NestJS가 _legacy_php/image, _legacy_php/MC 정적 서빙)
      {
        source: "/assets/:path*",
        destination: `${API_TARGET}/assets/:path*`,
      },
    ];
  },
};

export default nextConfig;
