// Geri Tuşu Yönetimi
window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const seri = urlParams.get('seri');
    const bolum = urlParams.get('bolum');
    
    // Temizlik: Önce hepsini kapat
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'none';

    if (seri && ARSIV[seri]) {
        if (bolum) {
            openReader(seri, bolum, false); // reader.js'den çağırır
        } else {
            openDetail(seri, false); // ui.js'den çağırır
        }
    } else {
        document.getElementById('home-view').style.display = 'block';
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

            // Tarih Sıralaması
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

        // Yeniden Eskiye Sırala
        siralanacakSeriler.sort((a, b) => b.gercekTarihMilisaniye - a.gercekTarihMilisaniye);

        // HTML Oluştur
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

        // Slider Başlat
        let allKeys = Object.keys(ARSIV);
        if(allKeys.length > 0) initSlider(shuffleArray(allKeys.map(k => ({isim: k, meta: ARSIV[k].meta}))).slice(0, 5));

        // URL Kontrolü
        const urlParams = new URLSearchParams(window.location.search);
        const s = urlParams.get('seri'), b = urlParams.get('bolum');
        
        document.getElementById('home-view').style.display = 'none';
        document.getElementById('detail-view').style.display = 'none';
        document.getElementById('reader-view').style.display = 'none';

        if (s && ARSIV[s]) {
            if(b) openReader(s, b, false);
            else openDetail(s, false);
        } else {
            document.getElementById('home-view').style.display = 'block';
        }
    });
});
