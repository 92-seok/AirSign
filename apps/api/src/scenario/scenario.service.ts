import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DeviceService, type DevicePushResult } from '../device/device.service';
import { JhDisplay } from '../equip/jh-display.entity';
import { JhEquip } from '../equip/jh-equip.entity';
import { GroupSendDto } from './dto/group-send.dto';
import { SaveScenarioDto } from './dto/save-scenario.dto';
import { JhParam } from './jh-param.entity';
import { JhScenType } from './jh-scen-type.entity';
import { JhScenario } from './jh-scenario.entity';

export type ScenarioActiveStatus =
  | 'active'
  | 'scheduled'
  | 'expired'
  | 'always';

export interface ScenarioTypeOption {
  code: string; // ST_001
  name: string; // 미세먼지
  displayCode: string | null; // DT_001
  image: string | null;
  order: number | null;
}

export interface GroupSendItemResult {
  equipCode: number;
  scenCode: string | null;
  ok: boolean;
  message?: string;
}

export interface ScenarioListItem {
  code: string;
  equipCode: string;
  typeCode: string;
  typeName: string | null;
  typeImage: string | null;
  typeDisplayCode: string | null;
  name: string;
  orderby: number | null;
  startDate: string | null;
  endDate: string | null;
  status: ScenarioActiveStatus;
  hasContent: boolean;
  /** 사용자 입력 원본 (`a|b|c` 등 ST 별 포맷) */
  viewData: string | null;
  /** ST_007(HTML 메세지) 원문 HTML */
  text: string | null;
  /** ST별로 단말로 송출되는 시각 자산 path (있으면) — 미리보기 fallback용 */
  thumbnailPath: string | null;
  /** 장비의 LED 전광판 코드 (DT_001=가로, DT_003=세로 등) */
  equipDisplayCode: string | null;
  /** 장비의 LED 전광판 픽셀 크기 (X, Y) — 레거시는 px*2 로 표시 */
  equipSizeX: number | null;
  equipSizeY: number | null;
  /** jhparam 테이블의 동적 합성 데이터 (예: dust_bg, dust_gif, dust_value 등) */
  params: Record<string, string>;
}

@Injectable()
export class ScenarioService {
  private readonly superRootId: string;

  constructor(
    @InjectRepository(JhScenario)
    private readonly scenRepo: Repository<JhScenario>,
    @InjectRepository(JhScenType)
    private readonly typeRepo: Repository<JhScenType>,
    @InjectRepository(JhEquip)
    private readonly equipRepo: Repository<JhEquip>,
    @InjectRepository(JhParam)
    private readonly paramRepo: Repository<JhParam>,
    @InjectRepository(JhDisplay)
    private readonly displayRepo: Repository<JhDisplay>,
    private readonly device: DeviceService,
    config: ConfigService,
  ) {
    this.superRootId = config.get<string>('SUPER_ROOT_ID') ?? '';
  }

  /**
   * 해당 장비의 활성 시나리오 시퀀스를 단말로 송출.
   * ⚠️ 골격: JHSContent는 raw 그대로 합성. PHP byte-level 호환 검증은 후속.
   */
  async sendForEquip(
    equipCode: number,
    rootId: string,
  ): Promise<DevicePushResult> {
    const equip = await this.equipRepo.findOne({
      where: { jhECode: equipCode },
    });
    if (!equip) throw new NotFoundException(`장비 #${equipCode} 없음`);
    if (
      !(this.superRootId && rootId === this.superRootId) &&
      equip.jhRootId !== rootId
    ) {
      throw new ForbiddenException('해당 장비에 접근 권한이 없습니다.');
    }
    if (!equip.jhIP || !equip.jhPort) {
      return {
        ok: false,
        status: 0,
        body: '장비 IP/Port 미설정',
        durationMs: 0,
      };
    }

    const all = await this.scenRepo.find({
      where: { jhECode: String(equipCode) },
    });
    const now = formatLocal(new Date());
    const active = all
      .filter(
        (s) => computeStatus(s.jhStartDate, s.jhEndDate, now) === 'active',
      )
      .sort(
        (a, b) =>
          (a.jhOrderby ?? 9999) - (b.jhOrderby ?? 9999) ||
          a.jhScenCode.localeCompare(b.jhScenCode),
      );

    const payload = buildScenarioPayload(active);
    return this.device.pushScenario(
      equipCode,
      equip.jhIP,
      equip.jhPort,
      payload,
    );
  }

  /** 그룹 송출 — 다수 장비에 동일 시나리오 등록 (즉시 송출은 옵션) */
  async groupSend(
    dto: GroupSendDto,
    rootId: string,
  ): Promise<{ results: GroupSendItemResult[] }> {
    const results: GroupSendItemResult[] = [];
    for (const code of dto.equipCodes) {
      try {
        const created = await this.createScenario(
          { ...dto.scenario, equipCode: code },
          rootId,
        );
        results.push({ equipCode: code, scenCode: created.code, ok: true });
      } catch (err) {
        results.push({
          equipCode: code,
          scenCode: null,
          ok: false,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return { results };
  }

  async listTypes(): Promise<ScenarioTypeOption[]> {
    const rows = await this.typeRepo.find();
    return rows
      .map((r) => ({
        code: r.jhSTCode,
        name: r.jhSTName ?? '',
        displayCode: r.jhDisCode,
        image: r.jhImage,
        order: r.jhOrder ? Number(r.jhOrder) : null,
      }))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }

  /**
   * 권한 있는 모든 장비의 활성 시나리오를 한 번에 반환.
   * (대시보드 상단 표출 스트립용)
   * 각 시나리오에 jhparam (LED 합성 데이터) + 장비 디스플레이 크기를 포함.
   */
  async listActiveAll(rootId: string): Promise<ScenarioListItem[]> {
    const equips = await this.equipRepo.find();
    const isSuper = !!this.superRootId && rootId === this.superRootId;
    const accessible = equips.filter((e) => isSuper || e.jhRootId === rootId);
    if (accessible.length === 0) return [];
    const equipCodes = accessible.map((e) => String(e.jhECode));

    const [rows, types, displays, params] = await Promise.all([
      this.scenRepo
        .createQueryBuilder('s')
        .where('s.jhECode IN (:...codes)', { codes: equipCodes })
        .getMany(),
      this.typeRepo.find(),
      this.displayRepo.find(),
      this.paramRepo.find(),
    ]);

    const typeMap = new Map(types.map((t) => [t.jhSTCode, t]));
    const displayMap = new Map(displays.map((d) => [d.jhDisCode, d]));
    const equipMap = new Map(
      accessible.map((e) => [String(e.jhECode), e]),
    );
    const paramsByScen = groupParamsByScen(params);
    const now = formatLocal(new Date());

    return rows
      .map((r): ScenarioListItem => {
        const type = typeMap.get(r.jhSTCode ?? '');
        const equip = equipMap.get(r.jhECode ?? '');
        const display = equip?.jhDisplayType
          ? displayMap.get(equip.jhDisplayType)
          : undefined;
        const thumb = computeThumbnail(
          r.jhSTCode ?? '',
          r.jhViewData,
          type?.jhImage ?? null,
        );
        return {
          code: r.jhScenCode,
          equipCode: r.jhECode ?? '',
          typeCode: r.jhSTCode ?? '',
          typeName: type?.jhSTName ?? null,
          typeImage: type?.jhImage ?? null,
          typeDisplayCode: type?.jhDisCode ?? null,
          name: r.jhName ?? '',
          orderby: r.jhOrderby,
          startDate: r.jhStartDate,
          endDate: r.jhEndDate,
          status: computeStatus(r.jhStartDate, r.jhEndDate, now),
          hasContent: !!r.jhSContent && r.jhSContent.length > 0,
          viewData: r.jhViewData,
          text: r.jhText,
          thumbnailPath: thumb,
          equipDisplayCode: equip?.jhDisplayType ?? null,
          equipSizeX: parseIntOrNull(display?.jhSizeX),
          equipSizeY: parseIntOrNull(display?.jhSizeY),
          params: paramsByScen.get(r.jhScenCode) ?? {},
        };
      })
      .filter((s) => s.status === 'active' || s.status === 'always')
      .sort(
        (a, b) =>
          a.equipCode.localeCompare(b.equipCode) ||
          (a.orderby ?? 9999) - (b.orderby ?? 9999) ||
          a.code.localeCompare(b.code),
      );
  }

  async listForEquip(
    equipCode: number,
    rootId: string,
  ): Promise<ScenarioListItem[]> {
    const equip = await this.equipRepo.findOne({
      where: { jhECode: equipCode },
    });
    if (!equip) throw new NotFoundException(`장비 #${equipCode} 없음`);
    if (
      !(this.superRootId && rootId === this.superRootId) &&
      equip.jhRootId !== rootId
    ) {
      throw new ForbiddenException('해당 장비에 접근 권한이 없습니다.');
    }

    const [rows, types, params] = await Promise.all([
      this.scenRepo.find({
        where: { jhECode: String(equipCode) },
      }),
      this.typeRepo.find(),
      this.paramRepo.find(),
    ]);
    const typeMap = new Map(types.map((t) => [t.jhSTCode, t]));
    const paramsByScen = groupParamsByScen(params);

    const display = equip.jhDisplayType
      ? await this.displayRepo.findOne({
          where: { jhDisCode: equip.jhDisplayType },
        })
      : null;

    const now = formatLocal(new Date());
    return rows
      .map((r): ScenarioListItem => {
        const type = typeMap.get(r.jhSTCode ?? '');
        const thumb = computeThumbnail(
          r.jhSTCode ?? '',
          r.jhViewData,
          type?.jhImage ?? null,
        );
        return {
          code: r.jhScenCode,
          equipCode: r.jhECode ?? '',
          typeCode: r.jhSTCode ?? '',
          typeName: type?.jhSTName ?? null,
          typeImage: type?.jhImage ?? null,
          typeDisplayCode: type?.jhDisCode ?? null,
          name: r.jhName ?? '',
          orderby: r.jhOrderby,
          startDate: r.jhStartDate,
          endDate: r.jhEndDate,
          status: computeStatus(r.jhStartDate, r.jhEndDate, now),
          hasContent: !!r.jhSContent && r.jhSContent.length > 0,
          viewData: r.jhViewData,
          text: r.jhText,
          thumbnailPath: thumb,
          equipDisplayCode: equip.jhDisplayType ?? null,
          equipSizeX: parseIntOrNull(display?.jhSizeX ?? null),
          equipSizeY: parseIntOrNull(display?.jhSizeY ?? null),
          params: paramsByScen.get(r.jhScenCode) ?? {},
        };
      })
      .sort(
        (a, b) =>
          (a.orderby ?? 9999) - (b.orderby ?? 9999) ||
          a.code.localeCompare(b.code),
      );
  }

  async createScenario(
    dto: SaveScenarioDto,
    rootId: string,
  ): Promise<{ code: string }> {
    await this.assertEquipAccess(dto.equipCode, rootId);
    const code = generateScenCode(dto.typeCode);
    const entity = this.scenRepo.create({
      jhScenCode: code,
      jhECode: String(dto.equipCode),
      jhSTCode: dto.typeCode,
      jhName: dto.name,
      jhOrderby: dto.orderby ?? null,
      jhStartDate: dto.startDate ?? null,
      jhEndDate: dto.endDate ?? null,
      jhViewData: dto.viewData ?? null,
      jhText: dto.text ?? null,
      // 단말 송출용 JSON(JHSContent)은 다음 단계 빌더에서 생성. 일단 null.
      jhSContent: null,
      jhUpdate: '1',
    });
    await this.scenRepo.save(entity);
    return { code };
  }

  async updateScenario(
    scenCode: string,
    dto: SaveScenarioDto,
    rootId: string,
  ): Promise<{ code: string }> {
    const s = await this.scenRepo.findOne({ where: { jhScenCode: scenCode } });
    if (!s) throw new NotFoundException(`시나리오 ${scenCode} 없음`);
    if (s.jhECode) {
      await this.assertEquipAccess(Number(s.jhECode), rootId);
    }
    s.jhName = dto.name;
    s.jhOrderby = dto.orderby ?? null;
    s.jhStartDate = dto.startDate ?? null;
    s.jhEndDate = dto.endDate ?? null;
    s.jhViewData = dto.viewData ?? null;
    s.jhText = dto.text ?? null;
    s.jhUpdate = '1';
    await this.scenRepo.save(s);
    return { code: s.jhScenCode };
  }

  async deleteScenario(scenCode: string, rootId: string): Promise<void> {
    const s = await this.scenRepo.findOne({ where: { jhScenCode: scenCode } });
    if (!s) throw new NotFoundException(`시나리오 ${scenCode} 없음`);
    if (s.jhECode) {
      await this.assertEquipAccess(Number(s.jhECode), rootId);
    }
    await this.scenRepo.delete({ jhScenCode: scenCode });
  }

  private async assertEquipAccess(
    equipCode: number,
    rootId: string,
  ): Promise<void> {
    const equip = await this.equipRepo.findOne({
      where: { jhECode: equipCode },
    });
    if (!equip) throw new NotFoundException(`장비 #${equipCode} 없음`);
    if (
      !(this.superRootId && rootId === this.superRootId) &&
      equip.jhRootId !== rootId
    ) {
      throw new ForbiddenException('해당 장비에 접근 권한이 없습니다.');
    }
  }
}

/**
 * ST 타입별 단말 송출 시각 자산 path 계산.
 * 레거시 호환: `MC/image/...` 또는 `image/...` 기준.
 *   ST_004 / ST_007 → 사용자 업로드 / HTML 캡처 PNG (`MC/image/{viewData}`)
 *   ST_009         → `viewData = "img|name|c1|c2|c3"` 의 첫 항목
 *   ST_003 / ST_008 → 동영상 (`MC/video/...`)
 *   ST_001 / 002 / 005 / 006 / 010 → null (정적/카탈로그/동적 자산)
 */
function computeThumbnail(
  typeCode: string,
  viewData: string | null,
  typeImage: string | null,
): string | null {
  if (!viewData && !typeImage) return null;

  const v = (viewData ?? '').trim();
  switch (typeCode) {
    case 'ST_004':
    case 'ST_007':
      return v ? `MC/image/${v}` : typeImage;
    case 'ST_009': {
      const first = v.split('|')[0]?.trim();
      return first ? `MC/image/${first}` : typeImage;
    }
    case 'ST_003': {
      const file = v.split('|')[0]?.trim();
      return file ? `MC/video/${file}` : typeImage;
    }
    case 'ST_008': {
      const file = v.split('|')[0]?.trim();
      return file ? `MC/video/${file}` : typeImage;
    }
    default:
      return typeImage;
  }
}

function computeStatus(
  start: string | null,
  end: string | null,
  now: string,
): ScenarioActiveStatus {
  const hasStart = !!start && start.length >= 19;
  const hasEnd = !!end && end.length >= 19;
  if (!hasStart && !hasEnd) return 'always';
  if (hasStart && start > now) return 'scheduled';
  if (hasEnd && end < now) return 'expired';
  return 'active';
}

function formatLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/**
 * 단말 송출 페이로드 합성 (placeholder).
 * 레거시 PHP는 다음 형태:
 *   {
 *     "Sequence": { "sequence": ["ST_001_xxx", "ST_002_yyy"] },
 *     "ST_001_xxx": { ... JHSContent 파싱 ... },
 *   }
 *
 * 현재 골격: JHSContent의 raw 텍스트를 합쳐서 1차 페이로드로. byte-level 호환 후속.
 */
function buildScenarioPayload(items: JhScenario[]): unknown {
  const sequence = items.map((s) => s.jhScenCode);
  const payload: Record<string, unknown> = {
    Sequence: { sequence },
  };
  for (const s of items) {
    const raw = (s.jhSContent ?? '').trim();
    if (!raw) continue;
    try {
      // JHSContent가 객체 partial 형태("KEY": {...},)면 파싱
      const parsed = JSON.parse(
        `{${raw.replace(/^[,\s]+|[,\s]+$/g, '')}}`,
      ) as Record<string, unknown>;
      Object.assign(payload, parsed);
    } catch {
      payload[s.jhScenCode] = raw;
    }
  }
  return payload;
}

/**
 * 레거시 호환: `ST_001_201021031110` 형태 (typeCode + '_' + yymmddhhmmss)
 */
/**
 * jhparam의 row들을 시나리오 코드별로 그룹화.
 * JHName 컬럼은 시나리오 코드를 포함한 식별자 (예: 'ST_001_201021031110_dust_bg').
 * 레거시 PHP는 `JHName LIKE '%{ScenCode}%'` 로 조회했으므로
 * 동일하게 substring 매칭으로 그룹화한다.
 */
function groupParamsByScen(
  rows: JhParam[],
): Map<string, Record<string, string>> {
  const result = new Map<string, Record<string, string>>();
  for (const r of rows) {
    if (!r.jhName || !r.jhType) continue;
    // JHName에서 ST_xxx_yymmddhhmmss 시나리오 코드 패턴 추출
    const match = r.jhName.match(/(ST_\d{3}_\d{12})/);
    if (!match) continue;
    const scenCode = match[1];
    let bucket = result.get(scenCode);
    if (!bucket) {
      bucket = {};
      result.set(scenCode, bucket);
    }
    bucket[r.jhType] = r.jhContent ?? '';
  }
  return result;
}

function parseIntOrNull(s: string | null | undefined): number | null {
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function generateScenCode(typeCode: string): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yy = String(d.getFullYear()).slice(2);
  const stamp =
    yy +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds());
  return `${typeCode}_${stamp}`;
}
