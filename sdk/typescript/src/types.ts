export interface ZizkaDBConfig {
  apiKey?: string;
  host?: string;
  timeout?: number;
}

export interface LogOptions {
  agent: string;
  event: string;
  data: Record<string, unknown>;
  parentId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface QueryOptions {
  agent: string;
  limit?: number;
  before?: Date;
  after?: Date;
  eventType?: string;
  sessionId?: string;
}

export interface SearchOptions {
  query: string;
  agent?: string;
  limit?: number;
}

export interface AtOptions {
  agent: string;
  timestamp: Date;
}

export interface AgentEvent {
  eventId: string;
  agent: string;
  timestamp: Date;
  event: string;
  data: Record<string, unknown>;
  parentId: string | null;
  sessionId: string | null;
  sequenceNo: number;
  score?: number;
}

export interface LogResult {
  eventId: string;
  timestamp: Date;
  sequenceNo: number;
  checksum: string;
}

export interface CausalChain {
  eventId: string;
  chainLength: number;
  chain: AgentEvent[];
  print(): void;
}

export interface AgentState {
  agent: string;
  at: Date;
  eventCount: number;
  state: Record<string, unknown>;
}

export interface AgentInfo {
  agent: string;
  firstSeen: Date;
  lastSeen: Date;
  eventCount: number;
}

export class ZizkaDBError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ZizkaDBError';
  }
}

export class AuthError extends ZizkaDBError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends ZizkaDBError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class AgentScopeError extends ZizkaDBError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'AgentScopeError';
  }
}

export class RateLimitError extends ZizkaDBError {
  constructor(message: string) {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}
