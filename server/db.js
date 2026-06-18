// 简单的 JSON 文件数据库 - 无需任何原生编译依赖
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db = {
  users: [],
  customers: [],
  orders: [],
  tickets: [],
  calls: [],
};

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      Object.keys(db).forEach(k => { if (data[k]) db[k] = data[k]; });
    }
  } catch (e) { console.error('数据库加载失败:', e.message); }
}

function save() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
  catch (e) { console.error('数据库保存失败:', e.message); }
}

function reset(newData) { db = newData; save(); }
function getAll(table) { return db[table] || []; }
function findOne(table, predicate) { return getAll(table).find(predicate); }
function findMany(table, predicate) { return getAll(table).filter(predicate); }
function count(table, predicate) { if (!predicate) return getAll(table).length; return getAll(table).filter(predicate).length; }

function insert(table, record) {
  const items = db[table] || (db[table] = []);
  if (!record.id) record.id = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
  record.createdAt = record.createdAt || new Date().toISOString();
  record.updatedAt = new Date().toISOString();
  items.push(record);
  save();
  return record;
}

function update(table, predicate, patch) {
  const items = db[table] || [];
  const updated = [];
  for (let i = 0; i < items.length; i++) {
    if (predicate(items[i], i)) {
      items[i] = { ...items[i], ...patch, updatedAt: new Date().toISOString() };
      updated.push(items[i]);
    }
  }
  save();
  return updated;
}

function remove(table, predicate) {
  const items = db[table] || [];
  const removed = items.filter(predicate);
  db[table] = items.filter((x, i) => !predicate(x, i));
  save();
  return removed;
}

// 分页查询
function paginate(table, { page = 1, pageSize = 20, predicate, sortBy = 'createdAt', sortOrder = 'desc' } = {}) {
  let items = db[table] || [];
  if (predicate) items = items.filter(predicate);
  items = items.slice().sort((a, b) => {
    const av = a[sortBy], bv = b[sortBy];
    if (av === bv) return 0;
    const result = av > bv ? 1 : -1;
    return sortOrder === 'desc' ? -result : result;
  });
  const total = items.length;
  const start = (page - 1) * pageSize;
  const list = items.slice(start, start + pageSize);
  return { items: list, total, page, pageSize };
}

load();

module.exports = { db, load, save, reset, getAll, findOne, findMany, count, insert, update, remove, paginate };
