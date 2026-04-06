/**
 * 서버 전용 모듈 타입 선언
 * ioredis, bullmq는 서버 런타임에서만 사용되므로
 * 타입 체크를 위한 최소 선언
 */

declare module "ioredis" {
  interface RedisOptions {
    maxRetriesPerRequest?: number;
    connectTimeout?: number;
    lazyConnect?: boolean;
    host?: string;
    port?: number;
    password?: string;
  }
  export default class Redis {
    constructor(url: string, options?: RedisOptions);
    constructor(options?: RedisOptions);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    info(section?: string): Promise<string>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<any>;
    del(key: string): Promise<number>;
    quit(): Promise<void>;
  }
}

declare module "bullmq" {
  export class Queue {
    constructor(name: string, options?: any);
    add(name: string, data: any, options?: any): Promise<any>;
    close(): Promise<void>;
  }
  export class Worker {
    constructor(
      name: string,
      processor: (job: any) => Promise<any>,
      options?: any,
    );
    close(): Promise<void>;
  }
  export class QueueEvents {
    constructor(name: string, options?: any);
    on(event: string, handler: (args: any) => void): this;
    close(): Promise<void>;
  }
}

declare module "@x2/api/services/engines/category-entry-engine" {
  export class CategoryEntryEngine {
    analyze(seedKeyword: string, keywords?: string[]): unknown;
  }
  export const CATEGORY_LABELS: Record<string, string>;
  export const ENTRY_TYPE_LABELS: Record<string, string>;
}
