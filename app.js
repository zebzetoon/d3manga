const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100;
let ARSIV = {}; 
let currentSeri = null;

// --- 1. GERİ TUŞU DİNLEYİCİSİ (SİHİRLİ KOD) ---
// Tarayıcının veya telefonun geri tuşuna basıldığında burası çalışır
window.addEventListener('popstate', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSeri = urlParams.get('seri');
    const urlBolum = urlParams.get('bolum');

    // Eğer URL'de seri varsa detay veya okuyucuyu aç
    if (urlSeri && ARSIV[urlSeri]) {
        if (urlBolum) {
            // false = Geçmişe ekleme yapma, sadece ekranı aç
            openReader(urlSeri, urlBolum, false); 
        } else {
            openDetail(urlSeri, false);
        }
    } else {
        // URL boşsa ana sayfaya dön
        closeDetail(false);
    }
});

// --- 2. CSV OKUMA VE BAŞLANGIÇ ---
document.addEventListener("DOMContentLoaded", () => {
    fetch('liste.csv?t=' + CACHE_ID).then(r => r.text()).then(t => {
        const grid = document.getElementById('manga-list');
        grid.innerHTML = ""; 
        
        let rows = t.split('\n');

        // GÜVENLİK 1: En üstteki satırı direk çöpe at (Başlık satırı)
        if (rows.length > 0) rows.shift(); 

        rows.forEach((l) => {
            let d = l.split(',').map(x => x.trim());
            
            // GÜVENLİK 2: Satır çok kısaysa atla
            if(d.length < 5) return;

            let [isim, klasor, user, repo, aralik, kapak, banner, tur, durum, yazar, ozet] = d;

            // GÜVENLİK 3: "Aralık" kısmı sayı değilse bu bir başlıktır, ATLA!
            // Başlık satırında "Aralık" yazar (Not a Number), gerçek seride "1" veya "1-10" yazar.
            if (isNaN(parseInt(aralik))) return;

            // Veri Tamamlama
            if(!kapak) kapak = "https://via.placeholder.com/200x300";
            if(!banner || banner === "") banner = kapak; 
            if(!ozet) ozet = "Özet bilgisi girilmedi.";
            if(!yazar) yazar = "Anonim";

            // Arşive Ekle
            if(!ARSIV[isim]) ARSIV[isim] = { 
                bolumler: [], u: user, r: repo, k: klasor, 
                meta: { kapak, tur, durum, yazar, banner, ozet }
            };
            
            // Bölümleri Hesapla
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
            let durumHtml = durum && durum.toLowerCase().includes("tamam") ? 
                `<div class="tag tag-status tag-completed">Tamamlandı</div>` : 
                `<div class="tag tag-status tag-ongoing">Devam Ediyor</div>`;

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

        // Site ilk açıldığında URL kontrolü (F5 atınca doğru yerde açılması için)
        const urlParams = new URLSearchParams(window.location.search);
        const urlSeri = urlParams.get('seri');
        const urlBolum = urlParams.get('bolum');

        if (urlSeri && ARSIV[urlSeri]) {
            if (urlBolum) {
                openReader(urlSeri, urlBolum, false);
            } else {
                openDetail(urlSeri, false);
            }
        }
    });
});

// --- 3. FONKSİYONLAR (Geri Tuşu Destekli) ---

// historyEkle: true ise URL'yi değiştirir (Tıklama), false ise değiştirmez (Geri tuşu)
function openDetail(isim, historyEkle = true) {
    currentSeri = isim;
    let data = ARSIV[isim];
    if(!data) return;

    if (historyEkle) {
        const newUrl = `?seri=${encodeURIComponent(isim)}`;
        window.history.pushState({path: newUrl}, '', newUrl);
    }

    // Ekranı Doldur
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

    // Görünümü Değiştir
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    
    // Sadece tıklayarak geldiysek yukarı kaydır, geri tuşuyla geldiysek elleme
    if(historyEkle) window.scrollTo(0,0);
}

function closeDetail(historyEkle = true) {
    if (historyEkle) {
        const baseUrl = window.location.pathname;
        window.history.pushState({}, '', baseUrl);
    }

    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
}

function openReader(isim, bolumNo = null, historyEkle = true) {
    if(bolumNo === null) bolumNo = ARSIV[isim].bolumler[0];

    if (historyEkle) {
        const newUrl = `?seri=${encodeURIComponent(isim)}&bolum=${bolumNo}`;
        window.history.pushState({path: newUrl}, '', newUrl);
    }

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
    
    // Resimleri Getir (History false ise tekrar pushState yapmaz)
    resimGetir(false); 
    
    if(historyEkle) document.getElementById('reader-view').scrollTop = 0;
}

function closeReader() {
    // Okuyucudan çıkınca detay sayfasına dönülür
    // Bu manuel bir işlem olduğu için historyEkle = true
    openDetail(currentSeri, true);
}

function resimGetir(historyEkle = true) {
    const box = document.getElementById('box');
    const b = document.getElementById('cSelect').value;
    let veri = ARSIV[currentSeri];
    
    // Bölüm seçiciden değiştirilirse URL güncellensin
    if (historyEkle) {
        const newUrl = `?seri=${encodeURIComponent(currentSeri)}&bolum=${b}`;
        window.history.pushState({path: newUrl}, '', newUrl);
    }

    box.innerHTML = "<div style='text-align:center; padding:50px; color:#888;'>Yükleniyor...</div>";
    
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
