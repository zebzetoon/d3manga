// Dizi karıştırma (Slider için)
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

// Tarih hesaplama (1 gün önce vb.)
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

// GraphComment Yükleyici (Zamanlayıcılı Versiyon)
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
