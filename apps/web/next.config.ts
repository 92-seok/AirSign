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
    ];
  },
};

export default nextConfig;
