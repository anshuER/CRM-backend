import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailServices {
  private readonly logger = new Logger(EmailServices.name);
  private readonly resend?: Resend;

  constructor(private readonly configService: ConfigService) {
    const apikey = this.configService.get<string>('RESEND_API_KEY');

    if (apikey) {
      this.resend = new Resend(apikey);
    }
  }

  async sendOtpEmail(email: string, otp: string) {
    if (!this.resend) {
      this.logger.warn(`Email - ${email} and otp = ${otp}`);
    }

    await this.resend?.emails?.send({
      from:
        this.configService.get<string>('MAIL_FROM') ||
        'WorkPilot <onboarding@resend.dev>',
      to: email,
      subject: 'Your WorkPilot login OTP',
      html: `
        <div style="font-family:Arial,sans-serif">
          <h2>WorkPilot Login OTP</h2>
          <p>Your OTP is:</p>
          <h1>${otp}</h1>
          <p>This OTP will expire soon. Do not share it with anyone.</p>
        </div>
      `,
    });
  }
}
