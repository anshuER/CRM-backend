import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailServices } from './email.service';
import { RequestOtpDto, VerifyOtpDto } from './schema/auth.schemas';
import { randomBytes, randomInt } from 'crypto';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailServices,
  ) {}

  private generateOtp() {
    return randomInt(100000, 999999).toString();
  }

  async requestOtp(dto: RequestOtpDto) {
    const email = dto.email.toLocaleLowerCase();
    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        isEmailVerified: false,
        status: 'ACTIVE',
      },
    });

    await this.prisma.otpCode.updateMany({
      where: {
        email,
        purpose: 'LOGIN',
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const otp = this.generateOtp();
    const codeHash = await bcrypt.hash(otp, 10);

    const expiresMinutes =
      Number(this.configService.get<string>('OTP_EXPIRES_MINUTES')) || 10;

    await this.prisma.otpCode.create({
      data: {
        userId: user.id,
        email,
        codeHash,
        purpose: 'LOGIN',
        status: 'PENDING',
        attempts: 0,
        expiresAt: new Date(Date.now() + expiresMinutes * 60 * 1000),
      },
    });

    await this.emailService.sendOtpEmail(email, otp);

    return {
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const email = dto.email.toLocaleLowerCase();

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        email,
        status: 'PENDING',
        purpose: 'LOGIN',
      },

      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid otp');
    }

    if (otpRecord.expiresAt < new Date()) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { status: 'EXPIRED' },
      });

      throw new BadRequestException('OTP expired');
    }

    const maxAttempts =
      Number(this.configService.get<string>('OTP_MAX_ATTEMPTS')) || 5;

    if (otpRecord.attempts >= maxAttempts) {
      throw new BadRequestException('Too many attempts');
    }

    const isValid = await bcrypt.compare(otpRecord.codeHash, dto.code);

    if (!isValid) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: {
          attempts: otpRecord.attempts + 1,
        },
      });

      throw new BadRequestException('Invalid Otp');
    }
  }
}
