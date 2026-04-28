import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JhUser } from './jh-user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(JhUser)
    private readonly userRepo: Repository<JhUser>,
  ) {}

  findByLoginId(loginId: string): Promise<JhUser | null> {
    return this.userRepo.findOne({ where: { jhId: loginId } });
  }

  async updatePasswordByJhId(loginId: string, hash: string): Promise<void> {
    await this.userRepo.update({ jhId: loginId }, { jhPw: hash });
  }
}
