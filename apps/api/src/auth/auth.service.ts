import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

import { JhUser } from '../user/jh-user.entity';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  role: string;
  rootId: string;
  root: string;
}

export interface LoginResponseUser {
  id: string;
  name: string;
  role: string;
  rootId: string;
  root: string;
}

export interface LoginResponse {
  access_token: string;
  user: LoginResponseUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.validateUser(dto.id, dto.password);
    if (!user) {
      throw new UnauthorizedException(
        '아이디 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    const payload: JwtPayload = {
      sub: user.jhId ?? '',
      role: user.jhDegree ?? '',
      rootId: user.jhRootID ?? '',
      root: user.jhRoot ?? '',
    };
    const accessToken = await this.jwt.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.jhId ?? '',
        name: user.jhName ?? '',
        role: user.jhDegree ?? '',
        rootId: user.jhRootID ?? '',
        root: user.jhRoot ?? '',
      },
    };
  }

  /**
   * 비밀번호 검증 (점진 bcrypt 마이그레이션)
   *   - 저장값이 $2x$ 로 시작 → bcrypt
   *   - 그 외 → 레거시 md5(32자 hex). 매치되면 즉시 bcrypt 해시로 업그레이드.
   *
   * 레거시 코드의 백도어(`if ($pw = 'test')`)는 의도적으로 이식하지 않음.
   */
  private async validateUser(
    loginId: string,
    plain: string,
  ): Promise<JhUser | null> {
    if (!loginId) return null;
    const user = await this.userService.findByLoginId(loginId);
    if (!user || !user.jhId || !user.jhPw) return null;

    const stored = user.jhPw;
    const isBcrypt = stored.startsWith('$2');

    if (isBcrypt) {
      const ok = await bcrypt.compare(plain, stored);
      return ok ? user : null;
    }

    const md5 = createHash('md5').update(plain).digest('hex');
    if (md5.toLowerCase() !== stored.toLowerCase()) return null;

    const upgraded = await bcrypt.hash(plain, 10);
    await this.userService.updatePasswordByJhId(user.jhId, upgraded);
    return user;
  }
}
