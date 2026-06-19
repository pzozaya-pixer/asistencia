import { Global, Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Global()
@Module({
  imports: [CryptoModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
