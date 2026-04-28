import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JhEquip } from './jh-equip.entity';

export type EquipStatus = 'fine' | 'bad' | 'unknown';

export interface EquipDashboardItem {
  code: number;
  name: string;
  cate: string;
  rootId: string;
  displayType: string;
  ip: string;
  port: string;
  lat: number | null;
  lng: number | null;
  addr: string;
  onOff: string;
  lastDate: string;
  status: EquipStatus;
}

@Injectable()
export class EquipService {
  private readonly superRootId: string;

  constructor(
    @InjectRepository(JhEquip)
    private readonly equipRepo: Repository<JhEquip>,
    config: ConfigService,
  ) {
    this.superRootId = config.get<string>('SUPER_ROOT_ID') ?? '';
  }

  async findDashboard(rootId: string): Promise<EquipDashboardItem[]> {
    const where =
      this.superRootId && rootId === this.superRootId
        ? {}
        : { jhRootId: rootId };
    const equips = await this.equipRepo.find({
      where,
      order: { jhECode: 'ASC' },
    });

    const twoHoursAgo = formatLocal(new Date(Date.now() - 2 * 60 * 60 * 1000));
    return equips.map((e) => toDashboardItem(e, twoHoursAgo));
  }
}

function toDashboardItem(e: JhEquip, twoHoursAgo: string): EquipDashboardItem {
  return {
    code: e.jhECode,
    name: e.jhName ?? '',
    cate: e.jhCate ?? '',
    rootId: e.jhRootId ?? '',
    displayType: e.jhDisplayType ?? '',
    ip: e.jhIP ?? '',
    port: e.jhPort ?? '',
    lat: parseCoord(e.jhLat),
    lng: parseCoord(e.jhLong),
    addr: e.jhAddr ?? '',
    onOff: e.jhOnOff ?? '',
    lastDate: e.jhLastDate ?? '',
    status: computeStatus(e.jhLastDate, twoHoursAgo),
  };
}

function parseCoord(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * 레거시 PHP 로직:
 *   $timenow = date("Y-m-d H:i:s", strtotime("-2 hours"));
 *   if ($str_now < $str_target) → 정상
 *
 * lastDate가 (현재 - 2시간) 보다 더 최근이면 'fine', 아니면 'bad'.
 * 두 값 모두 'YYYY-MM-DD HH:MM:SS' 동일 형식이라 사전식 비교 가능.
 */
function computeStatus(
  lastDate: string | null,
  twoHoursAgo: string,
): EquipStatus {
  if (!lastDate || lastDate.length < 19) return 'unknown';
  return lastDate > twoHoursAgo ? 'fine' : 'bad';
}

function formatLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
