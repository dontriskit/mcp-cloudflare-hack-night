import type { DurableObject } from "cloudflare:workers";
import type { CachedResult, CompanyResult } from "../types";

export class ResultsCache implements DurableObject {
  private state: DurableObjectState;
  private readonly DEFAULT_TTL = 86400; // 24 hours in seconds

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  // Generate cache key from URL
  private getCacheKey(url: string): string {
    return `cache:${url}`;
  }

  // Check if cached result is still valid
  private isExpired(cachedResult: CachedResult): boolean {
    const cachedTime = new Date(cachedResult.cached_at).getTime();
    const now = Date.now();
    const ttlMs = cachedResult.ttl * 1000;
    return now - cachedTime > ttlMs;
  }

  // Store result in cache
  async cacheResult(
    url: string,
    jobId: string,
    result: CompanyResult,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    const cacheKey = this.getCacheKey(url);
    const cachedResult: CachedResult = {
      job_id: jobId,
      url,
      result,
      cached_at: new Date().toISOString(),
      ttl,
    };

    await this.state.storage.put(cacheKey, cachedResult);

    // Track URL in cache index
    const cacheIndex = (await this.state.storage.get<string[]>("cache_index")) || [];
    if (!cacheIndex.includes(url)) {
      cacheIndex.push(url);
      await this.state.storage.put("cache_index", cacheIndex);
    }
  }

  // Get cached result if available and not expired
  async getCachedResult(url: string): Promise<CachedResult | null> {
    const cacheKey = this.getCacheKey(url);
    const cachedResult = await this.state.storage.get<CachedResult>(cacheKey);

    if (!cachedResult) {
      return null;
    }

    if (this.isExpired(cachedResult)) {
      // Remove expired cache
      await this.state.storage.delete(cacheKey);
      return null;
    }

    return cachedResult;
  }

  // Clear cache for a specific URL
  async clearCache(url: string): Promise<boolean> {
    const cacheKey = this.getCacheKey(url);
    const existed = (await this.state.storage.get(cacheKey)) !== undefined;

    await this.state.storage.delete(cacheKey);

    // Remove from index
    const cacheIndex = (await this.state.storage.get<string[]>("cache_index")) || [];
    const newIndex = cacheIndex.filter((u) => u !== url);
    await this.state.storage.put("cache_index", newIndex);

    return existed;
  }

  // Clear all cache
  async clearAllCache(): Promise<number> {
    const cacheIndex = (await this.state.storage.get<string[]>("cache_index")) || [];

    for (const url of cacheIndex) {
      await this.state.storage.delete(this.getCacheKey(url));
    }

    await this.state.storage.delete("cache_index");
    return cacheIndex.length;
  }

  // Get cache stats
  async getCacheStats(): Promise<{
    total_cached: number;
    urls: string[];
  }> {
    const cacheIndex = (await this.state.storage.get<string[]>("cache_index")) || [];
    return {
      total_cached: cacheIndex.length,
      urls: cacheIndex,
    };
  }

  // HTTP handler for Durable Object
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === "POST" && path === "/cache") {
        const { url: targetUrl, job_id, result, ttl } = await request.json<{
          url: string;
          job_id: string;
          result: CompanyResult;
          ttl?: number;
        }>();
        await this.cacheResult(targetUrl, job_id, result, ttl);
        return Response.json({ success: true });
      }

      if (request.method === "GET" && path === "/cache") {
        const targetUrl = url.searchParams.get("url");
        if (!targetUrl) {
          return Response.json({ error: "URL parameter required" }, { status: 400 });
        }
        const cachedResult = await this.getCachedResult(targetUrl);
        return Response.json(cachedResult);
      }

      if (request.method === "DELETE" && path === "/cache") {
        const targetUrl = url.searchParams.get("url");
        if (!targetUrl) {
          return Response.json({ error: "URL parameter required" }, { status: 400 });
        }
        const cleared = await this.clearCache(targetUrl);
        return Response.json({ cleared });
      }

      if (request.method === "DELETE" && path === "/cache/all") {
        const count = await this.clearAllCache();
        return Response.json({ cleared_count: count });
      }

      if (request.method === "GET" && path === "/stats") {
        const stats = await this.getCacheStats();
        return Response.json(stats);
      }

      return Response.json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  }
}
