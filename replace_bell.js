const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const newStr = `<button onclick="window.location.href='/notifications.html'" class="p-2 hover:bg-white/5 rounded-full transition-all bg-white/10" title="Film Salvati">
                    <span class="material-symbols-outlined text-primary-container" data-icon="notifications">notifications</span>
                </button>`;

for (const f of files) {
    if (f === 'notifications.html') continue;
    const p = path.join(publicDir, f);
    let content = fs.readFileSync(p, 'utf8');
    
    const regex = /<button class="p-2 hover:bg-white\/5 rounded-full transition-all">\s*<span class="material-symbols-outlined text-primary-container" data-icon="notifications">notifications<\/span>\s*<\/button>/g;
    if (regex.test(content)) {
        content = content.replace(regex, newStr);
        fs.writeFileSync(p, content);
        console.log('Updated ' + f);
    }
}
