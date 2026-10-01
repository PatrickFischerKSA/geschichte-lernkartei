const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const dest = path.join(root, 'dist');
fs.mkdirSync(dest, { recursive: true });
for (const name of ['index.html','styles.css','app.js','learning.js','data.js','cards.json','assets','docs']) {
  fs.cpSync(path.join(root, name), path.join(dest, name), { recursive: true });
}
