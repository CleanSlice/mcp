// @scope:api
// @slice:mcp
// @layer:domain
// @type:service

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import type { Response } from 'express';

/**
 * Service that implements automatic ping for SSE connections
 * This prevents browser/client timeouts for long-lived connections
 */
@Injectable()
export class SsePingService implements OnModuleInit, OnModuleDestroy {
  private pingInterval: NodeJS.Timeout | null = null;
  private readonly logger = new Logger(SsePingService.name);
  private readonly activeConnections = new Map<
    string,
    {
      transport: SSEServerTransport;
      res: Response;
    }
  >();

  // Default to 30 seconds - this is a reasonable interval for most clients
  private pingIntervalMs = 30000;
  private pingEnabled = true;

  constructor() { }

  onModuleInit() {
    this.logger.log('Initializing SSE ping service');
  }

  onModuleDestroy() {
    this.stopPingInterval();
    this.logger.log('SSE ping service stopped');
  }

  /**
   * Configure the ping service
   */
  configure(options: { pingEnabled?: boolean; pingIntervalMs?: number }) {
    if (options.pingIntervalMs !== undefined) {
      this.pingIntervalMs = options.pingIntervalMs;
    }

    if (options.pingEnabled !== undefined) {
      this.pingEnabled = options.pingEnabled;
    }

    if (this.pingEnabled) {
      this.startPingInterval();
    } else {
      this.stopPingInterval();
    }
  }

  /**
   * Register a new SSE connection to receive pings
   */
  registerConnection(
    sessionId: string,
    transport: SSEServerTransport,
    res: Response,
  ) {
    this.activeConnections.set(sessionId, { transport, res });
    this.logger.debug(`SSE connection registered: ${sessionId}`);
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(sessionId: string) {
    this.activeConnections.delete(sessionId);
    this.logger.debug(`SSE connection removed: ${sessionId}`);
  }

  /**
   * Start the ping interval timer
   */
  private startPingInterval() {
    if (this.pingInterval) {
      this.stopPingInterval();
    }

    this.logger.log(
      `Starting SSE ping service (interval: ${this.pingIntervalMs}ms)`,
    );
    this.pingInterval = setInterval(() => {
      this.sendPingToAllConnections();
    }, this.pingIntervalMs);
  }

  /**
   * Stop the ping interval timer
   */
  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
      this.logger.log('SSE ping interval stopped');
    }
  }

  /**
   * Check if a response is still writable and valid
   */
  private isResponseValid(res: Response): boolean {
    try {
      // Check if response is finished
      if (res.finished) {
        return false;
      }

      // Check if socket exists and is not destroyed
      if (!res.socket) {
        return false;
      }

      // Use modern Node.js v22 compatible socket checks
      if (typeof res.socket.destroyed === 'boolean' && res.socket.destroyed) {
        return false;
      }

      // Additional check for writable state
      if (typeof res.socket.writable === 'boolean' && !res.socket.writable) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.debug('Error checking response validity:', error);
      return false;
    }
  }

  /**
   * Send a ping to all active connections
   */
  private sendPingToAllConnections() {
    const timestamp = Date.now();
    const connectionCount = this.activeConnections.size;

    if (connectionCount === 0) {
      return;
    }

    this.logger.debug(`Sending SSE ping to ${connectionCount} connections`);

    for (const [sessionId, { res }] of this.activeConnections.entries()) {
      try {
        // Check if response is still valid using modern Node.js v22 compatible checks
        if (this.isResponseValid(res)) {
          // Send a comment-type SSE message (line starting with ':')
          // This keeps the connection alive without triggering an event in the client
          res.write(`: ping - ${new Date(timestamp).toISOString()}\n\n`);
        } else {
          this.logger.debug(
            `Connection ${sessionId} is no longer writable, removing`,
          );
          this.removeConnection(sessionId);
        }
      } catch (error) {
        this.logger.error(
          `Error sending ping to connection ${sessionId}`,
          error,
        );
        this.removeConnection(sessionId);
      }
    }
  }

  /**
   * Get information about active connections
   */
  public getActiveConnectionsInfo() {
    const connections = Array.from(this.activeConnections.entries()).map(([sessionId, { res }]) => ({
      sessionId,
      isValid: this.isResponseValid(res),
      timestamp: new Date().toISOString(),
    }));

    return {
      totalConnections: connections.length,
      connections,
      pingIntervalMs: this.pingIntervalMs,
      pingEnabled: this.pingEnabled,
    };
  }

  /**
   * Force cleanup of invalid connections
   */
  public cleanupInvalidConnections() {
    const beforeCount = this.activeConnections.size;

    for (const [sessionId, { res }] of this.activeConnections.entries()) {
      if (!this.isResponseValid(res)) {
        this.logger.debug(`Forcing cleanup of invalid connection: ${sessionId}`);
        this.removeConnection(sessionId);
      }
    }

    const afterCount = this.activeConnections.size;
    const cleanedCount = beforeCount - afterCount;

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} invalid connections. Active: ${afterCount}`);
    }

    return { cleanedCount, remainingCount: afterCount };
  }
}
