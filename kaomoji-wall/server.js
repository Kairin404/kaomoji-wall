const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3000;

// 初始化数据库
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

// 如果表是空的，塞一些鼠鼠的颜文字进去当初始数据！
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
    ['( ˘ω˘ )', '鼠鼠'],
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
app.use(express.static(path.join(__dirname, 'public')));

// 获取所有颜文字
app.get('/api/kaomoji', (req, res) => {
  const rows = db.prepare('SELECT * FROM kaomoji ORDER BY created_at DESC').all();
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
  const authorName = (author && author.trim()) ? author.trim().slice(0, 20) : '';
  const result = db.prepare('INSERT INTO kaomoji (content, author) VALUES (?, ?)').run(trimmed, authorName);
  const newRow = db.prepare('SELECT * FROM kaomoji WHERE id = ?').get(result.lastInsertRowid);
  res.json(newRow);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🐭 颜文字收集墙跑起来啦！`);
  console.log(`📍 本地访问: http://localhost:${PORT}`);
  console.log(`📍 外部访问: http://8.138.151.235:${PORT}\n`);
});
