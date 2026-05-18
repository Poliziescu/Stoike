const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public');
const files = ['index.html', 'genres.html', 'list.html', 'movie.html', 'actors.html'];

files.forEach(f => {
    let c = fs.readFileSync(path.join(dir, f), 'utf8');
    
    const oldSelectRegex = /<select id="lang-select"[\s\S]*?<\/select>/;
    
    const newSelect = `<div class="relative" id="lang-selector-container">
                    <button id="lang-dropdown-btn" class="flex items-center justify-center bg-black/60 border border-outline-variant/30 rounded-lg w-10 h-10 hover:bg-white/5 focus:border-primary-container focus:ring-0 outline-none cursor-pointer transition-colors">
                        <img id="current-lang-flag" src="https://flagcdn.com/w20/it.png" alt="IT" class="w-6 h-auto rounded-sm">
                    </button>
                    <div id="lang-dropdown-menu" class="hidden absolute right-0 mt-2 w-14 bg-surface-container border border-outline-variant/20 rounded-lg shadow-2xl overflow-hidden z-50 flex-col">
                        <button onclick="changeLanguage('it')" class="flex items-center justify-center w-full py-3 hover:bg-white/10 transition-colors border-b border-white/5"><img src="https://flagcdn.com/w20/it.png" alt="IT" class="w-6 h-auto rounded-sm"></button>
                        <button onclick="changeLanguage('en')" class="flex items-center justify-center w-full py-3 hover:bg-white/10 transition-colors border-b border-white/5"><img src="https://flagcdn.com/w20/gb.png" alt="EN" class="w-6 h-auto rounded-sm"></button>
                        <button onclick="changeLanguage('fr')" class="flex items-center justify-center w-full py-3 hover:bg-white/10 transition-colors border-b border-white/5"><img src="https://flagcdn.com/w20/fr.png" alt="FR" class="w-6 h-auto rounded-sm"></button>
                        <button onclick="changeLanguage('es')" class="flex items-center justify-center w-full py-3 hover:bg-white/10 transition-colors border-b border-white/5"><img src="https://flagcdn.com/w20/es.png" alt="ES" class="w-6 h-auto rounded-sm"></button>
                        <button onclick="changeLanguage('de')" class="flex items-center justify-center w-full py-3 hover:bg-white/10 transition-colors"><img src="https://flagcdn.com/w20/de.png" alt="DE" class="w-6 h-auto rounded-sm"></button>
                    </div>
                </div>`;

    if (oldSelectRegex.test(c)) {
        c = c.replace(oldSelectRegex, newSelect);
        fs.writeFileSync(path.join(dir, f), c, 'utf8');
        console.log(`Updated ${f}`);
    } else {
        console.log(`Regex not matched in ${f}`);
    }
});
