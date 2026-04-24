const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// ====== 管理密码 ======
const ADMIN_PASSWORD = 'kairin';

// ★ 数据库放在仓库外！！ 以后随便删仓库都不会丢数据 ★
const DATA_DIR = path.join(require('os').homedir(), 'kaomoji-data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'kaomoji.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS kaomoji (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    author TEXT DEFAULT '',
    delete_token TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 老数据迁移：给旧表加字段（如果不存在的话）
try { db.exec(`ALTER TABLE kaomoji ADD COLUMN delete_token TEXT DEFAULT ''`); } catch (e) {}

// 种子数据（仅在表空时插入）
const count = db.prepare('SELECT COUNT(*) as c FROM kaomoji').get().c;
if (count === 0) {
  const seeds = [
    ['(｡･ω･｡)ﾉ', '鼠鼠'],
    ['ᕕ( ᐛ )ᕗ', '鼠鼠'],
    ['(´∀`ʃƪ)', '鼠鼠'],
    ['*^ω^*', '鼠鼠'],
    ['(ᐢ..ᐢ)', '鼠鼠'],
    ['ᕙ(`▿´)ᕗ', '鼠鼠'],
    ['(´ᗜ`)♪', '鼠鼠'],
    ['ᕙ(⇀‸↼‶)ᕗ', '鼠鼠'],
    ['(˘ω˘ )', '鼠鼠'],
    ['(╥﹏╥)', '鼠鼠'],
    ['(◕ᴗ◕✿)', ''],
    ['٩(◕‿◕｡)۶', ''],
    ['(≧▽≦)', ''],
    ['(￣▽￣)ノ', ''],
    ['(っ˘ω˘ς)', ''],
    ['( •̀ ω •́ )✧', ''],
    ['(ノ°∀°)ノ⌒･*:.｡. .｡.:*･゜ﾟ･*', ''],
    ['(つ≧▽≦)つ', ''],
    ['┌(・。・)┘♪', ''],
    ['(｡♥‿♥｡)', ''],
  ];
  const insert = db.prepare('INSERT INTO kaomoji (content, author) VALUES (?, ?)');
  const insertMany = db.transaction((items) => {
    for (const [content, author] of items) insert.run(content, author);
  });
  insertMany(seeds);
}

app.use(express.json());

// 禁缓存中间件
const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
};

app.get('/', noCache, (req, res) => {
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  const version = fs.statSync(htmlPath).mtimeMs;
  html = html.replace('<head>', `<head>\n<meta name="version" content="${version}">`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.use(noCache);
app.use(express.static(path.join(__dirname, 'public')));

// 获取所有颜文字（不返回delete_token，避免泄漏）
app.get('/api/kaomoji', (req, res) => {
  const rows = db.prepare('SELECT id, content, author, created_at FROM kaomoji ORDER BY created_at DESC').all();
  res.json(rows);
});

// 投稿新颜文字
app.post('/api/kaomoji', (req, res) => {
  const { content, author } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '颜文字不能为空呀！' });
  }
  const trimmed = content.trim();
  if (trimmed.length > 100) {
    return res.status(400).json({ error: '太长啦！100个字符以内就好～' });
  }
  // ★ 去重检查 ★
  const existing = db.prepare('SELECT id FROM kaomoji WHERE content = ?').get(trimmed);
  if (existing) {
    return res.status(409).json({ error: '这个颜文字已经有啦～(ᐢ..ᐢ) 换一个吧！', duplicate_id: existing.id });
  }
  const authorName = (author && author.trim()) ? author.trim().slice(0, 20) : '';
  const token = crypto.randomBytes(16).toString('hex');
  const result = db.prepare('INSERT INTO kaomoji (content, author, delete_token) VALUES (?, ?, ?)').run(trimmed, authorName, token);
  const newRow = db.prepare('SELECT id, content, author, created_at FROM kaomoji WHERE id = ?').get(result.lastInsertRowid);
  // 只在这一次响应里返回token，前端需要localStorage保存
  res.json({ ...newRow, delete_token: token });
});

// 删除颜文字（token 或 管理员密码 二选一）
app.delete('/api/kaomoji/:id', (req, res) => {
  const { password, token } = req.body || {};
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: '无效ID' });
  const existing = db.prepare('SELECT * FROM kaomoji WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: '找不到这个颜文字' });

  const isAdmin = password && password === ADMIN_PASSWORD;
  const isOwner = token && existing.delete_token && token === existing.delete_token;
  if (!isAdmin && !isOwner) {
    return res.status(403).json({ error: '不能删这条哦～' });
  }
  db.prepare('DELETE FROM kaomoji WHERE id = ?').run(id);
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\nkaomoji wall running on port ' + PORT);
  console.log('DB path: ' + DB_PATH + '\n');
});
