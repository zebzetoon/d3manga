const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100;
let ARSIV = {}; 
let currentSeri = null;
let sliderInterval = null;

// ==========================================
// CUSDIS AYARLARI (BURAYI DOLDUR!)
// ==========================================
const CUSDIS_APP_ID = "BURAYA-UZUN-KODU-YAPISTIR"; 

// --- RASTGELE SIRALAMA YARDIMCISI ---
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// --- 1. GERİ TUŞU DİNLEYİCİSİ ---
window.addEventListener('popstate', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSeri = urlParams.get('seri');
    const urlBolum = urlParams.get('bolum');

    if (urlSeri && ARSIV[urlSeri]) {
        if (urlBolum) openReader(urlSeri, urlBolum, false); 
        else openDetail(urlSeri, false);
    } else {
        closeDetail(false);
    }
});

// --- 2. CSV OKUMA VE BAŞLANGIÇ ---
document.addEventListener("DOMContentLoaded", () => {
    fetch('liste.csv?t=' + CACHE_ID).then(r => r.text()).then(t => {
        const grid = document.getElementById('manga-list');
        grid.innerHTML = ""; 
        
        let rows = t.split('\n');
        if (rows.length > 0) rows.shift(); 

        rows.forEach((l) => {
            let d = l.split(',').map(x => x.trim());
            if(d.length < 5) return;
            let kontrolIsim = d[0].toLowerCase().replace(/[^a-z0-9]/g, "");
            if (kontrolIsim === "isim" || d[0] === "") return;

            let [isim, klasor, user, repo, aralik, kapak, banner, tur, durum, yazar, ozet] = d;
            if (isNaN(parseInt(aralik))) return;

            if(!kapak) kapak = "https://via.placeholder.com/200x300";
            if(!banner || banner === "") banner = kapak; 
            if(!ozet) ozet = "Özet bilgisi girilmedi.";
            if(!yazar) yazar = "Anonim";

            if(!ARSIV[isim]) ARSIV[isim] = { 
                bolumler: [], u: user, r: repo, k: klasor, 
                meta: { kapak, tur, durum, yazar, banner, ozet }
            };
            
            let baslangic, bitis;
            if (aralik.includes('-')) {
                let p = aralik.split('-');
                baslangic = parseInt(p[0]); bitis = parseInt(p[1]);
            } else {
                baslangic = parseInt(aralik); bitis = parseInt(aralik);
            }
            for(let i=baslangic; i<=bitis; i++) ARSIV[isim].bolumler.push(i);
            ARSIV[isim].bolumler.sort((a,b) => a - b); 

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

        // SLIDER BAŞLAT (Rastgele 5 Seri Seç)
        let allSeriesArray = Object.keys(ARSIV).map(key => ({ isim: key, meta: ARSIV[key].meta }));
        let random5 = shuffleArray(allSeriesArray).slice(0, 5);
        initSlider(random5);

        const urlParams = new URLSearchParams(window.location.search);
        const urlSeri = urlParams.get('seri');
        const urlBolum = urlParams.get('bolum');
        if (urlSeri && ARSIV[urlSeri]) {
            if (urlBolum) openReader(urlSeri, urlBolum, false);
            else openDetail(urlSeri, false);
        }
    });
});

// --- SLIDER FONKSİYONLARI ---
function initSlider(items) {
    const wrapper = document.getElementById('hero-wrapper');
    const dotsContainer = document.getElementById('slider-dots');
    if(!wrapper || items.length === 0) return;
    wrapper.innerHTML = ""; dotsContainer.innerHTML = "";
    items.forEach((item, index) => {
        let activeClass = index === 0 ? 'active' : '';
        wrapper.innerHTML += `
        <div class="hero-slide ${activeClass}">
            <img src="${item.meta.banner}" class="slide-bg">
            <div class="slide-content">
                <img src="${item.meta.kapak}" class="slide-poster">
                <div class="slide-info">
                    <div class="slide-badge"><i class="fas fa-crown"></i> GÜNÜN SERİSİ</div>
                    <div class="slide-title">${item.isim}</div>
                    <div class="slide-desc">${item.meta.ozet}</div>
                    <button class="slide-btn" onclick="openDetail('${item.isim}')">
                        <i class="fas fa-play"></i> Okumaya Başla
                    </button>
                </div>
            </div>
        </div>`;
        dotsContainer.innerHTML += `<div class="dot ${activeClass}" onclick="changeSlide(${index})"></div>`;
    });
    startSliderTimer(items.length);
}

let currentSlideIndex = 0;
function changeSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    if(slides.length === 0) return;
    slides[currentSlideIndex].classList.remove('active');
    dots[currentSlideIndex].classList.remove('active');
    currentSlideIndex = index;
    slides[currentSlideIndex].classList.add('active');
    dots[currentSlideIndex].classList.add('active');
    clearInterval(sliderInterval);
    startSliderTimer(slides.length);
}

function startSliderTimer(total) {
    sliderInterval = setInterval(() => {
        let nextIndex = (currentSlideIndex + 1) % total;
        changeSlide(nextIndex);
    }, 5000); 
}

// --- DİĞER FONKSİYONLAR ---
function openDetail(isim, historyEkle = true) {
    currentSeri = isim;
    let data = ARSIV[isim];
    if(!data) return;
    if (historyEkle) {
        const newUrl = `?seri=${encodeURIComponent(isim)}`;
        window.history.pushState({path: newUrl}, '', newUrl);
    }
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
        item.innerHTML = `<div><div class="chapter-name">Bölüm ${b}</div><div class="chapter-date">Yayında</div></div><i class="fas fa-chevron-right" style="color:#555;"></i>`;
        item.onclick = () => openReader(isim, b);
        listContainer.appendChild(item);
    });
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    loadCusdis("seri_" + isim, isim, "cusdis_series");
    if(historyEkle) window.scrollTo(0,0);
}

function closeDetail(historyEkle = true) {
    if (historyEkle) window.history.pushState({}, '', window.location.pathname);
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
    resimGetir(false); 
    loadCusdis("bolum_" + isim + "_" + bolumNo, isim + " Bölüm " + bolumNo, "cusdis_chapter");
    if(historyEkle) document.getElementById('reader-view').scrollTop = 0;
}

function closeReader() { openDetail(currentSeri, true); }

function resimGetir(historyEkle = true) {
    const box = document.getElementById('box');
    const b = document.getElementById('cSelect').value;
    let veri = ARSIV[currentSeri];
    if (historyEkle) {
        const newUrl = `?seri=${encodeURIComponent(currentSeri)}&bolum=${b}`;
        window.history.pushState({path: newUrl}, '', newUrl);
        loadCusdis("bolum_" + currentSeri + "_" + b, currentSeri + " Bölüm " + b, "cusdis_chapter");
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

function loadCusdis(pageId, pageTitle, containerId) {
    document.getElementById("cusdis_series").innerHTML = "";
    document.getElementById("cusdis_chapter").innerHTML = "";
    let target = document.getElementById(containerId);
    if (!target) return;
    target.innerHTML = `<div id="cusdis_thread" data-host="https://cusdis.com" data-app-id="${CUSDIS_APP_ID}" data-page-id="${pageId}" data-page-url="${window.location.href}" data-page-title="${pageTitle}" data-theme="dark" data-lang="tr"></div>`; 
    if (window.CUSDIS) { window.CUSDIS.initial(); } 
    else { let script = document.createElement("script"); script.src = "https://cusdis.com/js/cusdis.es.js"; script.async = true; document.body.appendChild(script); }
        }
