import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailServices } from './email.service';
import { RequestOtpDto, VerifyOtpDto } from './schema/auth.schemas';
import { randomBytes, randomInt } from 'crypto';
import bcrypt from 'bcrypt';
import type { StringValue } from 'ms';

@Injectable()
export class AuthService {
  [x: string]: any;
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailServices,
  ) {}

  private generateOtp() {
    return randomInt(100000, 999999).toString();
  }

  private generateSecureToken() {
    return randomBytes(64).toString('hex');
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

  async verifyOtp(
    dto: VerifyOtpDto,
    meta?: { userAgent?: string; ip?: string },
  ) {
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

    const isValid = await bcrypt.compare(dto.code, otpRecord.codeHash);

    if (!isValid) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException('Invalid Otp');
    }
    const refreshSecret = this.generateSecureToken();
    const refreshTokenHash = await bcrypt.hash(refreshSecret, 12);
    const refreshDays = 7;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: otpRecord.userId as string },
        data: {
          isEmailVerified: true,
        },
      });

      await tx.otpCode.update({
        where: { id: otpRecord.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });

      const session = await tx.session.create({
        data: {
          userId: user.id,
          refreshTokenHash,
          userAgent: meta?.userAgent,
          ipAddress: meta?.ip,
          expiresAt: new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000),
        },
      });

      return {
        user,
        session,
      };
    });

    const accessToken = await this.createAccessToken({
      userId: result.user.id,
      email: result.user.email,
      sessionId: result.session.id,
    });

    const refreshToken = await this.createRefreshToken({
      userId: result.user.id,
      email: result.user.email,
      sessionId: result.session.id,
      secret: refreshSecret,
    });

    return {
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
    };
  }

  private createAccessToken(payload: {
    userId: string;
    email: string;
    sessionId: string;
  }) {
    const expiresIn = (this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) || '15m') as StringValue;

    return this.jwtService.signAsync(
      {
        sub: payload.userId,
        email: payload.email,
        sessionId: payload.sessionId,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn,
      },
    );
  }

  private createRefreshToken(payload: {
    userId: string;
    email: string;
    sessionId: string;
    secret: string;
  }) {
    const expiresIn = (this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
    ) || '15m') as StringValue;

    return this.jwtService.signAsync(
      {
        sub: payload.userId,
        email: payload.email,
        sessionId: payload.sessionId,
        secret: payload.secret,
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn,
      },
    );
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        isEmailVerified: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { user };
  }

  async logout(sessionId: string) {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Logged out successfully',
    };
  }
}
