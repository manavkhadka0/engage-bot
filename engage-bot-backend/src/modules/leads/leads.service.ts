import { Injectable, Logger } from '@nestjs/common';
import { mailService } from '../../auth/auth';

export interface CreateLeadInput {
  name: string;
  email: string;
  brand: string;
  stores?: string;
  intent: 'demo' | 'pilot' | 'platform' | 'other';
  message: string;
}

const INTENT_LABEL: Record<CreateLeadInput['intent'], string> = {
  demo: 'Fleet demo',
  pilot: 'Pilot scoping',
  platform: 'Platform / workspace access',
  other: 'Something else',
};

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly notifyEmail =
    process.env.LEADS_EMAIL || 'manavkhadka0@gmail.com';

  async notify(input: CreateLeadInput) {
    const html = `
      <p>New demo request from the marketing site:</p>
      <ul>
        <li><strong>Name:</strong> ${input.name}</li>
        <li><strong>Email:</strong> ${input.email}</li>
        <li><strong>Brand:</strong> ${input.brand}</li>
        <li><strong>Approx. stores:</strong> ${input.stores || '—'}</li>
        <li><strong>Intent:</strong> ${INTENT_LABEL[input.intent]}</li>
      </ul>
      <p><strong>Context:</strong></p>
      <p>${input.message.replace(/\n/g, '<br/>')}</p>
    `;
    const text = `New demo request
Name: ${input.name}
Email: ${input.email}
Brand: ${input.brand}
Approx. stores: ${input.stores || '—'}
Intent: ${INTENT_LABEL[input.intent]}

${input.message}`;

    try {
      await mailService.send({
        to: this.notifyEmail,
        subject: `Demo request: ${input.brand}`,
        html,
        text,
      });
    } catch (err) {
      // Don't fail the visitor's submission over an email delivery hiccup —
      // log it so it's not silently lost, but still confirm receipt to them.
      this.logger.error(`Failed to send lead notification: ${String(err)}`);
    }

    return { ok: true };
  }
}
