const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100; // Maksimum denenecek sayfa sayısı
let ARSIV = {}; 
let currentSeri = null;
let sliderInterval = null;

// ==========================================
// CUSDIS ID (BURAYI KENDİ ID'N İLE DEĞİŞTİR)
const CUSDIS_APP_ID = "BURAYA-UZUN-KODU-YAPISTIR"; 
// ==========================================

// --- YARDIMCI: KARIŞTIRMA ---
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// --- 1. TARAYICI GERİ TUŞU YÖNETİMİ ---
window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const seri = urlParams.get('seri');
    const bolum = urlParams.get('bolum');

    if (seri && ARSIV[seri]) {
        if (bolum) openReader(seri, bolum, false); // false = geçmişe ekleme yapma
        else openDetail(seri, false);
    } else {
        closeDetail(false);
    }
});

// --- 2. SİTE AÇILIŞI VE CSV OKUMA ---
document.addEventListener("DOMContentLoaded", () => {
    fetch('liste.csv?t=' + CACHE_ID)
        .then(r => r.text())
        .then(t => {
            const grid = document.getElementById('manga-list');
            grid.innerHTML = ""; 
            
            let rows = t.split('\n');
            if (rows.length > 0) rows.shift(); // Başlık satırını atla

            rows.forEach((l) => {
                let d = l.split(',').map(x => x.trim());
                // Hatalı veya boş satırları atla
                if(d.length < 5 || d[0] === "" || d[0].toLowerCase() === "isim") return;

                let [isim, klasor, user, repo, aralik, kapak, banner, tur, durum, yazar, ozet] = d;
                
                // Aralık sayı değilse atla
                if (isNaN(parseInt(aralik.split('-')[0]))) return;

                // Veri eksikse doldur
                if(!kapak) kapak = "https://via.placeholder.com/200x300";
                if(!banner) banner = kapak; 
                if(!ozet) ozet = "Açıklama bulunamadı.";

                // ARŞİVE KAYDET
                ARSIV[isim] = { 
                    bolumler: [], 
                    u: user, r: repo, k: klasor, 
                    meta: { kapak, tur, durum, yazar, banner, ozet }
                };
                
                // Bölümleri Sayı Olarak Listele (Örn: 1, 2, 3...)
                let range = aralik.includes('-') ? aralik.split('-') : [aralik, aralik];
                let baslangic = parseInt(range[0]);
                let bitis = parseInt(range[1]);

                for(let i = baslangic; i <= bitis; i++) {
                    ARSIV[isim].bolumler.push(i);
                }
                // Küçükten Büyüğe Sırala (1, 2, 10...)
                ARSIV[isim].bolumler.sort((a,b) => a - b); 

                // HTML KARTINI OLUŞTUR
                let durumClass = durum.toLowerCase().includes('tamam') ? 'tag-completed' : 'tag-ongoing';
                let cardHtml = `
                <div class="manga-card" onclick="openDetail('${isim}')">
                    <div class="card-img-container">
                        <div class="tag tag-status ${durumClass}">${durum}</div>
                        <img src="${kapak}" class="card-img" loading="lazy">
                    </div>
                    <div class="card-info">
                        <div class="card-title">${isim}</div>
                        <div class="card-genre">${tur}</div>
                    </div>
                </div>`;
                grid.innerHTML += cardHtml;
            });

            // SLIDER BAŞLAT (Rastgele 5 Seri)
            let allKeys = Object.keys(ARSIV);
            if(allKeys.length > 0) {
                let randomList = shuffleArray(allKeys.map(k => ({isim: k, meta: ARSIV[k].meta}))).slice(0, 5);
                initSlider(randomList);
            }

            // URL KONTROLÜ (Sayfa Yenilenince Nerede Kaldık?)
            const urlParams = new URLSearchParams(window.location.search);
            const s = urlParams.get('seri');
            const b = urlParams.get('bolum');
            
            if (s && ARSIV[s]) {
                if(b) openReader(s, b, false);
                else openDetail(s, false);
            }
        });
});

// --- 3. SLIDER FONKSİYONLARI ---
function initSlider(items) {
    const wrapper = document.getElementById('hero-wrapper');
    const dots = document.getElementById('slider-dots');
    wrapper.innerHTML = ""; dots.innerHTML = "";

    items.forEach((item, i) => {
        let active = i === 0 ? 'active' : '';
        wrapper.innerHTML += `
        <div class="hero-slide ${active}">
            <img src="${item.meta.banner}" class="slide-bg">
            <div class="slide-content">
                <div class="slide-info">
                    <div class="slide-badge"><i class="fas fa-crown"></i> GÜNÜN SERİSİ</div>
                    <div class="slide-title">${item.isim}</div>
                    <div class="slide-desc">${item.meta.ozet}</div>
                    <button class="slide-btn" onclick="openDetail('${item.isim}')">
                        <i class="fas fa-play"></i> İncele
                    </button>
                </div>
                <img src="${item.meta.kapak}" class="slide-poster">
            </div>
        </div>`;
        dots.innerHTML += `<div class="dot ${active}" onclick="changeSlide(${i})"></div>`;
    });
    startSliderTimer(items.length);
}

let currentIdx = 0;
function changeSlide(idx) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.dot');
    if(!slides[idx]) return;

    slides[currentIdx].classList.remove('active');
    dots[currentIdx].classList.remove('active');
    
    currentIdx = idx;
    
    slides[currentIdx].classList.add('active');
    dots[currentIdx].classList.add('active');
}

function startSliderTimer(total) {
    clearInterval(sliderInterval);
    sliderInterval = setInterval(() => {
        changeSlide((currentIdx + 1) % total);
    }, 6000); // 6 Saniyede bir değişir
}

// --- 4. DETAY SAYFASI ---
function openDetail(isim, push = true) {
    currentSeri = isim;
    let data = ARSIV[isim];

    if (push) {
        let newUrl = `?seri=${encodeURIComponent(isim)}`;
        window.history.pushState({path: newUrl}, '', newUrl);
    }

    // Bilgileri Doldur
    document.getElementById('detail-bg').style.backgroundImage = `url('${data.meta.banner}')`;
    document.getElementById('detail-cover-img').src = data.meta.kapak;
    document.getElementById('detail-title-text').innerText = isim;
    document.getElementById('detail-author').innerText = data.meta.yazar;
    document.getElementById('detail-genre').innerText = data.meta.tur;
    document.getElementById('detail-summary').innerText = data.meta.ozet;
    document.getElementById('chapter-count').innerText = data.bolumler.length + " Bölüm";

    // Bölüm Listesini Doldur (Ters Sıralı: En yeni en üstte)
    const listContainer = document.getElementById('chapter-list-box');
    listContainer.innerHTML = "";
    
    // Kopya oluşturup ters çeviriyoruz ki orijinal sıralama bozulmasın
    let tersBolumler = [...data.bolumler].reverse();
    
    tersBolumler.forEach(b => {
        listContainer.innerHTML += `
        <div class="chapter-item" onclick="openReader('${isim}', ${b})">
            <div>
                <div class="chapter-name">Bölüm ${b}</div>
                <div class="chapter-date">Yayında</div>
            </div>
            <i class="fas fa-chevron-right"></i>
        </div>`;
    });

    // Ekranları Değiştir
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    document.getElementById('reader-view').style.display = 'none';
    
    // Yorumları Yükle
    loadCusdis("seri_" + isim, isim, "cusdis_series");
    
    if(push) window.scrollTo(0,0);
}

function closeDetail(push = true) {
    if (push) {
        window.history.pushState({}, '', window.location.pathname);
    }
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
}

// --- 5. "OKUMAYA BAŞLA" BUTONU ---
function startReading() {
    if(currentSeri && ARSIV[currentSeri]) {
        // Dizinin ilk elemanı (0. index) en küçük bölümdür çünkü sıraladık.
        let ilkBolum = ARSIV[currentSeri].bolumler[0];
        openReader(currentSeri, ilkBolum);
    }
}

// --- 6. OKUYUCU SAYFASI ---
function openReader(isim, bolumNo, push = true) {
    currentSeri = isim;
    // URL Güncelle
    if (push) {
        let newUrl = `?seri=${encodeURIComponent(isim)}&bolum=${bolumNo}`;
        window.history.pushState({path: newUrl}, '', newUrl);
    }

    // Ekranları Değiştir
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'block';

    // Seçim Kutusunu (Dropdown) Doldur
    const select = document.getElementById('cSelect');
    select.innerHTML = "";
    
    let tumBolumler = ARSIV[isim].bolumler; // Sıralı liste (1, 2, 3...)
    
    tumBolumler.forEach(b => {
        let option = document.createElement("option");
        option.text = "Bölüm " + b;
        option.value = b;
        if(b == bolumNo) option.selected = true;
        select.add(option);
    });

    // Resimleri Getir
    resimGetir();
    
    // Yorumları Getir
    loadCusdis("bolum_"+isim+"_"+bolumNo, isim+" Bölüm "+bolumNo, "cusdis_chapter");
    
    if(push) document.getElementById('reader-view').scrollTop = 0;
}

function closeReader() {
    // Okuyucudan çıkınca detay sayfasına dön
    openDetail(currentSeri, true);
}

// --- 7. RESİM GETİRME (SPINNER EKLENDİ) ---
function resimGetir() {
    const box = document.getElementById('box');
    const loader = document.getElementById('reader-loader');
    const bolum = document.getElementById('cSelect').value;
    const veri = ARSIV[currentSeri];

    // Temizlik
    box.innerHTML = "";
    loader.style.display = "flex"; // Spinner'ı göster

    // URL Güncelle (Seçim kutusundan değişirse)
    let newUrl = `?seri=${encodeURIComponent(currentSeri)}&bolum=${bolum}`;
    window.history.replaceState({path: newUrl}, '', newUrl);

    let ilkResimYuklendi = false;

    for(let i=1; i<=MAX_SAYFA; i++) {
        let img = document.createElement("img");
        
        // GitHub Yolu Oluştur
        let klasor = veri.k === "." ? "" : veri.k + "/";
        let rawPath = `https://cdn.jsdelivr.net/gh/${veri.u}/${veri.r}/${klasor}${bolum}/${i}.jpg`;
        
        // Mobilde WSRV.NL ile sıkıştır, PC'de direkt aç
        if(IS_MOBILE) {
            img.src = `https://wsrv.nl/?url=${encodeURIComponent(rawPath)}&w=800&output=jpg`;
        } else {
            img.src = rawPath;
        }

        // İlk 3 resim hemen yüklensin, diğerleri sırası gelince (lazy)
        if(i > 3) img.loading = "lazy";

        // Yüklenme Kontrolü
        img.onload = function() {
            if(!ilkResimYuklendi) {
                loader.style.display = "none"; // İlk resim gelince spinner'ı kapat
                ilkResimYuklendi = true;
            }
        };

        // Resim Yoksa (404)
        img.onerror = function() { 
            this.remove(); 
            // Eğer hiç resim yoksa spinner'ı kapat (Boş sayfa)
            if(box.children.length === 0) loader.style.display = "none";
        };

        box.appendChild(img);
    }
    
    // Güvenlik: 5 saniye sonra spinner hala dönüyorsa zorla kapat
    setTimeout(() => { loader.style.display = "none"; }, 5000);
}

// --- 8. İLERİ / GERİ TUŞLARI ---
function sonraki() { 
    const select = document.getElementById('cSelect');
    // Eğer sonda değilsek bir sonrakine geç
    if(select.selectedIndex < select.options.length - 1) { 
        select.selectedIndex++; 
        resimGetir(); 
        document.getElementById('reader-view').scrollTop = 0; // Başa sar
    } else {
        alert("Bu serinin son bölümündesiniz!");
    }
}

function onceki() { 
    const select = document.getElementById('cSelect');
    // Eğer başta değilsek bir öncekine geç
    if(select.selectedIndex > 0) { 
        select.selectedIndex--; 
        resimGetir(); 
        document.getElementById('reader-view').scrollTop = 0; // Başa sar
    } else {
        // Eğer 1. bölümdeysek Detay sayfasına dön
        closeReader();
    }
}

// --- 9. YORUM SİSTEMİ (CUSDIS) ---
function loadCusdis(id, title, contId) {
    const target = document.getElementById(contId);
    if (!target) return;
    
    target.innerHTML = ""; // Temizle
    
    // Cusdis Div'i
    let div = document.createElement('div');
    div.id = "cusdis_thread";
    div.setAttribute("data-host", "https://cusdis.com");
    div.setAttribute("data-app-id", CUSDIS_APP_ID);
    div.setAttribute("data-page-id", id);
    div.setAttribute("data-page-url", window.location.href);
    div.setAttribute("data-page-title", title);
    div.setAttribute("data-theme", "dark");
    div.setAttribute("data-lang", "tr");
    target.appendChild(div);

    // Script'i Yükle
    if (window.CUSDIS) {
        window.CUSDIS.initial();
    } else {
        let s = document.createElement("script");
        s.src = "https://cusdis.com/js/cusdis.es.js";
        s.async = true;
        document.body.appendChild(s);
    }
}
