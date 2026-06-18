/**
 * 轻量级数据库层 - 零依赖 JSON 文件存储
 * 支持开发环境快速启动，生产环境可切换至 MySQL/PostgreSQL
 * 
 * 使用 Sequelize-like API 但用纯 JSON 文件持久化
 */
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

let dbCache: any = null;
let isDirty = false;

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadDb(): any {
  ensureDataDir();
  if (dbCache) return dbCache;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      dbCache = JSON.parse(raw);
    } else {
      dbCache = { users: [], customers: [], orders: [], tickets: [], calls: [], ticketComments: [], systemConfigs: [] };
      saveDb();
    }
  } catch (e) {
    dbCache = { users: [], customers: [], orders: [], tickets: [], calls: [], ticketComments: [], systemConfigs: [] };
  }
  return dbCache;
}

export function saveDb() {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf8');
  isDirty = false;
}

// 定期写入
setInterval(() => { if (isDirty && dbCache) saveDb(); }, 3000);

export function getNextId(collection: string): number {
  loadDb();
  const list = dbCache[collection] || [];
  if (list.length === 0) return 1;
  return Math.max(...list.map((x: any) => x.id || 0)) + 1;
}

/**
 * 通用仓库 - 提供类似 Sequelize 的 API
 */
export class Repository<T extends { id?: number }> {
  private table: string;
  private defaults: any;

  constructor(table: string, defaults: any = {}) {
    this.table = table;
    this.defaults = defaults;
  }

  private all(): T[] {
    loadDb();
    return (dbCache[this.table] || []) as T[];
  }

  private save(list: T[]) {
    loadDb();
    dbCache[this.table] = list;
    isDirty = true;
  }

  async findAll(options?: any): Promise<T[]> {
    let list = this.all().slice();
    if (options?.where) {
      const where: any = options.where;
      list = list.filter((item: any) => {
        for (const key of Object.keys(where)) {
          const val = where[key];
          if (val !== undefined && val !== null) {
            // 基本相等比较
            if (item[key] !== val) return false;
          }
        }
        return true;
      });
    }
    if (options?.order && options.order.length > 0) {
      const [field, dir] = options.order[0];
      list.sort((a: any, b: any) => {
        const av = a[field]; const bv = b[field];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (dir === 'DESC' ? -1 : 1) * (av > bv ? 1 : -1);
      });
    }
    if (options?.limit) list = list.slice(0, options.limit);
    if (options?.offset) list = list.slice(options.offset);
    return list;
  }

  async findAndCountAll(options?: any): Promise<{ rows: T[]; count: number }> {
    const where = options?.where;
    let list = this.all().slice();
    if (where) {
      list = list.filter((item: any) => {
        for (const key of Object.keys(where)) {
          const v = where[key];
          if (v !== undefined && v !== null && item[key] !== v) return false;
        }
        return true;
      });
    }
    const count = list.length;
    if (options?.order && options.order.length > 0) {
      const [field, dir] = options.order[0];
      list.sort((a: any, b: any) => {
        const av = a[field]; const bv = b[field];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (dir === 'DESC' ? -1 : 1) * (av > bv ? 1 : -1);
      });
    }
    let rows = list;
    if (options?.offset != null) rows = rows.slice(options.offset);
    if (options?.limit != null) rows = rows.slice(0, options.limit);
    return { rows, count };
  }

  async findByPk(id: number): Promise<T | null> {
    return this.all().find((x: any) => x.id === id) || null;
  }

  async findOne(where: any): Promise<T | null> {
    return this.all().find((item: any) => {
      for (const key of Object.keys(where)) {
        if (where[key] !== undefined && item[key] !== where[key]) return false;
      }
      return true;
    }) || null;
  }

  async create(data: any): Promise<T> {
    const list = this.all();
    const now = new Date();
    const record: any = { ...this.defaults, ...data, id: getNextId(this.table), createdAt: now, updatedAt: now };
    list.push(record);
    this.save(list);
    saveDb();
    return record as T;
  }

  async update(id: number, data: any): Promise<T | null> {
    const list = this.all();
    const idx = list.findIndex((x: any) => x.id === id);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], ...data, updatedAt: new Date() } as any;
    this.save(list);
    saveDb();
    return list[idx];
  }

  async destroy(id: number): Promise<number> {
    const list = this.all();
    const filtered = list.filter((x: any) => x.id !== id);
    const count = list.length - filtered.length;
    this.save(filtered);
    saveDb();
    return count;
  }

  async bulkCreate(items: any[]): Promise<T[]> {
    const list = this.all();
    const now = new Date();
    const created: T[] = [];
    for (const item of items) {
      const record: any = { ...this.defaults, ...item, id: getNextId(this.table), createdAt: now, updatedAt: now };
      list.push(record);
      created.push(record);
    }
    this.save(list);
    saveDb();
    return created;
  }

  async count(where?: any): Promise<number> {
    const list = this.all();
    if (!where) return list.length;
    return list.filter((item: any) => {
      for (const key of Object.keys(where)) {
        if (where[key] !== undefined && item[key] !== where[key]) return false;
      }
      return true;
    }).length;
  }

  async sum(field: string, where?: any): Promise<number> {
    const list = this.all();
    return list
      .filter((item: any) => {
        if (!where) return true;
        for (const key of Object.keys(where)) {
          if (where[key] !== undefined && item[key] !== where[key]) return false;
        }
        return true;
      })
      .reduce((sum: number, item: any) => sum + (Number(item[field]) || 0), 0);
  }

  /**
   * 支持简单的 LIKE 查询（用于 keyword 搜索）
   */
  async searchLike(fields: string[], keyword: string, options?: any): Promise<{ rows: T[]; count: number }> {
    const kw = String(keyword || '').toLowerCase();
    let list = this.all().slice();
    if (kw) {
      list = list.filter((item: any) =>
        fields.some(f => item[f] !== undefined && String(item[f]).toLowerCase().includes(kw))
      );
    }
    const where = options?.where;
    if (where) {
      list = list.filter((item: any) => {
        for (const key of Object.keys(where)) {
          if (where[key] !== undefined && item[key] !== where[key]) return false;
        }
        return true;
      });
    }
    const count = list.length;
    if (options?.order) {
      const [field, dir] = options.order[0];
      list.sort((a: any, b: any) => {
        const av = a[field]; const bv = b[field];
        if (av === bv) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return (dir === 'DESC' ? -1 : 1) * (av > bv ? 1 : -1);
      });
    }
    let rows = list;
    if (options?.offset != null) rows = rows.slice(options.offset);
    if (options?.limit != null) rows = rows.slice(0, options.limit);
    return { rows, count };
  }

  /**
   * 清空整个表（用于 seed）
   */
  truncate() {
    this.save([]);
    saveDb();
  }
}

// 单例引用 - 用于健康检查
export const sequelize = {
  authenticate: async () => { loadDb(); return true; },
  sync: async (_opts?: any) => { loadDb(); return true; },
  config: { dialect: 'json' },
};

export default { sequelize, Repository, loadDb, saveDb };
