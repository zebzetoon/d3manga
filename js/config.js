// --- AYARLAR ---
const CACHE_ID = Date.now();
const IS_MOBILE = window.innerWidth < 768;
const MAX_SAYFA = 100;
const GRAPHCOMMENT_ID = "ZebzeManga"; // Yorum sistemi ID'si

// --- GLOBAL DEĞİŞKENLER ---
// Diğer dosyalardan erişilebilsin diye window objesine atıyoruz veya global bırakıyoruz
let ARSIV = {}; 
let currentSeri = null;
let sliderInterval = null;
let sortDesc = true; 
