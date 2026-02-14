function openReader(isim, no, push = true) {
    if (push) window.history.pushState({}, '', `?seri=${encodeURIComponent(isim)}&bolum=${no}`);
    currentSeri = isim;
    document.getElementById('detail-view').style.display = 'none';
    document.getElementById('reader-view').style.display = 'block';
    
    const sel = document.getElementById('cSelect'); 
    sel.innerHTML = "";
    ARSIV[isim].bolumler.forEach(b => sel.add(new Option("Bölüm " + b, b)));
    sel.value = no;
    
    resimGetir();
}

function closeReader() { openDetail(currentSeri, true); }

function resimGetir() {
    const box = document.getElementById('box'), loader = document.getElementById('reader-loader'), b = document.getElementById('cSelect').value, v = ARSIV[currentSeri];
    box.innerHTML = ""; loader.style.display = "flex"; document.getElementById('reader-view').scrollTop = 0;
    
    window.history.replaceState({}, '', `?seri=${encodeURIComponent(currentSeri)}&bolum=${b}`);
    
    let loaded = 0;
    for(let i=1; i<=MAX_SAYFA; i++) {
        let img = document.createElement("img");
        let path = `https://cdn.jsdelivr.net/gh/${v.u}/${v.r}/${v.k==='.'?'':v.k+'/'}${b}/${i}.jpg`;
        img.src = IS_MOBILE ? `https://wsrv.nl/?url=${encodeURIComponent(path)}&w=800&output=jpg` : path;
        img.onload = () => { loaded++; if(loaded>1) loader.style.display = "none"; };
        img.onerror = function() { this.remove(); if(box.children.length===0) loader.style.display = "none"; };
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
