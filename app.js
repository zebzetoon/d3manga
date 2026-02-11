const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100;
let ARSIV = {}; 
let currentSeri = null;
let sliderInterval = null;
let sortDesc = true; 

// ==========================================
const CUSDIS_APP_ID = "BURAYA-UZUN-KODU-YAPISTIR"; 
// ==========================================

function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const seri = urlParams.get('seri');
    const bolum = urlParams.get('bolum');
    if (seri && ARSIV[seri]) {
        if (bolum) openReader(seri, bolum, false);
        else openDetail(seri, false);
    } else {
        closeDetail(false);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    fetch('liste.csv?t=' + CACHE_ID).then(r => r.text()).then(t => {
        const listContainer = document.getElementById('manga-list');
        listContainer.innerHTML = ""; 
        let rows = t.split('\n');
        if (rows.length > 0) rows.shift(); 

        rows.forEach((l) => {
            let d = l.split(',').map(x => x.trim());
            if(d.length < 5 || d[0] === "" || d[0].toLowerCase().includes("isim")) return;

            let [isim, klasor, user, repo, aralik, kapak, banner, tur, durum, yazar, ozet] = d;
            if (isNaN(parseInt(aralik))) return;
            if(!kapak) kapak = "https://via.placeholder.com/200x300";
            if(!banner) banner = kapak; 

            ARSIV[isim] = { 
                bolumler: [], u: user, r: repo, k: klasor, 
                meta: { kapak, tur, durum, yazar, banner, ozet: ozet || "Açıklama bulunamadı." }
            };
            
            let range = aralik.includes('-') ? aralik.split('-') : [aralik, aralik];
            for(let i=parseInt(range[0]); i<=parseInt(range[1]); i++) ARSIV[isim].bolumler.push(i);
            ARSIV[isim].bolumler.sort((a,b) => a - b); 

            // --- YENİ LİSTE GÖRÜNÜMÜ OLUŞTURUCU ---
            // Son 2 bölümü bul
            let sonBolumler = [...ARSIV[isim].bolumler].reverse().slice(0, 2);
            let bolumListesiHTML = "";

            sonBolumler.forEach((b, index) => {
                // En son bölüme "YENİ" etiketi, eskilere normal
                let badge = index === 0 ? `<span class="badge-new highlight">YENİ</span>` : `<span class="badge-new">OKU</span>`;
                
                bolumListesiHTML += `
                <div class="mini-chapter-item" onclick="event.stopPropagation(); openReader('${isim}', ${b})">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-fire" style="color:#ff0055; font-size:10px;"></i> 
                        Bölüm ${b}
                    </div>
                    ${badge}
                </div>`;
            });

            // Kart HTML (Liste Tipinde)
            let itemHtml = `
            <div class="manga-list-item" onclick="openDetail('${isim}')">
                <div class="list-poster-area">
                    <img src="${kapak}" class="list-poster" loading="lazy">
                </div>
                <div class="list-content-area">
                    <div class="list-title">${isim}</div>
                    <div class="list-rating">
                        <i class="fas fa-star"></i> 9.8 
                        <span style="color:#666; margin-left:5px;">• ${tur}</span>
                    </div>
                    <div class="mini-chapter-list">
                        ${bolumListesiHTML}
                    </div>
                </div>
            </div>`;
            
            listContainer.innerHTML += itemHtml;
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
        wrapper.innerHTML += `<div class="hero-slide ${i===0?'active':''}"><img src="${item.meta.banner}" class="slide-bg"><div class="slide-content"><div class="slide-info"><div class="slide-badge"><i class="fas fa-crown"></i> GÜNÜN SERİSİ</div><div class="slide-title">${item.isim}</div><div class="slide-desc">${item.meta.ozet}</div><button class="slide-btn" onclick="openDetail('${item.isim}')">İncele</button></div><img src="${item.meta.kapak}" class="slide-poster"></div></div>`;
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

// --- SIRALAMA VE DETAY GÖSTERİMİ ---
function toggleSort() {
    sortDesc = !sortDesc;
    const icon = document.getElementById('sort-icon');
    if(sortDesc) {
        icon.className = "fas fa-sort-numeric-down-alt"; 
    } else {
        icon.className = "fas fa-sort-numeric-down"; 
    }
    if(currentSeri) renderChapterList(currentSeri);
}

function openDetail(isim, push = true) {
    currentSeri = isim;
    sortDesc = true; 
    
    const icon = document.getElementById('sort-icon');
    if(icon) icon.className = "fas fa-sort-numeric-down-alt";

    let data = ARSIV[isim];
    if (push) window.history.pushState({}, '', `?seri=${encodeURIComponent(isim)}`);

    document.getElementById('detail-bg').style.backgroundImage = `url('${data.meta.banner}')`;
    document.getElementById('detail-cover-img').src = data.meta.kapak;
    document.getElementById('detail-title-text').innerText = isim;
    document.getElementById('detail-author').innerText = data.meta.yazar;
    document.getElementById('detail-genre').innerText = data.meta.tur;
    document.getElementById('detail-summary').innerText = data.meta.ozet;
    document.getElementById('chapter-count').innerText = data.bolumler.length + " Bölüm";

    renderChapterList(isim);

    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    document.getElementById('reader-view').style.display = 'none';
    loadCusdis("seri_" + isim, isim, "cusdis_series");
    if(push) window.scrollTo(0,0);
}

function renderChapterList(isim) {
    const box = document.getElementById('chapter-list-box');
    const expandBtn = document.getElementById('expand-btn');
    box.innerHTML = "";
    
    let data = ARSIV[isim];
    let sortedList = [...data.bolumler];
    if(sortDesc) {
        sortedList.reverse(); 
    }

    const GORUNEN_LIMIT = 5;

    sortedList.forEach((b, index) => {
        let hiddenClass = index >= GORUNEN_LIMIT ? 'hidden-chapter' : '';
        box.innerHTML += `
        <div class="chapter-item ${hiddenClass}" onclick="openReader('${isim}', ${b})">
            <div>
                <div class="chapter-name">Bölüm ${b}</div>
                <div class="chapter-date">Yayında</div>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>`;
    });

    if (sortedList.length > GORUNEN_LIMIT) {
        expandBtn.style.display = "flex";
    } else {
        expandBtn.style.display = "none";
    }
}

function expandChapters() {
    const hiddenItems = document.querySelectorAll('.hidden-chapter');
    hiddenItems.forEach(item => {
        item.classList.remove('hidden-chapter');
    });
    document.getElementById('expand-btn').style.display = "none";
}

function closeDetail(push = true) {
    if (push) window.history.pushState({}, '', window.location.pathname);
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
}

function startReading() {
    if(currentSeri && ARSIV[currentSeri]) openReader(currentSeri, ARSIV[currentSeri].bolumler[0]);
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
    box.innerHTML = ""; loader.style.display = "flex"; document.getElementById('reader-view').scrollTop = 0;
    let loaded = 0;
    for(let i=1; i<=MAX_SAYFA; i++) {
        let img = document.createElement("img");
        let path = `https://cdn.jsdelivr.net/gh/${v.u}/${v.r}/${v.k==='.'?'':v.k+'/'}${b}/${i}.jpg`;
        img.src = IS_MOBILE ? `https://wsrv.nl/?url=${encodeURIComponent(path)}&w=800&output=jpg` : path;
        img.onload = () => { loaded++; if(loaded>1) loader.style.display = "none"; };
        img.onerror = function() { this.remove(); if(box.children.length===0) loader.style.display = "none"; };
        box.appendChild(img);
    }
}

function sonraki() { 
    const s = document.getElementById('cSelect');
    if(s.selectedIndex < s.options.length-1) { s.selectedIndex++; resimGetir(); }
    else alert("Son bölüm!");
}
function onceki() { 
    const s = document.getElementById('cSelect');
    if(s.selectedIndex > 0) { s.selectedIndex--; resimGetir(); }
    else closeReader();
}

function loadCusdis(id, title, cont) {
    const target = document.getElementById(cont); if (!target) return;
    target.innerHTML = `<div id="cusdis_thread" data-host="https://cusdis.com" data-app-id="${CUSDIS_APP_ID}" data-page-id="${id}" data-page-url="${window.location.href}" data-page-title="${title}" data-theme="dark" data-lang="tr"></div>`; 
    if (window.CUSDIS) window.CUSDIS.initial();
    else { let s = document.createElement("script"); s.src = "https://cusdis.com/js/cusdis.es.js"; s.async = true; document.body.appendChild(s); }
        }
