const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public');
const files = ['index.html', 'genres.html', 'list.html', 'movie.html', 'actors.html'];

files.forEach(f => {
    let c = fs.readFileSync(path.join(dir, f), 'utf8');
    
    // Replace the search container
    const oldSearchRegex = /<div class="relative hidden md:block" id="search-container">([\s\S]*?)<\/div>\s*<div class="relative" id="lang-selector-container">/;
    
    if (oldSearchRegex.test(c)) {
        const newSearch = `<div class="hidden md:flex items-center gap-2" id="search-container">
                    <input id="search-year-input" type="number" min="1900" max="2100" class="bg-black border-b border-outline-variant focus:border-primary-container focus:ring-0 text-on-background px-2 py-1.5 w-16 transition-colors text-center text-sm" placeholder="Anno" data-i18n-placeholder="search.year" autocomplete="off" />
                    <div class="relative">
                        <input id="search-input" class="bg-black border-b border-outline-variant focus:border-primary-container focus:ring-0 text-on-background px-3 py-1.5 w-48 transition-colors text-sm" placeholder="Cerca..." type="text" autocomplete="off" data-i18n-placeholder="search.placeholder" />
                        <span class="material-symbols-outlined absolute right-2 top-1.5 text-on-surface-variant material-fill-0 cursor-pointer text-[20px]" onclick="executeSearchGlobal()">search</span>
                        
                        <!-- Auto-suggest Dropdown -->
                        <div id="search-suggestions" class="hidden absolute top-full mt-2 w-full bg-surface-container border border-outline-variant/20 rounded-lg shadow-2xl overflow-hidden z-50 flex-col max-h-[400px] overflow-y-auto">
                            <!-- Suggestions will be injected here -->
                        </div>
                    </div>
                </div>
                <div class="relative" id="lang-selector-container">`;
                
        c = c.replace(oldSearchRegex, newSearch);
        fs.writeFileSync(path.join(dir, f), c, 'utf8');
        console.log(`Updated ${f}`);
    } else {
        console.log(`Regex not matched in ${f}`);
    }
});
