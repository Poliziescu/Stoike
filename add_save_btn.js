const fs = require('fs');
const p = './public/movie.html';
let content = fs.readFileSync(p, 'utf8');

const regex = /<span class="text-on-surface-variant font-label-md text-label-md">\/ 10<\/span>\s*<\/div>/;
const replaceStr = `<span class="text-on-surface-variant font-label-md text-label-md">/ 10</span>
                            <div class="ml-4 pl-4 border-l border-white/10 flex items-center">
                                <button id="movie-detail-save-btn" onclick="triggerSaveMovieDetail(event)" class="p-2 bg-black/60 backdrop-blur-md border border-outline-variant/20 rounded-full flex items-center justify-center hover:bg-primary-container hover:text-black text-white transition-colors" title="Avvisami all'uscita">
                                    <span class="material-symbols-outlined text-[20px]">notifications</span>
                                </button>
                            </div>
                        </div>`;

if (regex.test(content)) {
    content = content.replace(regex, replaceStr);
    fs.writeFileSync(p, content);
    console.log("Updated movie.html successfully");
} else {
    console.log("Target string not found!");
}
