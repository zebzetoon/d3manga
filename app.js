const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100;
let ARSIV = {}; 
let currentSeri = null;

// 1. BAŞLANGIÇ: CSV OKU VE URL KONTROL ET
document.addEventListener("DOMContentLoaded", () => {
    fetch('liste.csv?t=' + CACHE_ID).then(r => r.text()).then(t => {
        const grid = document.getElementById('manga-list');
        grid.innerHTML = ""; 
        
        // Satırlara böl
        let rows = t.split('\n');

        // --- GÜVENLİK DUVARI 1: İLK SATIRI DİREKT SİL ---
        // Excel başlık satırını hafızadan siliyoruz.
        if (rows.length > 0) rows.shift(); 

        rows.forEach((l) => {
            let d = l.split(',').map(x => x.trim());
            
            // --- GÜVENLİK DUVARI 2: BOŞ SATIRLARI ATLA ---
            if(d.length < 5) return;

            // --- GÜVENLİK DUVARI 3: İÇERİK KONTROLÜ ---
            // Eğer ilk sütun hala "İsim" ise veya boşsa atla
            let kontrolIsim = d[0].toLowerCase().replace(/[^a-z0-9]/g, ""); // Gizli karakterleri temizle
            if (kontrolIsim === "isim" || d[0] === "") return;

            // CSV SÜTUNLARI
            let [isim, klasor, user, repo, aralik, kapak, banner, tur, durum, yazar, ozet] = d;

            // --- GÜVENLİK DUVARI 4: "ARALIK" KONTROLÜ ---
            // Eğer 5. sütun (Aralık) bir sayı veya "1-10" gibi bir şey değilse, bu bir başlıktır. Atla.
            // Başlık satırında burada "Aralık" yazar, sayı yazmaz.
            if (isNaN(parseInt(aralik))) return;


            // Veri Kontrolü (Eksikleri tamamla)
            if(!kapak) kapak = "https://via.placeholder.com/200x300";
            if(!banner || banner === "") banner = kapak; 
            if(!ozet) ozet = "Özet bilgisi girilmedi.";
            if(!yazar) yazar = "Anonim";

            // Arşive Kaydet
            if(!ARSIV[isim]) ARSIV[isim] = { 
                bolumler: [], u: user, r: repo, k: klasor, 
                meta: { kapak, tur, durum, yazar, banner, ozet }
            };
            
            // Bölüm Hesapla
            let baslangic, bitis;
            if (aralik.includes('-')) {
                let p = aralik.split('-');
                baslangic = parseInt(p[0]); bitis = parseInt(p[1]);
            } else {
                baslangic = parseInt(aralik); bitis = parseInt(aralik);
            }
            for(let i=baslangic; i<=bitis; i++) ARSIV[isim].bolumler.push(i);
            ARSIV[isim].bolumler.sort((a,b) => a - b); 

            // Kart HTML
            let durumHtml = "";
            if(durum && durum.toLowerCase().includes("tamam")) {
                durumHtml = `<div class="tag tag-status tag-completed">Tamamlandı</div>`;
            } else {
                durumHtml = `<div class="tag tag-status tag-ongoing">Devam Ediyor</div>`;
            }

            let cardHtml = `
            <div class="manga-card" onclick="openDetail('${isim}')">
                <div class="card-img-container">
                    ${durumHtml}
                    <div class="tag tag-new">Yeni</div>
                    <img src="${kapak}" class="card-img" loading="lazy">
                </div>
                <div class="card-info">
                    <div class="card-title">${isim}</div>
                    <div class="card-genre">${tur || 'Seri'}</div>
                </div>
            </div>`;
            grid.innerHTML += cardHtml;
        });

        // --- URL KONTROLÜ ---
        const urlParams = new URLSearchParams(window.location.search);
        const urlSeri = urlParams.get('seri');
        const urlBolum = urlParams.get('bolum');

        if (urlSeri && ARSIV[urlSeri]) {
            if (urlBolum) {
                openReader(urlSeri, urlBolum);
            } else {
                openDetail(urlSeri);
            }
        }

    });
});

// 2. DETAY SAYFASINI AÇ
function openDetail(isim) {
    currentSeri = isim;
    let data = ARSIV[isim];
    if(!data) return;

    // URL GÜNCELLEME
    const newUrl = `?seri=${encodeURIComponent(isim)}`;
    window.history.pushState({path: newUrl}, '', newUrl);

    // Verileri Doldur
    document.getElementById('detail-bg').style.backgroundImage = `url('${data.meta.banner}')`;
    document.getElementById('detail-cover-img').src = data.meta.kapak;
    document.getElementById('detail-title-text').innerText = isim;
    document.getElementById('detail-author').innerText = data.meta.yazar;
    document.getElementById('detail-genre').innerText = data.meta.tur;
    document.getElementById('detail-summary').innerText = data.meta.ozet;
    document.getElementById('chapter-count').innerText = data.bolumler.length + " Bölüm";

    const listContainer = document.getElementById('chapter-list-box');
    listContainer.innerHTML = "";
    
    [...data.bolumler].reverse().forEach(b => {
        let item = document.createElement("div");
        item.className = "chapter-item";
        item.innerHTML = `
            <div>
                <div class="chapter-name">Bölüm ${b}</div>
                <div class="chapter-date">Yayında</div>
            </div>
            <i class="fas fa-chevron-right" style="color:#555;"></i>
        `;
        item.onclick = () => openReader(isim, b);
        listContainer.appendChild(item);
    });

    document.getElementById('home-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    window.scrollTo(0,0);
}

function closeDetail() {
    const baseUrl = window.location.pathname;
    window.history.pushState({}, '', baseUrl);

    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
}

// 3. OKUYUCU MODUNU AÇ
function openReader(isim, bolumNo = null) {
    if(bolumNo === null) bolumNo = ARSIV[isim].bolumler[0];

    const newUrl = `?seri=${encodeURIComponent(isim)}&bolum=${bolumNo}`;
    window.history.pushState({path: newUrl}, '', newUrl);

    currentSeri = isim; 

    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'block';
    
    const cSel = document.getElementById('cSelect');
    cSel.innerHTML = "";
    ARSIV[isim].bolumler.forEach(b => {
        let o = document.createElement("option"); o.text = "Bölüm " + b; o.value = b; 
        if(b == bolumNo) o.selected = true;
        cSel.add(o);
    });
    
    resimGetir();
}

function closeReader() {
    const newUrl = `?seri=${encodeURIComponent(currentSeri)}`;
    window.history.pushState({path: newUrl}, '', newUrl);

    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block'; 
    document.getElementById('box').innerHTML = ""; 
}

function resimGetir() {
    const box = document.getElementById('box');
    const b = document.getElementById('cSelect').value;
    let veri = ARSIV[currentSeri];
    
    const newUrl = `?seri=${encodeURIComponent(currentSeri)}&bolum=${b}`;
    window.history.pushState({path: newUrl}, '', newUrl);

    box.innerHTML = "<div style='text-align:center; padding:50px; color:#888;'>Yükleniyor...</div>";
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
    else { alert("Bitti!"); } 
}
