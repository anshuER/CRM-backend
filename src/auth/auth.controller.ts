import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ZodValidationPipes } from './pipes/zod-validation.pipe';
import * as authSchemas from './schema/auth.schemas';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentAuthUser } from './types/auth.types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authServive: AuthService) {}

  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP for login' })
  @ApiBody({
    description: 'Email address',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email',
  })
  requestOtp(
    @Body(new ZodValidationPipes(authSchemas.requestOtpSchema))
    dto: authSchemas.RequestOtpDto,
  ) {
    return this.authServive.requestOtp(dto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and get tokens' })
  @ApiBody({
    description: 'Email and OTP',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        otp: { type: 'string', example: '123456' },
      },
      required: ['email', 'otp'],
    },
  })
  @ApiHeader({
    name: 'user-agent',
    description: 'User agent string',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'OTP verified, tokens returned',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid OTP',
  })
  verifyOtp(
    @Body(new ZodValidationPipes(authSchemas.verifyOtpSchema))
    dto: authSchemas.VerifyOtpDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ip: string,
  ) {
    return this.authServive.verifyOtp(dto, { userAgent, ip });
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    description: 'Refresh token',
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string' },
      },
      required: ['refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'New access token returned',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  refreshToken(
    @Body(new ZodValidationPipes(authSchemas.refreshTokenSchema))
    dto: authSchemas.RefreshTokenDto,
  ) {
    return this.authServive.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  logout(@CurrentUser() user: CurrentAuthUser) {
    return this.authServive.logout(user.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile returned',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  me(@CurrentUser() user: CurrentAuthUser) {
    return this.authServive.me(user.userId);
  }
}
