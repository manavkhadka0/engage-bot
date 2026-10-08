import { Resend } from 'resend';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export class MailService {
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(apiKey: string | undefined, from: string) {
    this.from = from;
    this.resend = apiKey ? new Resend(apiKey) : null;
  }

  async send(input: SendEmailInput): Promise<void> {
    if (!this.resend) {
      console.warn(
        `[mail:dev] To: ${input.to} | ${input.subject}\n${input.text ?? input.html}`,
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  }
}
