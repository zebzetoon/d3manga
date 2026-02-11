const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100;
let ARSIV = {}; 
let currentSeri = null;
let sliderInterval = null;

const CUSDIS_APP_ID = "BURAYA-UZUN-KODU-YAPISTIR"; 

function shuffleArray(array) {
    let cur = array.length, ran;
    while (cur != 0) {
        ran = Math.floor(Math.random() * cur); cur--;
        [array[cur], array[ran]] = [array[ran], array[cur]];
    }
    return array;
}

window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const seri = urlParams.get('seri'), bolum = urlParams.get('bolum');
    if (seri && ARSIV[seri]) bolum ? openReader(seri, bolum, false) : openDetail(seri, false);
    else closeDetail(false);
});

document.addEventListener("DOMContentLoaded", () => {
    fetch('liste.csv?t=' + CACHE_ID).then(r => r.text()).then(t => {
        const grid = document.getElementById('manga-list');
        grid.innerHTML = ""; 
        let rows = t.split('\n');
        if (rows.length > 0) rows.shift(); 

        rows.forEach((l) => {
            let d = l.split(',').map(x => x.trim());
            if(d.length < 5 || d[0].toLowerCase().includes("isim") || d[0] === "") return;
            let [isim, klasor, user, repo, aralik, kapak, banner, tur, durum, yazar, ozet] = d;
            
            ARSIV[isim] = { 
                bolumler: [], u: user, r: repo, k: klasor, 
                meta: { kapak, tur, durum, yazar, banner, ozet: ozet || "Açıklama yükleniyor..." }
            };
            
            let range = aralik.includes('-') ? aralik.split('-') : [aralik, aralik];
            for(let i=parseInt(range[0]); i<=parseInt(range[1]); i++) ARSIV[isim].bolumler.push(i);
            ARSIV[isim].bolumler.sort((a,b) => a - b); 

            grid.innerHTML += `<div class="manga-card" onclick="openDetail('${isim}')"><div class="card-img-container"><div class="tag tag-status ${durum.includes('Tamam') ? 'tag-completed':'tag-ongoing'}">${durum}</div><img src="${kapak}" class="card-img"></div><div class="card-info"><div class="card-title">${isim}</div><div class="card-genre">${tur}</div></div></div>`;
        });

        let allKeys = Object.keys(ARSIV);
        if(allKeys.length > 0) initSlider(shuffleArray(allKeys.map(k => ({isim: k, meta: ARSIV[k].meta}))).slice(0, 5));

        const urlParams = new URLSearchParams(window.location.search);
        const s = urlParams.get('seri'), b = urlParams.get('bolum');
        if (s && ARSIV[s]) b ? openReader(s, b, false) : openDetail(s, false);
    });
});

function initSlider(items) {
    const wrapper = document.getElementById('hero-wrapper'), dots = document.getElementById('slider-dots');
    wrapper.innerHTML = ""; dots.innerHTML = "";
    items.forEach((item, i) => {
        wrapper.innerHTML += `<div class="hero-slide ${i===0?'active':''}"><img src="${item.meta.banner}" class="slide-bg"><div class="slide-content"><div class="slide-info"><div class="slide-badge"><i class="fas fa-fire"></i> TREND #${i+1}</div><div class="slide-title">${item.isim}</div><div class="slide-desc">${item.meta.ozet}</div><button class="slide-btn" onclick="openDetail('${item.isim}')">Okumaya Başla</button></div><img src="${item.meta.kapak}" class="slide-poster"></div></div>`;
        dots.innerHTML += `<div class="dot ${i===0?'active':''}" onclick="changeSlide(${i})"></div>`;
    });
    startSliderTimer(items.length);
}

let currentIdx = 0;
function changeSlide(idx) {
    const s = document.querySelectorAll('.hero-slide'), d = document.querySelectorAll('.dot');
    if(!s[idx]) return;
    s[currentIdx].classList.remove('active'); d[currentIdx].classList.remove('active');
    currentIdx = idx;
    s[currentIdx].classList.add('active'); d[currentIdx].classList.add('active');
}

function startSliderTimer(total) {
    clearInterval(sliderInterval);
    sliderInterval = setInterval(() => changeSlide((currentIdx + 1) % total), 6000);
}

// "OKUMAYA BAŞLA" BUTONU İÇİN ÖZEL FONKSİYON
function startReading() {
    if(currentSeri && ARSIV[currentSeri]) {
        // Listenin en başındaki (ilk) bölümü açar
        openReader(currentSeri, ARSIV[currentSeri].bolumler[0]);
    }
}

function openDetail(isim, push = true) {
    currentSeri = isim; let data = ARSIV[isim];
    if (push) window.history.pushState({}, '', `?seri=${encodeURIComponent(isim)}`);
    document.getElementById('detail-bg').style.backgroundImage = `url('${data.meta.banner}')`;
    document.getElementById('detail-cover-img').src = data.meta.kapak;
    document.getElementById('detail-title-text').innerText = isim;
    document.getElementById('detail-author').innerText = data.meta.yazar;
    document.getElementById('detail-genre').innerText = data.meta.tur;
    document.getElementById('detail-summary').innerText = data.meta.ozet;
    document.getElementById('chapter-count').innerText = data.bolumler.length + " Bölüm";
    const box = document.getElementById('chapter-list-box'); box.innerHTML = "";
    [...data.bolumler].reverse().forEach(b => {
        box.innerHTML += `<div class="chapter-item" onclick="openReader('${isim}', ${b})"><div><div class="chapter-name">Bölüm ${b}</div><div class="chapter-date">Yayında</div></div><i class="fas fa-chevron-right"></i></div>`;
    });
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    document.getElementById('reader-view').style.display = 'none';
    loadCusdis("seri_" + isim, isim, "cusdis_series");
    window.scrollTo(0,0);
}

function closeDetail(push = true) {
    if (push) window.history.pushState({}, '', window.location.pathname);
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
}

function openReader(isim, no, push = true) {
    if (push) window.history.pushState({}, '', `?seri=${encodeURIComponent(isim)}&bolum=${no}`);
    currentSeri = isim;
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'block';
    const sel = document.getElementById('cSelect'); sel.innerHTML = "";
    ARSIV[isim].bolumler.forEach(b => sel.add(new Option("Bölüm " + b, b)));
    sel.value = no;
    resimGetir();
    loadCusdis("bolum_"+isim+"_"+no, isim+" Bölüm "+no, "cusdis_chapter");
}

function closeReader() { openDetail(currentSeri, true); }

function resimGetir() {
    const box = document.getElementById('box'), loader = document.getElementById('reader-loader'), b = document.getElementById('cSelect').value, v = ARSIV[currentSeri];
    box.innerHTML = ""; loader.style.display = "flex"; // Yükleme ikonu aç
    document.getElementById('reader-view').scrollTop = 0;

    let loadedCount = 0;
    for(let i=1; i<=MAX_SAYFA; i++) {
        let img = document.createElement("img");
        let path = `https://cdn.jsdelivr.net/gh/${v.u}/${v.r}/${v.k==='.'?'':v.k+'/'}${b}/${i}.jpg`;
        img.src = IS_MOBILE ? `https://wsrv.nl/?url=${encodeURIComponent(path)}&w=800&output=jpg` : path;
        
        img.onload = () => { 
            loadedCount++; 
            if(loadedCount > 2) loader.style.display = "none"; // Birkaç resim inince ikon gizle
        };
        img.onerror = function() { this.remove(); if(box.children.length === 0) loader.style.display = "none"; };
        box.appendChild(img);
    }
}

// YENİ NAVİGASYON MANTIGI
function sonraki() { 
    const s = document.getElementById('cSelect');
    if(s.selectedIndex < s.options.length-1) { s.selectedIndex++; resimGetir(); } 
    else alert("Son bölüme geldiniz!");
}

function onceki() { 
    const s = document.getElementById('cSelect');
    if(s.selectedIndex > 0) { 
        s.selectedIndex--; 
        resimGetir(); 
    } else {
        // Eğer 1. bölümdeysek Seri sayfasına döner
        closeReader();
    }
}

function loadCusdis(id, title, cont) {
    const target = document.getElementById(cont); if (!target) return;
    target.innerHTML = `<div id="cusdis_thread" data-host="https://cusdis.com" data-app-id="${CUSDIS_APP_ID}" data-page-id="${id}" data-page-url="${window.location.href}" data-page-title="${title}" data-theme="dark" data-lang="tr"></div>`; 
    if (window.CUSDIS) window.CUSDIS.initial();
    else { let s = document.createElement("script"); s.src = "https://cusdis.com/js/cusdis.es.js"; s.async = true; document.body.appendChild(s); }
}
    
