import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DevicePushResult {
  ok: boolean;
  status: number;
  body: string;
  durationMs: number;
}

/**
 * 외부 LED 전광판(C10 단말) HTTP 송출 클라이언트.
 *
 * 레거시 PHP 호환:
 *   POST http://{ip}:{port}/scenario  — 시나리오 시퀀스 전체 (Sequence + ST_xxx_... JSON)
 *   POST http://{ip}:{port}/params    — 동적 변수 KV (ST_xxx_-bg, -value 등)
 *   POST http://{ip}:{port}/config    — 밝기/볼륨 (시간대별 파이프 구분 24개)
 *
 * 모든 호출 결과는 jhlog 테이블에 기록 (JHType: scen-update / param-update / config).
 *
 * ⚠️ M5 골격: 페이로드 JSON 빌더는 상위 호출자가 만들어 전달. byte-level 호환성 검증은
 * 통합 테스트 단계에서 PHP 출력과 diff 후 조정 필요.
 */
@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);
  private readonly timeoutMs: number;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    config: ConfigService,
  ) {
    this.timeoutMs = Number(
      config.get<string>('DEVICE_HTTP_TIMEOUT_MS') ?? 60000,
    );
  }

  /** POST /scenario — 시나리오 시퀀스 일괄 송출 */
  async pushScenario(
    equipCode: number,
    ip: string,
    port: string,
    payload: unknown,
  ): Promise<DevicePushResult> {
    const result = await this.post(ip, port, '/scenario', payload);
    await this.writeLog(equipCode, 'scen-update', payload, result);
    return result;
  }

  /** POST /params — 동적 KV 변수 송출 */
  async pushParams(
    equipCode: number,
    ip: string,
    port: string,
    payload: unknown,
  ): Promise<DevicePushResult> {
    const result = await this.post(ip, port, '/params', payload);
    await this.writeLog(equipCode, 'param-update', payload, result);
    return result;
  }

  /** POST /config — 밝기/볼륨 송출 */
  async pushConfig(
    equipCode: number,
    ip: string,
    port: string,
    payload: { brightness: string; volume: string },
  ): Promise<DevicePushResult> {
    const result = await this.post(ip, port, '/config', payload);
    await this.writeLog(equipCode, 'config', payload, result);
    return result;
  }

  /** 공통 HTTP POST */
  private async post(
    ip: string,
    port: string,
    path: string,
    payload: unknown,
  ): Promise<DevicePushResult> {
    const url = `http://${ip}:${port}${path}`;
    const start = Date.now();
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.text();
      const durationMs = Date.now() - start;
      this.logger.log(`→ ${url} [${res.status}] ${durationMs}ms`);
      return { ok: res.ok, status: res.status, body, durationMs };
    } catch (err) {
      const durationMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`→ ${url} FAILED ${durationMs}ms — ${msg}`);
      return { ok: false, status: 0, body: msg, durationMs };
    } finally {
      clearTimeout(t);
    }
  }

  /** jhlog INSERT — 레거시 컬럼 호환 */
  private async writeLog(
    equipCode: number,
    type: string,
    content: unknown,
    result: DevicePushResult,
  ): Promise<void> {
    const date = formatLocal(new Date());
    const contentStr =
      typeof content === 'string' ? content : JSON.stringify(content);
    const logStr = result.ok
      ? `result: ok`
      : `result: ${result.body || 'fail'}`;
    try {
      await this.ds.query(
        `INSERT INTO jhlog (JHECode, JHDate, JHType, JHContent, JHLog)
           VALUES (?, ?, ?, ?, ?)`,
        [equipCode, date, type, contentStr, logStr],
      );
    } catch (err) {
      this.logger.error(
        `jhlog INSERT failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

function formatLocal(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
