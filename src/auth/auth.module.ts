// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailServices } from './email.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    ConfigModule, // ✅ this makes ConfigService available here
    JwtModule.register({}), // or registerAsync later
  ],
  providers: [AuthService, PrismaService, EmailServices],
  controllers: [AuthController],
})
export class AuthModule {}
