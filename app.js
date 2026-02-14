const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100;
let ARSIV = {}; 
let currentSeri = null;
let sliderInterval = null;
let sortDesc = true; 

// ==========================================
// AYARLAR
const GRAPHCOMMENT_ID = "ZebzeManga"; 
// ==========================================

// --- YARDIMCI FONKSİYONLAR ---

// Arama Fonksiyonu
function searchSeries() {
    const query = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (query.length < 2) {
        alert("En az 2 harf giriniz.");
        return;
    }

    const allSeries = Object.keys(ARSIV);
    const results = allSeries.filter(seri => seri.toLowerCase().includes(query));

    if (results.length === 0) {
        alert("Seri bulunamadı: " + query);
    } else if (results.length >= 1) {
        openDetail(results[0]);
        document.getElementById('searchInput').value = ""; 
        document.getElementById('searchInput').blur();
    }
}

// Enter tuşu desteği
const searchInput = document.getElementById('searchInput');
if(searchInput) {
    searchInput.addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            event.preventDefault(); 
            searchSeries();
        }
    });
}

function switchView(viewId) {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';
    
    const target = document.getElementById(viewId);
    if(target) target.style.display = 'block';

    // OKUYUCUDA HEADER'I GİZLE
    const mainHeader = document.getElementById('main-header');
    if (viewId === 'reader-view') {
        if(mainHeader) mainHeader.style.display = 'none';
    } else {
        if(mainHeader) mainHeader.style.display = 'flex';
    }

    window.scrollTo(0, 0);
}

function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

function hesaplaZaman(csvTarih, gunGeriyeGit = 0) {
    if(!csvTarih) return "";
    let parcalar = csvTarih.split('.');
    if(parcalar.length !== 3) return csvTarih;

    let hedefTarih = new Date(parcalar[2], parcalar[1] - 1, parcalar[0]);
    hedefTarih.setDate(hedefTarih.getDate() - gunGeriyeGit);

    let bugun = new Date();
    bugun.setHours(0,0,0,0);
    hedefTarih.setHours(0,0,0,0);

    let farkZaman = bugun - hedefTarih;
    let farkGun = Math.floor(farkZaman / (1000 * 60 * 60 * 24));

    if (farkGun <= 0) return "1 saat önce";
    if (farkGun === 1) return "1 gün önce";
    if (farkGun > 1 && farkGun < 7) return farkGun + " gün önce";
    if (farkGun >= 7 && farkGun < 30) return Math.floor(farkGun / 7) + " hafta önce";
    if (farkGun >= 30) return Math.floor(farkGun / 30) + " ay önce";
    
    return csvTarih;
}

// --- GERİ TUŞU YÖNETİMİ ---
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

// --- BAŞLANGIÇ ---
document.addEventListener("DOMContentLoaded", () => {
    fetch('liste.csv?t=' + CACHE_ID).then(r => r.text()).then(t => {
        const listContainer = document.getElementById('manga-list');
        listContainer.innerHTML = ""; 
        let rows = t.split('\n');
        if (rows.length > 0) rows.shift(); 

        let siralanacakSeriler = [];

        rows.forEach((l) => {
            let d = l.split(',').map(x => x.trim());
            if(d.length < 5 || d[0] === "" || d[0].toLowerCase().includes("isim")) return;

            let [isim, klasor, user, repo, aralik, kapak, banner, tur, durum, yazar, ozet, puan, tarih] = d;
            
            if (isNaN(parseInt(aralik))) return;
            if(!kapak) kapak = "https://via.placeholder.com/200x300";
            if(!banner) banner = kapak; 
            if(!puan) puan = "10"; 

            ARSIV[isim] = { 
                bolumler: [], u: user, r: repo, k: klasor, 
                meta: { kapak, tur, durum, yazar, banner, ozet: ozet || "Açıklama bulunamadı.", tarih: tarih || "", puan: puan }
            };
            
            let range = aralik.includes('-') ? aralik.split('-') : [aralik, aralik];
            for(let i=parseInt(range[0]); i<=parseInt(range[1]); i++) ARSIV[isim].bolumler.push(i);
            ARSIV[isim].bolumler.sort((a,b) => a - b); 

            let siralamaTarihi = new Date(0); 
            if(tarih) {
                let p = tarih.split('.');
                if(p.length === 3) siralamaTarihi = new Date(p[2], p[1] - 1, p[0]);
            }

            siralanacakSeriler.push({
                isim: isim,
                gercekTarihMilisaniye: siralamaTarihi.getTime() 
            });
        });

        siralanacakSeriler.sort((a, b) => b.gercekTarihMilisaniye - a.gercekTarihMilisaniye);

        siralanacakSeriler.forEach(item => {
            let isim = item.isim;
            let meta = ARSIV[isim].meta;
            let bolumler = ARSIV[isim].bolumler;

            let sonBolumler = [...bolumler].reverse().slice(0, 4);
            let bolumListesiHTML = "";

            sonBolumler.forEach((b, index) => {
                let badge = "";
                let gunFarki = index; 
                let gorunurTarih = hesaplaZaman(meta.tarih, gunFarki);

                if(index === 0) {
                    badge = `<span class="badge-new">YENİ</span>`;
                } else {
                    badge = `<span class="badge-new" style="background:#333; color:#aaa !important;">OKU</span>`;
                }
                
                bolumListesiHTML += `
                <div class="mini-chapter-item" onclick="event.stopPropagation(); openReader('${isim}', ${b})">
                    <div class="chapter-left">
                        <i class="fas fa-file-alt" style="color:#555;"></i> 
                        Bölüm ${b}
                    </div>
                    <div class="chapter-right">
                        ${badge}
                        <span>${gorunurTarih}</span>
                    </div>
                </div>`;
            });

            let itemHtml = `
            <div class="manga-list-item" onclick="openDetail('${isim}')">
                <div class="list-poster-area">
                    <img src="${meta.kapak}" class="list-poster" loading="lazy">
                </div>
                <div class="list-content-area">
                    <div class="list-title">${isim}</div>
                    <div class="list-rating">
                        <i class="fas fa-star"></i> ${meta.puan} 
                        <span style="color:#666; margin-left:5px;">• ${meta.tur}</span>
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
        
        if (s && ARSIV[s]) {
            if (b) openReader(s, b, false);
            else openDetail(s, false);
        } else {
            switchView('home-view');
        }
    });
});

// --- SLIDER FONKSİYONLARI ---
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

// --- DETAY SAYFASI ---
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
    switchView('detail-view');
    loadGraphComment("seri_" + isim, isim, "cusdis_series");
}

function closeDetail(push = true) {
    if (push) window.history.pushState({}, '', window.location.pathname);
    switchView('home-view');
}

function renderChapterList(isim) {
    const box = document.getElementById('chapter-list-box');
    const expandBtn = document.getElementById('expand-btn');
    box.innerHTML = "";
    
    let data = ARSIV[isim];
    let sortedList = [...data.bolumler];
    if(sortDesc) sortedList.reverse(); 

    const GORUNEN_LIMIT = 5;

    sortedList.forEach((b, index) => {
        let hiddenClass = index >= GORUNEN_LIMIT ? 'hidden-chapter' : '';
        box.innerHTML += `
        <div class="chapter-item ${hiddenClass}" onclick="openReader('${isim}', ${b})">
            <div class="chapter-name">Bölüm ${b}</div>
            <i class="fas fa-chevron-right" style="color:#555;"></i>
        </div>`;
    });

    if (sortedList.length > GORUNEN_LIMIT) expandBtn.style.display = "flex";
    else expandBtn.style.display = "none";
}

function expandChapters() {
    const hiddenItems = document.querySelectorAll('.hidden-chapter');
    hiddenItems.forEach(item => item.classList.remove('hidden-chapter'));
    document.getElementById('expand-btn').style.display = "none";
}

function toggleSort() {
    sortDesc = !sortDesc;
    const icon = document.getElementById('sort-icon');
    if(sortDesc) icon.className = "fas fa-sort-numeric-down-alt"; 
    else icon.className = "fas fa-sort-numeric-down"; 
    if(currentSeri) renderChapterList(currentSeri);
}

// --- OKUYUCU MANTIĞI ---
function openReader(isim, no, push = true) {
    if (push) window.history.pushState({}, '', `?seri=${encodeURIComponent(isim)}&bolum=${no}`);
    currentSeri = isim;

    switchView('reader-view');
    
    const sel = document.getElementById('cSelect'); 
    sel.innerHTML = "";
    if(ARSIV[isim] && ARSIV[isim].bolumler) {
        ARSIV[isim].bolumler.forEach(b => sel.add(new Option("Bölüm " + b, b)));
        sel.value = no;
    }
    
    resimGetir();
}

function closeReader() { 
    openDetail(currentSeri, true); 
}

function resimGetir() {
    const box = document.getElementById('box'), loader = document.getElementById('reader-loader');
    const b = document.getElementById('cSelect').value;
    const v = ARSIV[currentSeri];
    
    box.innerHTML = ""; 
    loader.style.display = "flex"; 
    
    document.getElementById('reader-view').scrollTop = 0;
    
    window.history.replaceState({}, '', `?seri=${encodeURIComponent(currentSeri)}&bolum=${b}`);
    
    let loaded = 0;
    for(let i=1; i<=MAX_SAYFA; i++) {
        let img = document.createElement("img");
        let path = `https://cdn.jsdelivr.net/gh/${v.u}/${v.r}/${v.k==='.'?'':v.k+'/'}${b}/${i}.jpg`;
        img.src = IS_MOBILE ? `https://wsrv.nl/?url=${encodeURIComponent(path)}&w=800&output=jpg` : path;
        
        img.onload = () => { loaded++; if(loaded>0) loader.style.display = "none"; };
        img.onerror = function() { this.remove(); if(box.children.length===0 && i > 5) loader.style.display = "none"; };
        box.appendChild(img);
    }

    loadGraphComment("bolum_"+currentSeri+"_"+b, currentSeri+" Bölüm "+b, "cusdis_chapter");
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

function startReading() {
    if(currentSeri && ARSIV[currentSeri]) openReader(currentSeri, ARSIV[currentSeri].bolumler[0]);
}

// --- GRAPHCOMMENT YÜKLEYİCİ ---
function loadGraphComment(id, title, cont) {
    const target = document.getElementById(cont);
    if (!target) return;

    const oldGc = document.getElementById("graphcomment");
    if (oldGc) oldGc.remove();
    target.innerHTML = ""; 
    
    let gcDiv = document.createElement("div");
    gcDiv.id = "graphcomment";
    target.appendChild(gcDiv);

    let safeId = id.replace(/[^a-zA-Z0-9]/g, '_');

    window.__semio__params = {
        graphcommentId: GRAPHCOMMENT_ID,
        behaviour: { uid: safeId }
    };

    setTimeout(() => {
        if (typeof window.__semio__gc_graphlogin === 'function') {
            window.__semio__gc_graphlogin(window.__semio__params);
        } else {
            let s = document.createElement("script");
            s.type = "text/javascript";
            s.async = true;
            s.src = "https://integration.graphcomment.com/gc_graphlogin.js?" + Date.now();
            
            s.onload = function() {
                setTimeout(() => {
                    if(window.__semio__gc_graphlogin) {
                        window.__semio__gc_graphlogin(window.__semio__params);
                    }
                }, 100);
            };
            (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(s);
        }
    }, 150);
}
