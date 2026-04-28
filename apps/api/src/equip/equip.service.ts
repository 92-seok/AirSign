import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { DeviceService, type DevicePushResult } from '../device/device.service';
import { CreateEquipDto } from './dto/create-equip.dto';
import { UpdateBVDto } from './dto/update-bv.dto';
import { UpdateEquipDto } from './dto/update-equip.dto';
import { JhCate } from './jh-cate.entity';
import { JhDisplay } from './jh-display.entity';
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

export interface EquipListItem extends EquipDashboardItem {
  subIp: string;
  bright: string;
  volume: string;
  weather: number | null;
  air: number | null;
  firmware: string;
}

export interface EquipDetailItem extends EquipListItem {
  content: string;
  image: string;
  c2Mac: string;
  c10Id: string;
}

export interface CategoryOption {
  code: number;
  name: string;
  order: number | null;
}

export interface DisplayOption {
  code: string;
  name: string;
  sizeX: string | null;
  sizeY: string | null;
}

export interface EquipStatusItem {
  date: string;
  ldate: string | null;
  mac: string | null;
  ip: string | null;
  rev: string | null;
  c10: string | null;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface EquipStatusHistory {
  total: number;
  since: string;
  until: string;
  daily: DailyCount[];
  items: EquipStatusItem[];
}

interface DailyRow {
  day: string;
  cnt: string | number;
}
interface StatusRow {
  JHDate: string | null;
  JHLDate: string | null;
  JHMac: string | null;
  JHIP: string | null;
  JHRev: string | null;
  JHC10: string | null;
}

@Injectable()
export class EquipService {
  private readonly superRootId: string;

  constructor(
    @InjectRepository(JhEquip)
    private readonly equipRepo: Repository<JhEquip>,
    @InjectRepository(JhCate)
    private readonly cateRepo: Repository<JhCate>,
    @InjectRepository(JhDisplay)
    private readonly displayRepo: Repository<JhDisplay>,
    @InjectDataSource()
    private readonly ds: DataSource,
    private readonly device: DeviceService,
    config: ConfigService,
  ) {
    this.superRootId = config.get<string>('SUPER_ROOT_ID') ?? '';
  }

  /** 현재 DB의 brightness/volume을 단말로 즉시 송출 */
  async sendConfigNow(code: number, rootId: string): Promise<DevicePushResult> {
    const e = await this.equipRepo.findOne({ where: { jhECode: code } });
    if (!e) throw new NotFoundException(`장비 #${code} 없음`);
    this.assertCanAccess(e, rootId);
    if (!e.jhIP || !e.jhPort) {
      return {
        ok: false,
        status: 0,
        body: '장비 IP/Port가 설정되지 않음',
        durationMs: 0,
      };
    }
    return this.device.pushConfig(code, e.jhIP, e.jhPort, {
      brightness: e.jhBright ?? '',
      volume: e.jhVolume ?? '',
    });
  }

  /** 최근 1개월 jhequipstatus 이력 — 일별 집계 + 최신 200건 */
  async getStatusHistory(
    code: number,
    rootId: string,
  ): Promise<EquipStatusHistory> {
    const e = await this.equipRepo.findOne({ where: { jhECode: code } });
    if (!e) throw new NotFoundException(`장비 #${code} 없음`);
    this.assertCanAccess(e, rootId);

    const now = new Date();
    const since = formatLocal(new Date(now.getTime() - 30 * 86400 * 1000));
    const until = formatLocal(now);

    const dailyRows = await this.ds.query<DailyRow[]>(
      `SELECT LEFT(JHDate, 10) AS day, COUNT(*) AS cnt
         FROM jhequipstatus
         WHERE JHECode = ? AND JHDate >= ?
         GROUP BY day
         ORDER BY day ASC`,
      [code, since],
    );
    const itemRows = await this.ds.query<StatusRow[]>(
      `SELECT JHDate, JHLDate, JHMac, JHIP, JHRev, JHC10
         FROM jhequipstatus
         WHERE JHECode = ? AND JHDate >= ?
         ORDER BY JHDate DESC
         LIMIT 200`,
      [code, since],
    );

    const daily: DailyCount[] = dailyRows.map((r) => ({
      date: r.day,
      count: Number(r.cnt) || 0,
    }));
    const total = daily.reduce((a, r) => a + r.count, 0);
    const items: EquipStatusItem[] = itemRows.map((r) => ({
      date: r.JHDate ?? '',
      ldate: r.JHLDate,
      mac: r.JHMac,
      ip: r.JHIP,
      rev: r.JHRev,
      c10: r.JHC10,
    }));

    return { total, since, until, daily, items };
  }

  async listCategories(): Promise<CategoryOption[]> {
    const rows = await this.cateRepo.find({ order: { jhOrder: 'ASC' } });
    return rows.map((r) => ({
      code: r.jhCCode,
      name: r.jhName ?? '',
      order: r.jhOrder,
    }));
  }

  async listDisplayTypes(): Promise<DisplayOption[]> {
    const rows = await this.displayRepo.find({ order: { jhDisCode: 'ASC' } });
    return rows.map((r) => ({
      code: r.jhDisCode,
      name: r.jhName ?? '',
      sizeX: r.jhSizeX,
      sizeY: r.jhSizeY,
    }));
  }

  async findDashboard(rootId: string): Promise<EquipDashboardItem[]> {
    const where = this.scopeWhere(rootId);
    const equips = await this.equipRepo.find({
      where,
      order: { jhECode: 'ASC' },
    });
    const twoHoursAgo = formatLocal(new Date(Date.now() - 2 * 60 * 60 * 1000));
    return equips.map((e) => toDashboardItem(e, twoHoursAgo));
  }

  async findAll(rootId: string): Promise<EquipListItem[]> {
    const where = this.scopeWhere(rootId);
    const equips = await this.equipRepo.find({
      where,
      order: { jhECode: 'ASC' },
    });
    const twoHoursAgo = formatLocal(new Date(Date.now() - 2 * 60 * 60 * 1000));
    return equips.map((e) => toListItem(e, twoHoursAgo));
  }

  async findOne(code: number, rootId: string): Promise<EquipDetailItem> {
    const e = await this.equipRepo.findOne({ where: { jhECode: code } });
    if (!e) throw new NotFoundException(`장비 #${code} 없음`);
    this.assertCanAccess(e, rootId);
    const twoHoursAgo = formatLocal(new Date(Date.now() - 2 * 60 * 60 * 1000));
    return toDetailItem(e, twoHoursAgo);
  }

  async create(dto: CreateEquipDto, rootId: string): Promise<EquipDetailItem> {
    const entity = this.equipRepo.create({
      jhName: dto.name,
      jhCate: dto.cate ?? null,
      jhIP: dto.ip ?? null,
      jhPort: dto.port ?? null,
      jhSubIP: dto.subIp ?? null,
      jhAddr: dto.addr ?? null,
      jhLat: dto.lat ?? null,
      jhLong: dto.lng ?? null,
      jhDisplayType: dto.displayType ?? null,
      jhWeather: dto.weather ?? null,
      jhAir: dto.air ?? null,
      jhBright: dto.bright ?? null,
      jhVolume: dto.volume ?? null,
      jhFirmware: dto.firmware ?? null,
      jhOnOff: dto.onOff ?? null,
      jhRootId: rootId,
    });
    const saved = await this.equipRepo.save(entity);
    const twoHoursAgo = formatLocal(new Date(Date.now() - 2 * 60 * 60 * 1000));
    return toDetailItem(saved, twoHoursAgo);
  }

  async update(
    code: number,
    dto: UpdateEquipDto,
    rootId: string,
  ): Promise<EquipDetailItem> {
    const e = await this.equipRepo.findOne({ where: { jhECode: code } });
    if (!e) throw new NotFoundException(`장비 #${code} 없음`);
    this.assertCanAccess(e, rootId);

    if (dto.name !== undefined) e.jhName = dto.name;
    if (dto.cate !== undefined) e.jhCate = dto.cate;
    if (dto.ip !== undefined) e.jhIP = dto.ip;
    if (dto.port !== undefined) e.jhPort = dto.port;
    if (dto.subIp !== undefined) e.jhSubIP = dto.subIp;
    if (dto.addr !== undefined) e.jhAddr = dto.addr;
    if (dto.lat !== undefined) e.jhLat = dto.lat;
    if (dto.lng !== undefined) e.jhLong = dto.lng;
    if (dto.displayType !== undefined) e.jhDisplayType = dto.displayType;
    if (dto.weather !== undefined) e.jhWeather = dto.weather;
    if (dto.air !== undefined) e.jhAir = dto.air;
    if (dto.bright !== undefined) e.jhBright = dto.bright;
    if (dto.volume !== undefined) e.jhVolume = dto.volume;
    if (dto.firmware !== undefined) e.jhFirmware = dto.firmware;
    if (dto.onOff !== undefined) e.jhOnOff = dto.onOff;

    const saved = await this.equipRepo.save(e);
    const twoHoursAgo = formatLocal(new Date(Date.now() - 2 * 60 * 60 * 1000));
    return toDetailItem(saved, twoHoursAgo);
  }

  async updateBV(
    code: number,
    dto: UpdateBVDto,
    rootId: string,
  ): Promise<EquipDetailItem> {
    const e = await this.equipRepo.findOne({ where: { jhECode: code } });
    if (!e) throw new NotFoundException(`장비 #${code} 없음`);
    this.assertCanAccess(e, rootId);

    e.jhBright = dto.bright.join('|');
    e.jhVolume = dto.volume.join('|');

    const saved = await this.equipRepo.save(e);
    const twoHoursAgo = formatLocal(new Date(Date.now() - 2 * 60 * 60 * 1000));
    return toDetailItem(saved, twoHoursAgo);
  }

  async remove(code: number, rootId: string): Promise<void> {
    const e = await this.equipRepo.findOne({ where: { jhECode: code } });
    if (!e) throw new NotFoundException(`장비 #${code} 없음`);
    this.assertCanAccess(e, rootId);
    await this.equipRepo.delete({ jhECode: code });
  }

  private scopeWhere(rootId: string) {
    return this.superRootId && rootId === this.superRootId
      ? {}
      : { jhRootId: rootId };
  }

  private assertCanAccess(e: JhEquip, rootId: string): void {
    if (this.superRootId && rootId === this.superRootId) return;
    if (e.jhRootId !== rootId) {
      throw new ForbiddenException('해당 장비에 접근 권한이 없습니다.');
    }
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

function toListItem(e: JhEquip, twoHoursAgo: string): EquipListItem {
  return {
    ...toDashboardItem(e, twoHoursAgo),
    subIp: e.jhSubIP ?? '',
    bright: e.jhBright ?? '',
    volume: e.jhVolume ?? '',
    weather: e.jhWeather ?? null,
    air: e.jhAir ?? null,
    firmware: e.jhFirmware ?? '',
  };
}

function toDetailItem(e: JhEquip, twoHoursAgo: string): EquipDetailItem {
  return {
    ...toListItem(e, twoHoursAgo),
    content: e.jhContent ?? '',
    image: e.jhImage ?? '',
    c2Mac: e.c2Mac ?? '',
    c10Id: e.c10Id ?? '',
  };
}

function parseCoord(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

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
