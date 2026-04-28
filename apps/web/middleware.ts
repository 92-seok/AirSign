import { NextResponse, type NextRequest } from "next/server";

/**
 * 레거시 라우트 → 통합 대시보드 (`/equip` + 쿼리)로 redirect.
 * 통합 대시보드 도입 전 직접 진입했던 외부 링크/북마크 호환성을 위해 유지.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/equip", req.url));
  }

  if (pathname === "/scenario") {
    // 시나리오 작업도 장비 관리 탭으로 통합
    return NextResponse.redirect(new URL("/equip", req.url));
  }

  if (pathname === "/equip/new") {
    return NextResponse.redirect(new URL("/equip?panel=new", req.url));
  }

  const m = pathname.match(/^\/equip\/(\d+)\/(bv|status|edit)$/);
  if (m) {
    const code = m[1];
    const panel = m[2];
    return NextResponse.redirect(
      new URL(`/equip?code=${code}&panel=${panel}`, req.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/scenario",
    "/equip/new",
    "/equip/:code/bv",
    "/equip/:code/status",
    "/equip/:code/edit",
  ],
};
