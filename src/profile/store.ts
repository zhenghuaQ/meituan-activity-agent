// ============================================================
// src/profile/store.ts — 画像本地 JSON 持久化
//
// 轻量零依赖：单文件 data/profiles.json，内存缓存 + 落盘同步。
// 无账户/数据库，开箱即用；文件缺失或损坏自动回退空集，不阻断主流程。
// ============================================================

import { promises as fs } from "node:fs";
import path from "node:path";
import type { UserProfile, ProfileStoreFile } from "../../spec/profile.js";
import { childLogger } from "../core/logger.js";

const log = childLogger("profile:store");

const DEFAULT_PATH = path.resolve(process.cwd(), "data", "profiles.json");

export class ProfileStore {
  private cache = new Map<string, UserProfile>();
  private loaded = false;

  constructor(private readonly filePath: string = DEFAULT_PATH) {}

  /** 惰性加载：首次访问时读盘；文件不存在/损坏 → 空集 */
  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const data = JSON.parse(raw) as ProfileStoreFile;
      if (data?.profiles) {
        for (const [id, p] of Object.entries(data.profiles)) this.cache.set(id, p);
      }
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "ENOENT") {
        log.warn({ err: e.message, file: this.filePath }, "画像文件读取失败，使用空集");
      }
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const data: ProfileStoreFile = {
      version: 1,
      profiles: Object.fromEntries(this.cache),
    };
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    // 原子写：先写临时文件再重命名，避免半截文件
    const tmp = `${this.filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
    await fs.rename(tmp, this.filePath);
  }

  async get(id: string): Promise<UserProfile | undefined> {
    await this.load();
    return this.cache.get(id);
  }

  async list(): Promise<UserProfile[]> {
    await this.load();
    return [...this.cache.values()];
  }

  async upsert(profile: UserProfile): Promise<UserProfile> {
    await this.load();
    this.cache.set(profile.id, profile);
    await this.persist();
    return profile;
  }

  async remove(id: string): Promise<boolean> {
    await this.load();
    const ok = this.cache.delete(id);
    if (ok) await this.persist();
    return ok;
  }

  /** 清空（测试用） */
  async clear(): Promise<void> {
    await this.load();
    this.cache.clear();
    await this.persist();
  }
}

let _store: ProfileStore | null = null;

/** 全局画像存储单例（默认 data/profiles.json） */
export function getProfileStore(): ProfileStore {
  if (!_store) _store = new ProfileStore();
  return _store;
}

export function resetProfileStore(): void {
  _store = null;
}
