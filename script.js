// =======================================================
// SUPABASE AYARLARI VE İSTEMCİ OLUŞTURMA
// =======================================================
// 🔥 KENDİ SUPABASE PROJE URL'NİZİ BURAYA GİRİN
const supabaseUrl = 'https://omlgfusmwyusfrfotgwq.supabase.co'; 
// 🔥 KENDİ SUPABASE ANON (PUBLIC) ANAHTARINIZI BURAYA GİRİN
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

// Auth DOM
const authPanel = document.getElementById('auth-panel');
const adminPanel = document.getElementById('admin-panel');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userDisplayNameDOM = document.getElementById('user-display-name');

// =======================================================
// VERİ DEĞİŞKENLERİ
// =======================================================
let personelListesi = [];
let bolumler = [];
let gecmisData = [];

// =======================================================
// YETKİLENDİRME (AUTH) İŞLEMLERİ
// =======================================================

loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        displayMessage(`Giriş Hatası: ${error.message}`, 'error');
    } 
    // checkAdminStatus, SIGNED_IN olayıyla otomatik tetiklenir
});

logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Çıkış Hatası:', error);
    }
});

// script.js - (loginBtn altına ekleyin)

const signupBtn = document.getElementById('signup-btn'); // index.html'e bu butonu eklemeyi unutmayın!
const adSoyadInput = document.getElementById('ad_soyad'); // index.html'e bu inputu ekleyin

signupBtn.addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const adSoyad = adSoyadInput.value; 

    // 1. Supabase Auth Kayıt İşlemi
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password
    });

    if (authError) {
        displayMessage(`Kayıt Hatası: ${authError.message}`, 'error');
        return;
    }
    
    // 2. Auth başarılıysa, kullanıcıyı 'users' tablosuna ekleme
    if (authData.user) {
        const { error: userInsertError } = await supabase
            .from('users')
            .insert({ 
                id: authData.user.id, 
                ad_soyad: adSoyad, 
                email: email, 
                // is_admin: FALSE (Artık bu alanı kullanmıyoruz)
            });

        if (userInsertError) {
             // Eğer bu kısım hata verirse, Supabase Auth'ta kullanıcı oluşturulmuş ancak users tablosuna eklenememiş demektir.
             console.error("User Insert Error:", userInsertError);
             displayMessage('Kayıt oldu ancak kullanıcı bilgisi kaydedilemedi. Destek birimine başvurun.', 'error');
             // Gerekirse Auth kullanıcısını da silmeliyiz (Gelişmiş senaryo)
             return;
        }

        displayMessage('Kayıt başarılı! Lütfen giriş yapın.', 'success');
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    }
});

// checkAdminStatus yerine sadece checkAuthAndLoadData fonksiyonu kullanılacak
async function checkAuthAndLoadData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        // Oturum Açılmamışsa, sadece Auth panelini göster
        authPanel.style.display = 'block';
        adminPanel.style.display = 'none';
        userDisplayNameDOM.textContent = '';
        return;
    }

    // Oturum Açılmışsa, kullanıcı adını göster ve verilerini çek
    authPanel.style.display = 'none';
    adminPanel.style.display = 'block';

    // Kullanıcı adını users tablosundan çek
    const { data: userData } = await supabase.from('users').select('ad_soyad').eq('id', user.id).single();
    userDisplayNameDOM.textContent = userData ? userData.ad_soyad : user.email;
    
    // Yalnızca o kullanıcıya ait verileri çekmek için fetchInitialData fonksiyonu güncellenmeli.
    fetchInitialData(user.id); 
}

async function checkAdminStatus() {
    // Oturum durumunu al
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        authPanel.style.display = 'block';
        adminPanel.style.display = 'none';
        userDisplayNameDOM.textContent = '';
        return;
    }
    
    // Kullanıcının yönetici (is_admin) durumunu kontrol et
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_admin, ad_soyad')
        .eq('id', user.id)
        .single();
    
    if (userError || !userData || !userData.is_admin) {
        displayMessage('Bu alana erişim yetkiniz yok veya Yönetici yetkiniz atanmamış.', 'error');
        authPanel.style.display = 'block';
        adminPanel.style.display = 'none';
        supabase.auth.signOut(); // Yönetici değilse oturumu kapat
        return;
    }
    
    // Yönetici ise
    userDisplayNameDOM.textContent = userData.ad_soyad || user.email;
    authPanel.style.display = 'none';
    adminPanel.style.display = 'block';
    
    // Yönetici paneli yüklendiğinde verileri çek
    fetchInitialData(); 
}

// =======================================================
// SUPABASE VERİ ÇEKME İŞLEMLERİ
// =======================================================

async function fetchInitialData(currentUserId) {
    try {
        // 1. users tablosundan sadece oturum açmış kullanıcıyı al
        let { data: currentUserData, error: userError } = await supabase
            .from('users')
            .select('id, ad_soyad')
            .eq('id', currentUserId)
            .single();

        if (userError || !currentUserData) throw new Error("Kullanıcı verisi bulunamadı.");

        // Bireysel modelde, rotasyon kendisi için yapılır.
        personelListesi = [{ id: currentUserData.id, ad: currentUserData.ad_soyad }];


        // 2. Bölümler (Bolumler tablosu bu modelde muhtemelen tüm kullanıcılar için ortaktır, ancak kısıtlamak gerekirse RLS kullanılır.)
        let { data: bolumlerData, error: bolumError } = await supabase
            .from('bolumler')
            .select('id, bolum_adi, kontenjan')
            .eq('aktif', true);
        
        if (bolumError) throw bolumError;
        bolumler = bolumlerData.map(b => ({ id: b.id, adi: b.bolum_adi, kontenjan: b.kontenjan }));


        // 3. Rotasyon Geçmişi (Sadece bu kullanıcının geçmişini al)
        let { data: gecmis, error: gecmisError } = await supabase
            .from('rotasyon_gecmisi')
            .select('user_id, bolum_id')
            .eq('user_id', currentUserId); // 🔥 Sadece kendi geçmişini çeker

        if (gecmisError) throw gecmisError;
        gecmisData = gecmis.map(g => ({ userId: g.user_id, bolumId: g.bolum_id }));

        updateDOMCounts();

    } catch (error) {
        console.error("Veri çekilirken hata oluştu:", error.message);
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
// ROTASYON ATAMA ALGORİTMASI (Tüm Kısıtlamalar Dahil)
// =======================================================
function atamaAlgoritmasi(personelList, bolumList, gecmisData) {
    let atanmamisPersonel = [...personelList];
    let bolumlerDurumu = bolumList.map(b => ({
        ...b,
        mevcutKontenjan: b.kontenjan,
        atananlar: []
    }));
    
    const personelinGecmisi = gecmisData.reduce((acc, g) => {
        acc[g.userId] = acc[g.userId] || new Set();
        acc[g.userId].add(g.bolumId);
        return acc;
    }, {});

    // Adım 1: Her Bölüme En Az Bir Kişi Atama (Kısıtlama D)
    for (const bolum of bolumlerDurumu) {
        if (bolum.mevcutKontenjan <= 0 || atanmamisPersonel.length === 0) continue;

        let uygunKisiIndex = atanmamisPersonel.findIndex(p => {
            const gecmis = personelinGecmisi[p.id];
            return !gecmis || !gecmis.has(bolum.id); // Geçmişte çalışmamış
        });

        if (uygunKisiIndex === -1) {
            // Herkes çalışmışsa, rastgele birini al (Genellikle ilk kişiyi)
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
        
        if (bosBolumler.length === 0) break; 

        // Sıralama: Kriter 1 (Geçmişte Çalışmama), Kriter 2 (En Çok Boş Kontenjan)
        bosBolumler.sort((b1, b2) => {
            const gecmis1 = personelinGecmisi[kisi.id].has(b1.id) ? 1 : 0;
            const gecmis2 = personelinGecmisi[kisi.id].has(b2.id) ? 1 : 0;

            if (gecmis1 !== gecmis2) {
                return gecmis1 - gecmis2; // Çalışmayanı öne al
            }
            return b2.mevcutKontenjan - b1.mevcutKontenjan; // Kontenjanı çok olanı öne al
        });

        const atanacakBolum = bosBolumler[0];
        
        // Atamayı gerçekleştir
        atanacakBolum.atananlar.push(kisi);
        atanacakBolum.mevcutKontenjan--;
    }
    
    return bolumlerDurumu;
}

// =======================================================
// ANA İŞLEV VE VERİ KAYIT
// =======================================================

async function olusturRotasyonHandler() {
    olusturBtn.disabled = true;
    displayMessage('Rotasyon oluşturuluyor...', 'none');
    
    const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);
    const toplamPersonel = personelListesi.length;

    // Kısıtlama C: Kontrol
    if (toplamKontenjan < toplamPersonel) {
        displayMessage(`HATA: Toplam kontenjan (${toplamKontenjan}) personel sayısından (${toplamPersonel}) az. Atama yapılamaz.`, 'error');
        olusturBtn.disabled = false;
        return;
    }
    
    // Kısıtlama D: Kontrol
    if (bolumler.length > toplamPersonel) {
         displayMessage(`HATA: Bölüm sayısı (${bolumler.length}) personel sayısından (${toplamPersonel}) fazla. Her bölüme en az bir kişi atanamaz.`, 'error');
         olusturBtn.disabled = false;
         return;
    }

    try {
        const rotasyonSonucu = atamaAlgoritmasi(personelListesi, bolumler, gecmisData);
        
        renderRotasyonTablosu(rotasyonSonucu);

        // Rotasyon sonucunu Supabase'e kaydet (RLS ile sadece Admin yetkilendirmesi olanlar kaydedebilir)
        await saveRotasyon(rotasyonSonucu);

        displayMessage('Rotasyon başarıyla oluşturuldu ve veritabanına kaydedildi.', 'success');
        
    } catch (error) {
        displayMessage(`Rotasyon oluşturulurken veya kaydedilirken hata oluştu: ${error.message}`, 'error');
        console.error("Rotasyon/Kayıt Hatası:", error);
    } finally {
        olusturBtn.disabled = false;
    }
}

// Rotasyon sonucunu DOM'a yazdıran fonksiyon
function renderRotasyonTablosu(sonuc) {
    let html = '<table class="rotasyon-tablosu"><thead><tr><th>Bölüm</th><th>Atanan Personel</th><th>Kontenjan</th></tr></thead><tbody>';
    
    sonuc.forEach(bolum => {
        const personelAdlari = bolum.atananlar.map(p => p.ad).join(', ');
        html += `<tr><td>${bolum.adi}</td><td>${personelAdlari || 'BOŞ'}</td><td>${bolum.kontenjan}</td></tr>`;
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
                rotasyon_tarihi: bugununTarihi,
                rotasyon_tipi: 'Haftalık' // Bu, kullanıcı girişinden alınmalıdır
            });
        });
    });
    
    const { error } = await supabase.from('rotasyon_gecmisi').insert(dataToInsert);
    if (error) throw error;
}


// Uygulama Başlangıcı
document.addEventListener('DOMContentLoaded', () => {
    olusturBtn.addEventListener('click', olusturRotasyonHandler);
    
    // Auth durumunu dinle (Sayfa yenilense bile oturumu korur)
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            checkAdminStatus();
        } else if (event === 'SIGNED_OUT') {
            checkAdminStatus(); // Çıkış yapınca paneli gizle
        }
    });
    
    // İlk yüklemede kontrol et
    checkAdminStatus();
});