# AirSign

> LED 전광판을 통한 미세먼지·기상 정보 표출 및 통합 관제 웹서비스.
> 현장에 설치된 다수의 디스플레이 장비를 한 화면에서 실시간으로 모니터링하고, 송출 시나리오를 원격 제어합니다.

  - **풀스택 모노레포**: Next.js (App Router) + NestJS
  - **모바일 우선** 반응형 — 외부에서도 즉시 대응 가능
  - **트렌디 디자인** — Tailwind v4 + shadcn/ui

---

## 핵심 기능

  - **실시간 장비 모니터링** — 지도 위 펄스 마커로 정상/이상/미수신 상태 직관 표시
  - **시나리오 송출** — 텍스트, 기상 정보, TTS 음성, 이미지, 영상 등 다양한 콘텐츠를 원격 송출
  - **장비 그룹 일괄 제어** — 다수 디스플레이에 동일 콘텐츠 동시 적용
  - **24시간 밝기·볼륨 스케줄** — 시간대별 자동 제어
  - **모바일 친화 UI** — 풀스크린 지도 + 바텀시트 패널, 현장에서도 즉시 대응

## 화면 구성

  - **`/`** — 인트로 (텍스트 시퀀스 애니메이션 → 자동 이동)
  - **`/login`** — 로그인 (그라디언트 브랜드 + ID/PW 폼)
  - **`/dashboard`** — 풀스크린 지도 + 사이드바(데스크톱) / 바텀시트(모바일)
    - 정상: 초록 차분한 펄스
    - 이상: 빨강 빠르게 깜빡 (긴급 알림)
    - 미수신: 회색 옅은 펄스

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | Next.js 16 (App Router), React 19, TypeScript |
| 디자인 | Tailwind CSS v4, shadcn/ui, Noto Sans KR |
| 지도 | Kakao Maps JavaScript SDK (CustomOverlay 기반 펄스 마커) |
| 백엔드 | NestJS 11, TypeORM 0.3 |
| DB | MySQL / MariaDB |
| 인증 | JWT (Bearer), bcrypt (레거시 해시 점진 업그레이드) |
| 패키지 매니저 | npm workspace |

## 디렉토리 구조

```text
.
├─ apps/
│   ├─ web/            # Next.js 프론트엔드
│   │   ├─ app/        # App Router 페이지
│   │   ├─ components/ # KakaoMap, AuthGuard, EquipDetail, EquipList ...
│   │   └─ lib/        # api, auth, equip-api, hooks
│   └─ api/            # NestJS 백엔드
│       └─ src/
│           ├─ auth/   # 로그인 / JWT
│           ├─ user/   # 사용자
│           └─ equip/  # 장비 / 대시보드 API
├─ .env.example
└─ package.json        # npm workspace 루트
```

## 설계 포인트

  - **Same-origin API 프록시** — Next.js `rewrites`로 `/api/*` → API 서버 프록시 → 모바일에서 LAN IP 접근 시 CORS 우회
  - **카카오맵 CustomOverlay** — PNG 마커 대신 HTML+CSS로 상태별 펄스 애니메이션 구현
  - **점진 비밀번호 해시 마이그레이션** — 레거시 약한 해시(md5)로 저장된 사용자도, 로그인 성공 시점에 자동으로 bcrypt로 재해싱
  - **React 19 신규 hooks 룰 준수** — `useSyncExternalStore` 기반 인증 hook, `useEffect` 안의 ref 갱신 패턴
  - **shadcn/ui base-nova 스타일** — `@base-ui/react` 기반의 최신 무지향 디자인 시스템

## 시작하기

### 사전 요구

  - Node.js >= 20
  - MySQL/MariaDB

### 설치 및 실행

```bash
# 1. 의존성 설치 (모든 워크스페이스 한 번에)
npm install

# 2. 환경변수 설정
cp .env.example apps/api/.env
# apps/api/.env 의 DB_*, JWT_SECRET 등 입력
echo "NEXT_PUBLIC_KAKAO_MAP_KEY=발급받은_카카오맵_키" >> apps/web/.env.local

# 3. 개발 서버 (두 개의 터미널에서)
npm run dev:api    # http://localhost:3001/api
npm run dev:web    # http://localhost:3000  (LAN 접근 가능)

# 4. 모바일에서 같은 와이파이로 접속
# http://<PC_IP>:3000
```

### 빌드

```bash
npm run build:api
npm run build:web
```

## 보안 설계

  - 로그인 백도어 미이식
  - 약한 해시 → bcrypt 점진 마이그레이션
  - SQL 인젝션 차단 (TypeORM 파라미터 바인딩)
  - DTO 검증 (`class-validator` + `forbidNonWhitelisted`)
  - XSS 자동 이스케이프 (React)
  - JWT Bearer 토큰
  - CORS 화이트리스트

## 진행 상황

  - [x] **M0** 인프라 셋업 (Next.js + NestJS 모노레포)
  - [x] **M1** 인증/사용자 관리 (JWT, bcrypt 점진 전환)
  - [x] **M2** 메인 대시보드 (지도 + 펄스 마커 + 사이드바/바텀시트)
  - [ ] **M3** 장비 관리 (CRUD + 24시간 밝기/볼륨)
  - [ ] **M4** 시나리오 송출 (다양한 콘텐츠 빌더 + 그룹송출)
  - [ ] **M5** 외부 장비 HTTP 통신 (푸시/풀 API)

## 라이선스

내부 운영 / 개인 포트폴리오용.
