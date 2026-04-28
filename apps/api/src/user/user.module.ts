import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JhUser } from './jh-user.entity';
import { UserService } from './user.service';

@Module({
  imports: [TypeOrmModule.forFeature([JhUser])],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
