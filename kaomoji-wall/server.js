const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3000;

// ====== 管理密码（老大可以改这里！）======
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
app.use(express.static(path.join(__dirname, 'public')));

//获取所有颜文字
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

// 删除颜文字（需要管理密码）
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
