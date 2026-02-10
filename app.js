const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100;
let ARSIV = {}; 
let currentManga = null;

// 1. CSV OKU VE LİSTELE
document.addEventListener("DOMContentLoaded", () => {
    fetch('liste.csv?t=' + CACHE_ID).then(r => r.text()).then(t => {
        const grid = document.getElementById('manga-list');
        grid.innerHTML = ""; 
        
        // --- DÜZELTME BURADA ---
        // split('\n') ile satırlara bölüyoruz.
        // .slice(1) diyerek EN ÜSTTEKİ başlık satırını (İsim, Klasör...) atıyoruz.
        let rows = t.split('\n').slice(1); 

        rows.forEach((l) => {
            let d = l.split(',').map(x => x.trim());
            
            // Eğer satır boşsa atla (Uzunluk kontrolü)
            if(d.length < 5) return; 

            // CSV SÜTUNLARI: 
            // 0:İsim, 1:Klasör, 2:User, 3:Repo, 4:Aralık, 
            // 5:Kapak, 6:Banner, 7:Tür, 8:Durum, 9:Yazar, 10:Özet
            let [isim, klasor, user, repo, aralik, kapak, banner, tur, durum, yazar, ozet] = d;

            // Veri Eksikse Doldur (Hata vermesin diye)
            if(!kapak) kapak = "https://via.placeholder.com/200x300";
            if(!banner || banner === "") banner = kapak; 
            if(!ozet) ozet = "Özet bilgisi girilmedi.";
            if(!yazar) yazar = "Bilinmiyor";

            // Arşive Kaydet
            if(!ARSIV[isim]) ARSIV[isim] = { 
                bolumler: [], u: user, r: repo, k: klasor, 
                meta: { kapak, tur, durum, yazar, banner, ozet }
            };
            
            // Bölüm Sayılarını Hesapla
            let baslangic, bitis;
            if (aralik.includes('-')) {
                let p = aralik.split('-');
                baslangic = parseInt(p[0]); bitis = parseInt(p[1]);
            } else {
                baslangic = parseInt(aralik); bitis = parseInt(aralik);
            }
            for(let i=baslangic; i<=bitis; i++) ARSIV[isim].bolumler.push(i);
            ARSIV[isim].bolumler.sort((a,b) => a - b); 

            // Kart HTML Oluştur
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
                    <div class="card-genre">${tur || 'Manga'}</div>
                </div>
            </div>`;
            grid.innerHTML += cardHtml;
        });
    });
});

// 2. DETAY SAYFASINI AÇ
function openDetail(isim) {
    currentManga = isim;
    let data = ARSIV[isim];
    if(!data) {
        console.error("Manga verisi bulunamadı:", isim);
        return;
    }

    // Verileri Yerleştir
    document.getElementById('detail-bg').style.backgroundImage = `url('${data.meta.banner}')`;
    document.getElementById('detail-cover-img').src = data.meta.kapak;
    document.getElementById('detail-title-text').innerText = isim;
    document.getElementById('detail-author').innerText = data.meta.yazar;
    document.getElementById('detail-genre').innerText = data.meta.tur;
    document.getElementById('detail-summary').innerText = data.meta.ozet;
    document.getElementById('chapter-count').innerText = data.bolumler.length + " Bölüm";

    // Bölüm Listesini Oluştur
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

    // Ekranı Değiştir
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    window.scrollTo(0,0);
}

function closeDetail() {
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
}

// 3. OKUYUCU MODUNU AÇ
function openReader(isim, bolumNo = null) {
    if(bolumNo === null) bolumNo = ARSIV[isim].bolumler[0];

    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'block';
    
    // Select Kutusunu Doldur
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
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block'; 
    document.getElementById('box').innerHTML = ""; 
}

function resimGetir() {
    const box = document.getElementById('box');
    const b = document.getElementById('cSelect').value;
    let veri = ARSIV[currentManga];
    
    box.innerHTML = "<div style='text-align:center; padding:50px; color:#888;'>Yükleniyor...</div>";
    // Okuyucunun tepesine git
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
    else { alert("Bölüm Bitti!"); } 
                }
