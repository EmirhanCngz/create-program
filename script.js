// =======================================================
// SUPABASE AYARLARI
// 🔥 Kendi Supabase Proje URL ve Anon Anahtarınızı buraya girin
// =======================================================
const supabaseUrl = 'https://omlgfusmwyusfrfotgwq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGdmdXNtd3l1c2ZyZm90Z3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQ5MzIsImV4cCI6MjA4MTE0MDkzMn0.jjOGn5BFxHn819fHeGxUYZPDM9i_QCasd0YlDMBtvqs';
const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

// =======================================================
// DOM ELEMANLARI
// =======================================================
const personelSayisiDOM = document.getElementById('personel-sayisi');
const kontenjanToplamiDOM = document.getElementById('kontenjan-toplami');
const olusturBtn = document.getElementById('olustur-btn');
const statusMessageDOM = document.getElementById('status-message');
const rotasyonTablosuAlaniDOM = document.getElementById('rotasyon-tablosu-alani');

// =======================================================
// VERİ SİMÜLASYONU VE BAŞLANGIÇ VERİLERİ (Supabase'den çekilecek)
// =======================================================

let personelListesi = [];
let bolumler = [];
let gecmisData = [];

// =======================================================
// SUPABASE VERİ ÇEKME İŞLEMLERİ
// =======================================================

async function fetchInitialData() {
    try {
        // Personel Listesi
        let { data: users, error: userError } = await supabase.from('users').select('id, ad_soyad');
        if (userError) throw userError;
        personelListesi = users.map(u => ({ id: u.id, ad: u.ad_soyad }));

        // Bölümler
        let { data: bolumlerData, error: bolumError } = await supabase.from('bolumler').select('id, bolum_adi, kontenjan').eq('aktif', true);
        if (bolumError) throw bolumError;
        bolumler = bolumlerData.map(b => ({ id: b.id, adi: b.bolum_adi, kontenjan: b.kontenjan }));

        // Rotasyon Geçmişi
        let { data: gecmis, error: gecmisError } = await supabase.from('rotasyon_gecmisi').select('user_id, bolum_id');
        if (gecmisError) throw gecmisError;
        gecmisData = gecmis.map(g => ({ userId: g.user_id, bolumId: g.bolum_id }));

        updateDOMCounts();

    } catch (error) {
        displayMessage(`Veri çekilirken hata oluştu: ${error.message}`, 'error');
        console.error("Supabase Hatası:", error);
    }
}

function updateDOMCounts() {
    personelSayisiDOM.textContent = personelListesi.length;
    const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);
    kontenjanToplamiDOM.textContent = toplamKontenjan;
    
    // Bölüm listesini DOM'a yazdır
    const bolumListesiDOM = document.getElementById('bolum-listesi');
    bolumListesiDOM.innerHTML = bolumler.map(b => 
        `<div class="bolum-item"><strong>${b.adi}</strong>: ${b.kontenjan} Kontenjan</div>`
    ).join('');
}

function displayMessage(text, type = 'none') {
    statusMessageDOM.textContent = text;
    statusMessageDOM.className = `message ${type}`;
}


// =======================================================
// ROTASYON ATAMA ALGORİTMASI
// =======================================================

function atamaAlgoritmasi(personelList, bolumList, gecmisData) {
    let atanmamisPersonel = [...personelList];
    let bolumlerDurumu = bolumList.map(b => ({
        ...b,
        mevcutKontenjan: b.kontenjan,
        atananlar: []
    }));
    
    // Geçmiş veriyi kolay arama için set yapısına çevir
    const personelinGecmisi = gecmisData.reduce((acc, g) => {
        acc[g.userId] = acc[g.userId] || new Set();
        acc[g.userId].add(g.bolumId);
        return acc;
    }, {});

    // Adım 1: Her Bölüme En Az Bir Kişi Atama (Kısıtlama D)
    for (const bolum of bolumlerDurumu) {
        if (bolum.mevcutKontenjan <= 0 || atanmamisPersonel.length === 0) continue;

        let uygunKisiIndex = -1;
        
        // Önce geçmişte bu bölümde çalışmamış birini bul
        uygunKisiIndex = atanmamisPersonel.findIndex(p => {
            const gecmis = personelinGecmisi[p.id];
            return !gecmis || !gecmis.has(bolum.id);
        });

        if (uygunKisiIndex === -1) {
            // Eğer herkes çalışmışsa, rastgele birini al
             uygunKisiIndex = 0; 
        }
        
        if (atanmamisPersonel[uygunKisiIndex]) {
            const atanacakKisi = atanmamisPersonel[uygunKisiIndex];
            
            bolum.atananlar.push(atanacakKisi);
            bolum.mevcutKontenjan--;
            atanmamisPersonel.splice(uygunKisiIndex, 1);
        }
    }
    
    // Adım 2: Kalan Kontenjanları Doldurma (Kısıtlama A ve B)
    while (atanmamisPersonel.length > 0) {
        const kisi = atanmamisPersonel.shift();
        
        let bosBolumler = bolumlerDurumu.filter(b => b.mevcutKontenjan > 0);
        
        if (bosBolumler.length === 0) break; // Tüm kontenjanlar doldu.

        // En uygun bölüme öncelik vererek sırala
        bosBolumler.sort((b1, b2) => {
            const gecmis1 = personelinGecmisi[kisi.id].has(b1.id) ? 1 : 0;
            const gecmis2 = personelinGecmisi[kisi.id].has(b2.id) ? 1 : 0;

            // Kriter 1: Geçmişte çalışmamış olanları öne al (0 < 1)
            if (gecmis1 !== gecmis2) {
                return gecmis1 - gecmis2; 
            }
            // Kriter 2: Eşitlerse, en çok boş kontenjanı olana öncelik ver (Madde B)
            return b2.mevcutKontenjan - b1.mevcutKontenjan;
        });

        const atanacakBolum = bosBolumler[0];
        
        // Atamayı gerçekleştir
        atanacakBolum.atananlar.push(kisi);
        atanacakBolum.mevcutKontenjan--;
    }
    
    // Sonuç dizisini döndür
    return bolumlerDurumu;
}

// =======================================================
// TIKLAMA OLAYI VE ANA İŞLEV
// =======================================================

async function olusturRotasyonHandler() {
    olusturBtn.disabled = true;
    statusMessageDOM.textContent = 'Rotasyon oluşturuluyor...';
    
    const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);
    const toplamPersonel = personelListesi.length;

    // Kısıtlama C: Toplam kontenjan < Toplam personel
    if (toplamKontenjan < toplamPersonel) {
        displayMessage(`HATA: Toplam kontenjan (${toplamKontenjan}) personel sayısından (${toplamPersonel}) az. Atama yapılamaz.`, 'error');
        olusturBtn.disabled = false;
        return;
    }
    
    // Kısıtlama D (Kontrol): Her bölüme en az 1 kişi kuralı için yeterli personel olmalı
    if (bolumler.length > toplamPersonel) {
         displayMessage(`HATA: Bölüm sayısı (${bolumler.length}) personel sayısından (${toplamPersonel}) fazla. Her bölüme en az bir kişi atanamaz.`, 'error');
         olusturBtn.disabled = false;
         return;
    }

    try {
        const rotasyonSonucu = atamaAlgoritmasi(personelListesi, bolumler, gecmisData);
        
        renderRotasyonTablosu(rotasyonSonucu);

        // Rotasyon sonucunu Supabase'e kaydet
        await saveRotasyon(rotasyonSonucu);

        displayMessage('Rotasyon başarıyla oluşturuldu ve veritabanına kaydedildi.', 'success');
        
    } catch (error) {
        displayMessage(`Rotasyon oluşturulurken hata oluştu: ${error.message}`, 'error');
    } finally {
        olusturBtn.disabled = false;
    }
}

// Rotasyon sonucunu DOM'a yazdıran fonksiyon
function renderRotasyonTablosu(sonuc) {
    let html = '<table class="rotasyon-tablosu"><thead><tr><th>Bölüm</th><th>Atanan Personel</th></tr></thead><tbody>';
    
    sonuc.forEach(bolum => {
        const personelAdlari = bolum.atananlar.map(p => p.ad).join(', ');
        html += `<tr><td>${bolum.adi} (${bolum.kontenjan} Kontenjan)</td><td>${personelAdlari}</td></tr>`;
    });

    html += '</tbody></table>';
    rotasyonTablosuAlaniDOM.innerHTML = html;
}

// Rotasyon sonucunu Supabase'e kaydetme
async function saveRotasyon(sonuc) {
    const dataToInsert = [];
    const bugununTarihi = new Date().toISOString().split('T')[0];
    
    sonuc.forEach(bolum => {
        bolum.atananlar.forEach(personel => {
            dataToInsert.push({
                user_id: personel.id,
                bolum_id: bolum.id,
                baslangic_tarihi: bugununTarihi,
                bitis_tarihi: bugununTarihi, // Rotasyon periyoduna göre ayarlanmalı
                rotasyon_tipi: 'Haftalık' // Seçilen periyoda göre ayarlanmalı
            });
        });
    });
    
    const { error } = await supabase.from('rotasyon_gecmisi').insert(dataToInsert);
    if (error) throw error;
}


// Başlangıçta çalışacak kodlar
document.addEventListener('DOMContentLoaded', () => {
    fetchInitialData();
    olusturBtn.addEventListener('click', olusturRotasyonHandler);
});