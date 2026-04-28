# AirSign — 미세먼지 전광판 통합 관리 시스템

레거시 PHP 시스템을 **Next.js + NestJS** 모노레포로 리뉴얼하는 프로젝트입니다.
사용자(`isseo8010@gmail.com`)는 시니어 풀스택 개발자이며, 응답은 모두 **한국어**로 진행합니다.

> 작업 환경: 회사(Windows, `C:\xampp\htdocs`) ↔ 집(맥북). 양쪽에서 이어서 작업합니다.
> GitHub: https://github.com/92-seok/AirSign (public)

---

## 아키텍처

```
htdocs/                       ← npm workspaces 모노레포 루트
├── apps/
│   ├── api/                  NestJS 11 + TypeORM + MariaDB
│   └── web/                  Next.js 16 (App Router) + React 19 + Tailwind v4
├── _legacy_php/              레거시 PHP (gitignore, 별도 동기화 필요)
└── CLAUDE.md                 ← 이 파일 (양쪽 환경 자동 공유)
```

- **DB**: 외부 MariaDB `210.206.220.202:3307/weathersi_air` (양쪽 모두 직접 접속)
  - 절대 `synchronize: true` 금지 — 레거시 스키마 보호
  - 회사 IP 외에서 접근 안 되면 VPN/SSH 터널 필요할 수 있음
- **포트**: NestJS `:3001`, Next.js `:3000`. 운영은 PM2 + Apache mod_proxy
- **자산 서빙**: NestJS가 `_legacy_php/image` → `/assets/image`, `_legacy_php/MC` → `/assets/MC` 정적 서빙. Next는 `/assets/*` rewrites로 same-origin 프록시
- **인증**: JWT + bcrypt (레거시 md5 → 첫 로그인 시 bcrypt로 자동 마이그레이션)

---

## 진행 상태 (마일스톤)

| | 단계 | 상태 |
|---|---|---|
| M0 | 인프라 셋업 (모노레포 + GitHub) | ✅ 완료 |
| M1 | 인증/사용자 관리 | ✅ 완료 |
| M2 | 메인 대시보드 / 환경 표출 | ✅ 완료 |
| M3 | 장비 관리 (CRUD + 상태/BV) | ✅ 완료 |
| M4 | 시나리오 송출 (그룹송출/이력/표출 스트립) | 🟡 진행 중 |
| M5 | 장비 통신 (HTTP 푸시/풀) | 🟡 진행 중 |

### M4·M5 남은 작업

- **ST_001~ST_010 타입별 시나리오 빌더 상세 폼** (현재는 viewData raw 입력만 가능)
  - ST_001 미세먼지: 등급 선택 + 캐릭터 선택
  - ST_002 기상: 측정소 선택 + 자동 fetch
  - ST_006 대기: pm25/pm10/no2/co/o3/so2 다중 선택
  - ST_005 텍스트: 텍스트 + 색상 피커
  - ST_009 실종자: 사진 업로드 + 정보 폼
  - ST_010 음원: 전화번호
  - ST_004/007 이미지, ST_003/008 동영상: 업로드 셋업
- **`getScen()` PHP → TypeScript 포팅** (`_legacy_php/scen/scenarioFuc.php`)
  - JHSContent JSON 합성 — byte-level 호환 필요
- **단말 호환성 검증**: PHP 출력 vs NestJS 출력 byte 비교
- **이미지/비디오 업로드 엔드포인트** (`UPLOAD_DIR_*` 환경변수)

---

## 호환성 원칙 (DEPRECATED 금지)

레거시 PHP 시스템과 라즈베리파이 단말이 동시 운영되므로 **데이터 호환은 절대 깨면 안 됩니다**.

- **시나리오 코드 형식**: `ST_xxx_yymmddhhmmss` (예: `ST_001_201021031110`)
- **JHSContent**: 단말로 송출되는 JSON. 형태는 `"KEY": {...},` partial — 합칠 때 `{...}`로 감싸 파싱
- **24시간 BV 값**: `"|"` 구분 24개 정수 (밝기/볼륨)
- **색상 코드**: `'#fffXXXXXX'` (앞 3자리 alpha 무시 → `substr(4, 6)`)
- **jhparam 합성**: `JHName LIKE '%{ScenCode}%'` 조회 → `JHType` 별 동적 합성 (LED 전광판 미리보기 핵심)
  - 자세한 내용은 `apps/web/components/led-preview.tsx` 주석 참고

---

## 개발 규칙

### 패키지 매니저
- **npm 만 사용**. pnpm/yarn 금지
- 모노레포 워크스페이스: `npm install` 한 번으로 양쪽 설치

### Frontend (apps/web)
- **shadcn base-nova 주의**: `@base-ui/react` 기반이라 Radix 패턴과 다름
  - `asChild` 미지원 → `buttonVariants({size:"lg"})` className 패턴 사용
- **React 19 hooks 룰**:
  - `set-state-in-effect`: `useEffect` 안에서 setState는 `setTimeout(() => setState(), 0)` 패턴
  - `refs-in-render`: ref 할당은 `useEffect` 안에서
  - 외부 상태 구독은 `useSyncExternalStore`
- **Tailwind v4**: `@import "tailwindcss"` + `@theme inline`
- **폰트**: Pretendard Variable (jsdelivr CDN)
- **모바일 API URL**: 상대경로 `/api` + Next rewrites (절대 URL 금지)

### Backend (apps/api)
- **TypeORM 0.3** + MariaDB. 모든 엔티티는 `@Entity('jh*')` 레거시 테이블명 매핑
- **DTO 검증**: `class-validator` (`ValidationPipe whitelist: true`)
- **JWT**: `JwtAuthGuard` + `req.user.rootId`로 권한 분리. `SUPER_ROOT_ID`는 전체 조회 가능
- **장비 통신**: `DeviceService.pushScenario/pushParams/pushConfig` + `jhlog` 자동 INSERT

### 코드 작성
- DRY 원칙 / 가독성 우선
- 주석은 **WHY**만. WHAT은 식별자가 설명함
- 사용자가 직접 코드 작성하므로, 응답은 **코드 블록**으로 명시 (들여쓰기 2 spaces in markdown)

---

## 자주 쓰는 명령

```bash
# 처음 셋업 (집 맥북에서 clone 후)
npm install                           # 모노레포 워크스페이스 한 번에

# 개발 서버 (각각 다른 터미널)
npm run start:dev -w apps/api         # NestJS :3001
npm run dev -w apps/web               # Next.js :3000

# 빌드 검증
cd apps/api && npx tsc --noEmit       # 백엔드 타입 체크
cd apps/web && npx next build         # 프론트 빌드 + 린트
```

---

## 환경 변수 (`.env`/`.env.local`)

`.env`는 git 추적 X. **사용자가 USB/클라우드로 직접 옮겨서 사용**. `.env.example` 참고.

핵심 키:
- API 쪽: `DB_*`, `JWT_SECRET`, `SUPER_ROOT_ID`, `LEGACY_ASSET_ROOT` (`_legacy_php` 절대경로)
- Web 쪽: `NEXT_PUBLIC_KAKAO_MAP_KEY`, `NEXT_PUBLIC_DAUM_POSTCODE_KEY`

`LEGACY_ASSET_ROOT` 미설정 시 모노레포 루트 기준 `../../_legacy_php` 로 fallback.

---

## 레거시 자산 (`_legacy_php`)

`.gitignore` 처리됨. **별도 동기화 필요**.

회사 윈도우(`C:\xampp\htdocs\_legacy_php`) → USB/클라우드 → 맥북 임의 위치(예: `~/projects/airsign-assets/_legacy_php`).
맥북 `.env`의 `LEGACY_ASSET_ROOT`에 절대경로 지정.

자산이 없어도 LED 전광판 이미지만 깨지고 다른 기능은 동작.

---

## 주요 디렉토리 맵

```
apps/api/src/
├── auth/              JWT, bcrypt 마이그레이션
├── user/              사용자 CRUD
├── equip/             장비 CRUD + BV 슬라이더 + send-config
├── scenario/          시나리오 + 그룹송출 + jhparam 합성 + 단말 송출
│   ├── jh-param.entity.ts          ← LED 전광판 동적 데이터
│   └── scenario.service.ts         ← listActiveAll, buildScenarioPayload
├── device/            HTTP 푸시 + jhlog INSERT
├── log/               이력 페이지/필터
├── environment/       KHAI/PM/온습도 (대기/기상 측정소)
└── areas/             측정소 옵션

apps/web/
├── app/
│   ├── equip/page.tsx              ← 메인 통합 대시보드 (지도 + 표출 스트립 + 테이블)
│   ├── logs/page.tsx               ← 이력 페이지
│   └── login/page.tsx
├── components/
│   ├── led-preview.tsx             ← LED 전광판 미리보기 (dt_001/dt_003 포팅)
│   ├── active-scenario-strip.tsx   ← 표출 중 시나리오 가로 스트립
│   ├── equip-sheet.tsx             ← 장비 통합 시트 (5탭)
│   ├── group-send-sheet.tsx        ← 그룹 송출 시트
│   ├── scenario-card.tsx           ← 시나리오 카드 (시트 안)
│   ├── scenario-form-sheet.tsx     ← 시나리오 등록/수정 폼
│   ├── kakao-map.tsx               ← selectedCode panTo 지원
│   └── environment-strip.tsx       ← 상단 환경 정보 6칸
└── lib/
    ├── scenario-api.ts             ← fetchActiveScenarios, groupSendScenario 등
    ├── equip-api.ts
    ├── environment-api.ts
    └── kakao-sdk.ts
```

---

## 새 세션에서 시작할 때

이 파일이 자동으로 컨텍스트에 로드됩니다. 추가로 필요하면:

1. `git log --oneline -5` 로 직전 작업 확인
2. 특정 기능을 손보려면 위 디렉토리 맵에서 해당 파일 직접 Read

진행 중인 일이 있으면 사용자에게 "M4 빌더 상세 / `getScen()` 포팅 / 호환성 검증 중 어디부터 진행할까요?" 식으로 옵션 제시 후 진행.
