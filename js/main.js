// Sayfa Geçmişi (Geri Tuşu) Yönetimi
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

// Başlangıç - Verileri Çekme ve İşleme
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

            // TARİHE GÖRE SIRALAMA VERİSİ HAZIRLAMA
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

        // SIRALAMA İŞLEMİ (Yeniden Eskiye)
        siralanacakSeriler.sort((a, b) => b.gercekTarihMilisaniye - a.gercekTarihMilisaniye);

        // KARTLARI BASMA
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

        // SLIDER BAŞLATMA
        let allKeys = Object.keys(ARSIV);
        if(allKeys.length > 0) initSlider(shuffleArray(allKeys.map(k => ({isim: k, meta: ARSIV[k].meta}))).slice(0, 5));

        // URL KONTROLÜ (Doğrudan linkle gelindiyse açma)
        const urlParams = new URLSearchParams(window.location.search);
        const s = urlParams.get('seri'), b = urlParams.get('bolum');
        if (s && ARSIV[s]) b ? openReader(s, b, false) : openDetail(s, false);
    });
});
