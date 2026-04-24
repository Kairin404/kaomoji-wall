const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

const ADMIN_PASSWORD = 'kairin';

const db = new Database(path.join(__dirname, 'kaomoji.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS kaomoji (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    author TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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
    for (const [content, author] of items) {
      insert.run(content, author);
    }
  });
  insertMany(seeds);
}

app.use(express.json());

// ★ 禁止一切缓存 ★
const noCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
};

// 首页用动态读取 + 注入版本号，彻底杜绝手机缓存
app.get('/', noCache, (req, res) => {
  const htmlPath = path.join(__dirname, 'public', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf-8');
  // 在<head>里塞一个版本meta，文件改一次就变一次
  const version = fs.statSync(htmlPath).mtimeMs;
  html = html.replace('<head>', `<head>\n<meta name="version" content="${version}">`);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.use(noCache);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/kaomoji', (req, res) => {
  const rows = db.prepare('SELECT * FROM kaomoji ORDER BY created_at DESC').all();
  res.json(rows);
});

app.post('/api/kaomoji', (req, res) => {
  const { content, author } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: '颜文字不能为空呀！' });
  }
  const trimmed = content.trim();
  if (trimmed.length > 100) {
    return res.status(400).json({ error: '太长啦！100个字符以内就好～' });
  }
  const authorName = (author && author.trim()) ? author.trim().slice(0, 20) : '';
  const result = db.prepare('INSERT INTO kaomoji (content, author) VALUES (?, ?)').run(trimmed, authorName);
  const newRow = db.prepare('SELECT * FROM kaomoji WHERE id = ?').get(result.lastInsertRowid);
  res.json(newRow);
});

app.delete('/api/kaomoji/:id', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(403).json({ error: '密码不对哦～' });
  }
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: '无效ID' });
  }
  const existing = db.prepare('SELECT * FROM kaomoji WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: '找不到这个颜文字' });
  }
  db.prepare('DELETE FROM kaomoji WHERE id = ?').run(id);
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('\nkaomoji wall running on port ' + PORT + '\n');
});
