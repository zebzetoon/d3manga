// --- AYARLAR ---
const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100;

let ARSIV = {}; 
let currentManga = null;

// 1. BAŞLANGIÇ
document.addEventListener("DOMContentLoaded", () => {
    fetch('liste.csv?t=' + CACHE_ID).then(r => r.text()).then(t => {
        const grid = document.getElementById('manga-list');
        grid.innerHTML = ""; 
        
        t.split('\n').forEach((l, index) => {
            let d = l.split(',').map(x => x.trim());
            if(d.length < 8) return; 
            
            let [isim, klasor, user, repo, aralik, kapak, tur, durum] = d;

            if(!ARSIV[isim]) ARSIV[isim] = { bolumler: {}, u: user, r: repo, k: klasor };
            
            let baslangic, bitis;
            if (aralik.includes('-')) {
                let p = aralik.split('-');
                baslangic = parseInt(p[0]);
                bitis = parseInt(p[1]);
            } else {
                baslangic = parseInt(aralik);
                bitis = parseInt(aralik);
            }
            for(let i=baslangic; i<=bitis; i++) ARSIV[isim].bolumler[i] = true;

            // DURUM ETİKETİ (SOL ÜST)
            let durumTag = "";
            if(durum.toLowerCase().includes("tamam")) 
                durumTag = `<div class="tag tag-status tag-completed"><i class="fas fa-lock"></i> Tamamlandı</div>`;
            else 
                durumTag = `<div class="tag tag-status tag-ongoing">Devam Ediyor</div>`;

            // YENİ ETİKETİ (SAĞ ÜST) - Eğer istersen buraya tarih kontrolü de eklenir
            let yeniTag = `<div class="tag tag-new">Yeni</div>`;

            let cardHtml = `
            <div class="manga-card" onclick="openReader('${isim}')">
                <div class="card-img-container">
                    ${durumTag}
                    ${yeniTag}
                    <img src="${kapak}" class="card-img" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300?text=Kapak'">
                </div>
                <div class="card-info">
                    <div class="card-title">${isim}</div>
                    <div class="card-genre">${tur}</div>
                </div>
            </div>`;
            
            grid.innerHTML += cardHtml;
        });
    });
});

// 2. OKUYUCU FONKSİYONLARI
function openReader(isim) {
    currentManga = isim;
    // Sayfa kaydırmayı kilitle (Arka plan oynamasın)
    document.body.style.overflow = 'hidden'; 
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'block';
    
    const cSel = document.getElementById('cSelect');
    cSel.innerHTML = "";
    Object.keys(ARSIV[isim].bolumler).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(b => {
        let o = document.createElement("option"); o.text = "Bölüm " + b; o.value = b; cSel.add(o);
    });
    
    resimGetir();
}

function closeReader() {
    // Sayfa kaydırmayı aç
    document.body.style.overflow = 'auto';
    document.getElementById('home-view').style.display = 'block';
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('box').innerHTML = ""; 
}

function resimGetir() {
    const box = document.getElementById('box');
    const cSel = document.getElementById('cSelect');
    let b = cSel.value;
    let veri = ARSIV[currentManga];
    
    box.innerHTML = "<div style='text-align:center; padding:50px; color:#888;'>Yükleniyor...</div>";
    // Okuyucunun en tepesine git
    document.getElementById('reader-view').scrollTop = 0;
    
    let klasorYolu = veri.k === "." ? "" : veri.k + "/";

    box.innerHTML = "";
    for(let i=1; i<=MAX_SAYFA; i++) {
        let img = document.createElement("img");
        let rawBase = `https://cdn.jsdelivr.net/gh/${veri.u}/${veri.r}/${klasorYolu}${b}/`;
        
        img.dataset.sayi = i;
        img.dataset.rawbase = rawBase;
        
        img.src = createUrl(rawBase, i, ".jpg");
        img.loading = "lazy";

        img.onerror = function() {
            let sayi = this.dataset.sayi;
            let raw = this.dataset.rawbase;
            if(!this.src.includes(sayi.toString().padStart(2,'0') + ".jpg")) {
                this.src = createUrl(raw, sayi.toString().padStart(2,'0'), ".jpg");
            } else { this.remove(); }
        };
        box.appendChild(img);
    }
}

function createUrl(baseUrl, number, ext) {
    let fullPath = baseUrl + number + ext + "?v=" + CACHE_ID;
    if (IS_MOBILE) return `https://wsrv.nl/?url=${encodeURIComponent(fullPath)}&w=800&output=jpg`;
    else return fullPath;
}

function sonraki() { 
    const cSel = document.getElementById('cSelect');
    if(cSel.selectedIndex < cSel.options.length-1) { cSel.selectedIndex++; resimGetir(); } 
    else { alert("Bölüm Bitti!"); closeReader(); } 
                }
