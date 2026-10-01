const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'cards.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'data.js'), 'window.LEARNING_DATA = ' + JSON.stringify(data, null, 2) + ';\n');
console.log(`${data.cards.length} Karten nach data.js übertragen.`);
