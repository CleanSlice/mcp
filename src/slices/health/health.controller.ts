import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

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
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CleanSlice MCP Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
    }
    .container {
      text-align: center;
      max-width: 480px;
      padding: 2rem;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 2rem;
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: 700;
      color: #fff;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }
    p {
      color: #a1a1aa;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #22c55e;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
    .status::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    .btn {
      display: inline-block;
      padding: 0.75rem 2rem;
      background: #fafafa;
      color: #0a0a0a;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 500;
      font-size: 0.95rem;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.85; }
    .links {
      margin-top: 1.5rem;
      display: flex;
      gap: 1.5rem;
      justify-content: center;
    }
    .links a {
      color: #71717a;
      text-decoration: none;
      font-size: 0.85rem;
      transition: color 0.2s;
    }
    .links a:hover { color: #fafafa; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CS</div>
    <h1>CleanSlice MCP Server</h1>
    <p>This is a Model Context Protocol server that provides AI coding agents with CleanSlice architecture documentation.</p>
    <div class="status">Server running</div>
    <br><br>
    <a href="https://cleanslice.org" class="btn">Go to CleanSlice</a>
    <div class="links">
      <a href="/health">Health</a>
      <a href="/api">API Docs</a>
      <a href="https://github.com/CleanSlice/mcp">GitHub</a>
    </div>
  </div>
</body>
</html>`);
  }
}
