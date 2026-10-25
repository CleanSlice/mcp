---
id: api-mail
title: Mail Setup (API)
version: 1.0.0
last_updated: 2026-10-08

pattern: setup
complexity: fundamental
framework: nestjs
category: setup
applies_to: [backend, api]

tags:
  - mail
  - email
  - smtp
  - nodemailer
  - mailpit
  - repository
  - setup

keywords:
  - send email
  - smtp setup
  - mailpit
  - nodemailer
  - mail service
  - local inbox
  - transactional email
  - email provider

deprecated: false
experimental: false
production_ready: true
---

# Mail Setup (API)

> **The mail slice is the one place the API sends email from.** Feature slices inject `MailService`. The transport behind it is a repository chosen in the module: locally an SMTP repository pointed at **Mailpit**, a Docker container that catches every message and shows it in a web inbox; in production the same repository pointed at any SMTP relay (SES, Postmark, Resend, a corporate server).

---

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│  FEATURE SLICE (invite, auth, billing ...)                   │
│  constructor(private readonly mail: MailService)             │
└──────────────────────────┬───────────────────────────────────┘
                           │ send(IMailMessage)
                           v
┌──────────────────────────────────────────────────────────────┐
│  setup/mail  DOMAIN                                          │
│  MailService  - fills the default sender (SMTP_FROM)         │
│  IMailGateway - abstract class, the only thing domain knows  │
└──────────────────────────┬───────────────────────────────────┘
                           │ IMailGateway (NestJS DI)
                           v
┌──────────────────────────────────────────────────────────────┐
│  setup/mail  DATA                                            │
│  SmtpMailGateway - maps domain message -> SMTP, wraps errors │
│  SmtpRepository  - black box over nodemailer + SMTP_* env    │
└──────────────────────────┬───────────────────────────────────┘
                           │ SMTP
            ┌──────────────┴──────────────┐
            v                             v
   Mailpit (docker, local)        SES / Postmark / relay (prod)
   inbox: http://localhost:8025   same code, different env
```

Why a repository and not a direct `nodemailer` call in a service: the SMTP repository knows nothing about the application, so it can be copied into another project unchanged, and a second provider (an HTTP API such as SES or Resend) is a sibling repository plus a gateway, not a rewrite of every sender.

---

## Structure

```
api/src/slices/setup/mail/
├── mail.module.ts                  # @Global; binds IMailGateway -> SmtpMailGateway
├── index.ts
├── domain/
│   ├── mail.types.ts               # IMailMessage, IMailResult
│   ├── mail.gateway.ts             # abstract IMailGateway
│   ├── mail.service.ts             # MailService
│   ├── mail.service.spec.ts
│   └── mail.errors.ts              # MailNotConfiguredError, MailDeliveryError
└── data/
    ├── mail.gateway.ts             # SmtpMailGateway extends IMailGateway
    ├── mail.gateway.spec.ts
    ├── mail.mapper.ts              # IMailMessage <-> ISmtpMessage
    └── repositories/
        └── smtp/
            ├── smtp.repository.ts  # nodemailer transport
            └── smtp.types.ts       # ISmtpConfig, ISmtpMessage, ISmtpSendResult
```

Dependency: `nodemailer` (ships its own types).

```bash
bun add nodemailer
```

---

## Local Inbox: Mailpit

Add Mailpit to `docker-compose.yml` next to PostgreSQL. It speaks SMTP on one port and serves a web inbox on another.

```yaml
services:
  mail-local:
    image: axllent/mailpit:v1.31.4
    ports:
      - '127.0.0.1:1025:1025' # SMTP  -> SMTP_HOST=localhost SMTP_PORT=1025
      - '127.0.0.1:8025:8025' # Web UI -> http://localhost:8025
    environment:
      MP_MAX_MESSAGES: '500'
    healthcheck:
      test: ['CMD', '/mailpit', 'readyz']
      interval: 2s
      timeout: 3s
      retries: 30
```

- Bind to `127.0.0.1`. Mailpit has no authentication.
- `docker compose up -d` from `predev` starts it with the database, so a fresh clone sends email without any account.
- The inbox has a REST API: `GET http://localhost:8025/api/v1/messages` lists messages, `DELETE` on the same path empties it. Use it in end-to-end tests to assert that a flow sent what it should.

The starter kit maps the ports into its own range (`4231` SMTP, `4232` UI) to avoid clashes with other projects; the numbers are an `.env` detail, nothing in the code knows them.

---

## Environment

```bash
# EMAIL (SMTP; locally Mailpit from docker-compose, inbox at http://localhost:8025)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=CleanSlice <noreply@cleanslice.local>
```

| Variable | Meaning |
|----------|---------|
| `SMTP_HOST`, `SMTP_PORT` | The relay. Mailpit locally; the provider's SMTP endpoint in production |
| `SMTP_SECURE` | `true` for implicit TLS (port 465). `false` lets nodemailer upgrade with STARTTLS when the server offers it |
| `SMTP_USER`, `SMTP_PASSWORD` | Empty = no auth (Mailpit). Set both for a real relay |
| `SMTP_FROM` | Default sender; a message may override it with `from` |

`SMTP_FROM` missing is a configuration error (`MailNotConfiguredError`, 500), not a delivery error. The service refuses to send rather than letting the relay pick a sender.

---

## Domain Layer

### mail.types.ts

```typescript
export interface IMailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface IMailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}
```

### mail.gateway.ts

```typescript
export abstract class IMailGateway {
  abstract send(message: IMailMessage): Promise<IMailResult>;
}
```

### mail.service.ts

```typescript
@Injectable()
export class MailService {
  constructor(
    private readonly mailGateway: IMailGateway,
    private readonly config: ConfigService,
  ) {}

  async send(message: IMailMessage): Promise<IMailResult> {
    const from = message.from || this.config.get<string>('SMTP_FROM');

    if (!from) {
      throw new MailNotConfiguredError('SMTP_FROM');
    }

    return this.mailGateway.send({ ...message, from });
  }
}
```

### mail.errors.ts

```typescript
export class MailNotConfiguredError extends BaseError {
  public override code = ErrorCodes.MAIL_NOT_CONFIGURED;

  constructor(variable: string) {
    super(
      `Mail is not configured: set ${variable} in the environment`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class MailDeliveryError extends BaseError {
  public override code = ErrorCodes.MAIL_DELIVERY_FAILED;

  constructor(to: string | string[], cause?: Error) {
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    super(`Could not deliver mail to "${recipients}"`, HttpStatus.BAD_GATEWAY, {
      cause,
    });
  }
}
```

Both codes are added to `ErrorCodes` in `setup/error`.

---

## Data Layer

### repositories/smtp/smtp.repository.ts

The black box. Only env vars and nodemailer; no imports from `domain/` or `data/`.

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { ISmtpConfig, ISmtpMessage, ISmtpSendResult } from './smtp.types';

const toAddress = (entry: string | { address: string }): string =>
  typeof entry === 'string' ? entry : entry.address;

@Injectable()
export class SmtpRepository {
  private readonly transporter: Transporter;

  constructor(config: ConfigService) {
    const smtp = SmtpRepository.readConfig(config);

    this.transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    });
  }

  async send(message: ISmtpMessage): Promise<ISmtpSendResult> {
    const info = await this.transporter.sendMail(message);

    return {
      messageId: info.messageId,
      accepted: info.accepted.map(toAddress),
      rejected: info.rejected.map(toAddress),
      response: info.response,
    };
  }

  /** Opens and closes a connection; true when the server answers. */
  async verify(): Promise<boolean> {
    return this.transporter.verify();
  }

  private static readConfig(config: ConfigService): ISmtpConfig {
    return {
      host: config.get<string>('SMTP_HOST', 'localhost'),
      port: Number(config.get<string>('SMTP_PORT', '1025')),
      secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
      user: config.get<string>('SMTP_USER') || undefined,
      password: config.get<string>('SMTP_PASSWORD') || undefined,
    };
  }
}
```

The repository does not call `verify()` on startup. A missing relay should fail the request that sends, with a `MailDeliveryError`, not the boot of the whole API.

### mail.mapper.ts

```typescript
@Injectable()
export class MailMapper {
  toSmtp(message: IMailMessage): ISmtpMessage {
    return {
      from: message.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
      cc: message.cc,
      bcc: message.bcc,
    };
  }

  toResult(result: ISmtpSendResult): IMailResult {
    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    };
  }
}
```

### mail.gateway.ts

```typescript
@Injectable()
export class SmtpMailGateway extends IMailGateway {
  constructor(
    private readonly smtp: SmtpRepository,
    private readonly mapper: MailMapper,
  ) {
    super();
  }

  async send(message: IMailMessage): Promise<IMailResult> {
    try {
      const result = await this.smtp.send(this.mapper.toSmtp(message));
      return this.mapper.toResult(result);
    } catch (error) {
      throw new MailDeliveryError(message.to, error as Error);
    }
  }
}
```

---

## Module

```typescript
@Global()
@Module({
  providers: [
    MailService,
    MailMapper,
    SmtpRepository,
    {
      provide: IMailGateway,
      useClass: SmtpMailGateway,
    },
  ],
  exports: [MailService],
})
export class MailModule {}
```

`@Global()` for the same reason as `PrismaModule`: it is infrastructure every feature may need, and importing it into each module adds nothing. Register it in `app.module.ts` after `HealthModule`.

---

## Usage From a Feature Slice

```typescript
@Injectable()
export class InviteService {
  constructor(
    private readonly inviteGateway: IInviteGateway,
    private readonly mail: MailService,
  ) {}

  async invite(email: string): Promise<IInviteData> {
    const invite = await this.inviteGateway.create(email);

    await this.mail.send({
      to: email,
      subject: 'You are invited',
      html: `<a href="${invite.url}">Accept the invitation</a>`,
    });

    return invite;
  }
}
```

Run the flow, open `http://localhost:8025`, read the message.

### Await or not

`await this.mail.send(...)` makes the request fail with `502 MAIL_DELIVERY_FAILED` when the relay is down. That is right when the email **is** the outcome (password reset, magic link, invitation). When the email is a side effect of an outcome that must succeed anyway (welcome email after registration, a notification), do not couple them with a bare `await` and do not drop the promise either: record the intent and deliver it from a worker or an outbox. See [Reliable Operations](../architecture/reliable-operations.md) and [Transactions](../architecture/transactions.md); a send inside a database transaction is never rolled back with it.

---

## Adding Another Provider

An HTTP provider (SES API, Resend, Postmark API) is a second repository and a second gateway, chosen in the module:

```
data/
├── mail.gateway.ts                 # SmtpMailGateway
├── ses-mail.gateway.ts             # SesMailGateway
└── repositories/
    ├── smtp/
    └── ses/
        ├── ses.repository.ts       # wraps @aws-sdk/client-sesv2
        └── ses.types.ts
```

```typescript
{
  provide: IMailGateway,
  useClass: process.env.MAIL_PROVIDER === 'ses' ? SesMailGateway : SmtpMailGateway,
}
```

Feature slices do not change. Keep the SMTP repository even in a project that ships with SES: it is what Mailpit runs on locally.

---

## Testing

- **Unit (service, feature slices):** inject a fake `IMailGateway` (`{ send: jest.fn() }`) and assert on the message. No transport, no network.
- **Unit (gateway):** fake `SmtpRepository`, assert the mapping and that failures become `MailDeliveryError` with the cause attached.
- **End-to-end:** run the flow against Mailpit, then read `GET /api/v1/messages`; `DELETE` it in `beforeEach`. This proves the relay interoperability that a green build does not.

---

## Checklist

- [ ] `nodemailer` installed; `SMTP_*` in `.env.example` with the Mailpit values
- [ ] `mail-local` (Mailpit) in `docker-compose.yml`, bound to `127.0.0.1`
- [ ] `IMailGateway` abstract class in `domain/`, implementation in `data/`
- [ ] `SmtpRepository` imports nothing from `domain/` or `data/`
- [ ] `MailModule` is `@Global()` and exports only `MailService`
- [ ] `MAIL_NOT_CONFIGURED` and `MAIL_DELIVERY_FAILED` in `ErrorCodes`
- [ ] Feature slices inject `MailService`, never the gateway or the repository
- [ ] Emails that are side effects go through an outbox or a worker, not a bare `await`

### Never Do

- [ ] NO `nodemailer` import outside `data/repositories/smtp/`
- [ ] NO real SMTP credentials in `.env.example` or in tests
- [ ] NO `verify()` on boot that stops the API when the relay is down
- [ ] NO sending from a controller

---

## Related Documentation

- [API Docker Services](./api-docker.md) - Mailpit next to PostgreSQL
- [Repository Pattern](../03-patterns/repository.md) - Why the transport is a repository
- [Gateway Pattern](../03-patterns/gateway.md) - Abstract class in domain, implementation in data
- [Error Pattern](../03-patterns/error.md) - `BaseError` and `ErrorCodes`
- [Setup Slices](../04-slices/setup.md) - Where the mail slice sits among the others
