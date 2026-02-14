// --- SLIDER İŞLEMLERİ ---
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

// --- DETAY SAYFASI İŞLEMLERİ ---
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

    // Diğer sayfaları GİZLE
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'block';
    
    loadGraphComment("seri_" + isim, isim, "cusdis_series");
    if(push) window.scrollTo(0,0);
}

function closeDetail(push = true) {
    if (push) window.history.pushState({}, '', window.location.pathname);
    
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';
    document.getElementById('home-view').style.display = 'block';
    
    window.scrollTo(0,0);
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
