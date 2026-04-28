import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { JhEquip } from '../equip/jh-equip.entity';

export type LogResult = 'ok' | 'fail' | 'unknown';

export interface LogItem {
  date: string;
  equipCode: number | null;
  equipName: string | null;
  type: string;
  result: LogResult;
  rawLog: string | null;
  contentPreview: string;
  contentLength: number;
}

export interface LogListResponse {
  items: LogItem[];
  total: number;
  page: number;
  limit: number;
}

interface LogRow {
  JHECode: number | null;
  JHDate: string | null;
  JHType: string | null;
  JHContent: string | null;
  JHLog: string | null;
  JHName: string | null;
}

interface CountRow {
  cnt: string | number;
}

@Injectable()
export class LogService {
  private readonly superRootId: string;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectRepository(JhEquip)
    private readonly equipRepo: Repository<JhEquip>,
    config: ConfigService,
  ) {
    this.superRootId = config.get<string>('SUPER_ROOT_ID') ?? '';
  }

  async list(
    rootId: string,
    options: { equipCode?: number; type?: string; page: number; limit: number },
  ): Promise<LogListResponse> {
    const isSuper = !!this.superRootId && rootId === this.superRootId;
    const limit = Math.max(1, Math.min(200, options.limit));
    const page = Math.max(1, options.page);
    const offset = (page - 1) * limit;

    let equipFilter = '';
    const params: (string | number)[] = [];

    if (options.equipCode !== undefined) {
      const equip = await this.equipRepo.findOne({
        where: { jhECode: options.equipCode },
      });
      if (!equip)
        throw new NotFoundException(`장비 #${options.equipCode} 없음`);
      if (!isSuper && equip.jhRootId !== rootId) {
        throw new ForbiddenException('해당 장비에 접근 권한이 없습니다.');
      }
      equipFilter = ' AND l.JHECode = ? ';
      params.push(options.equipCode);
    } else if (!isSuper) {
      // 슈퍼 아니면 사용자 RootID의 장비 ID만
      const equips = await this.equipRepo.find({
        where: { jhRootId: rootId },
        select: { jhECode: true },
      });
      const codes = equips.map((e) => e.jhECode);
      if (codes.length === 0) {
        return { items: [], total: 0, page, limit };
      }
      equipFilter = ` AND l.JHECode IN (${codes.map(() => '?').join(',')}) `;
      params.push(...codes);
    }

    let typeFilter = '';
    if (options.type) {
      typeFilter = ' AND l.JHType = ? ';
      params.push(options.type);
    }

    const baseWhere = `WHERE 1=1 ${equipFilter} ${typeFilter}`;

    const totalRows = await this.ds.query<CountRow[]>(
      `SELECT COUNT(*) AS cnt FROM jhlog l ${baseWhere}`,
      params,
    );
    const total = Number(totalRows[0]?.cnt ?? 0);

    const rows = await this.ds.query<LogRow[]>(
      `SELECT l.JHECode, l.JHDate, l.JHType, l.JHContent, l.JHLog, e.JHName
         FROM jhlog l
         LEFT JOIN jhequip e ON e.JHECode = l.JHECode
         ${baseWhere}
         ORDER BY l.JHDate DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const items: LogItem[] = rows.map((r) => {
      const content = r.JHContent ?? '';
      return {
        date: r.JHDate ?? '',
        equipCode: r.JHECode,
        equipName: r.JHName,
        type: r.JHType ?? '',
        result: parseResult(r.JHLog),
        rawLog: r.JHLog,
        contentPreview: content.slice(0, 240),
        contentLength: content.length,
      };
    });

    return { items, total, page, limit };
  }
}

/**
 * 레거시 PHP 로직: JHLog 응답에서 영문/숫자/특수문자 제거 후 'result' 단어 제거 → 'ok' 일치 시 성공.
 * 단순화: 'ok' 포함 → ok, 'fail'/'error' → fail, 그 외 → unknown
 */
function parseResult(raw: string | null): LogResult {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (lower.includes('ok')) return 'ok';
  if (lower.includes('fail') || lower.includes('error')) return 'fail';
  return 'unknown';
}
