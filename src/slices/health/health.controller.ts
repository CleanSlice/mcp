import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const htmlPath = join(__dirname, 'landing.html');
const isDev = process.env.NODE_ENV === 'dev';
const cachedHtml = isDev ? null : readFileSync(htmlPath, 'utf-8');

@ApiTags('api')
@Controller()
export class HealthController {
  @Get('health')
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  landing(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html');
    res.send(cachedHtml ?? readFileSync(htmlPath, 'utf-8'));
  }
}
