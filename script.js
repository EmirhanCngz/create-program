// =======================================================
// SUPABASE AYARLARI VE GLOBAL DEĞİŞKENLER
// =======================================================
// 🔥 KENDİ SUPABASE PROJE URL'NİZİ BURAYA GİRİN
const supabaseUrl = 'https://omlgfusmwyusfrfotgwq.supabase.co';
// 🔥 KENDİ SUPABASE ANON (PUBLIC) ANAHTARINIZI BURAYA GİRİN
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGdmdXNtd3l1c2ZyZm90Z3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQ5MzIsImV4cCI6MjA4MTE0MDkzMn0.jjOGn5BFxHn819fHeGxUYZPDM9i_QCasd0YlDMBtvqs';

let supabase = null;

let personelListesi = [];
let bolumler = [];
let gecmisData = [];
let rotasyonGecmisi = [];

// Global settings
let rotasyonTipi = 'Haftalık';
let secilenGunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']; // Default olarak hafta içi

// =======================================================
// TÜM KODLAR DOMContentLoaded İÇİNDE YER ALMALIDIR
// =======================================================
document.addEventListener('DOMContentLoaded', () => {

    // --------------------------------------------------
    // A. DOM ELEMANLARINI TANIMLAMA
    // --------------------------------------------------
    const personelSayisiDOM = document.getElementById('personel-sayisi');
    const kontenjanToplamiDOM = document.getElementById('kontenjan-toplami');
    const olusturBtn = document.getElementById('olustur-btn');
    const authPanel = document.getElementById('auth-panel');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplayNameDOM = document.getElementById('user-display-name');
    const statusMessageDOM = document.getElementById('status-message');
    const rotasyonTablosuAlaniDOM = document.getElementById('rotasyon-tablosu-alani');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const adSoyadInput = document.getElementById('ad_soyad');

    // YENİ DİNAMİK ALANLAR
    const bolumForm = document.getElementById('bolum-form');
    const bolumAdiInput = document.getElementById('bolum-adi');
    const bolumKontenjanInput = document.getElementById('bolum-kontenjan');
    const bolumListesiDOM = document.getElementById('bolum-listesi');

    const personelForm = document.getElementById('personel-form');
    const personelAdInput = document.getElementById('personel-ad');
    const personelListesiDOM = document.getElementById('personel-listesi');

    const rotasyonTipiSelect = document.getElementById('rotasyon-tipi');
    const haftalikGunlerKontrolDOM = document.getElementById('haftalik-gunler-kontrol');


    // --------------------------------------------------
    // B. YARDIMCI FONKSİYONLAR
    // --------------------------------------------------

    function displayMessage(text, type = 'none') {
        statusMessageDOM.textContent = text;
        statusMessageDOM.className = `message ${type}`;
    }

    // Yeni: Yönetim Paneli Listelerini Render Eden Ana Fonksiyon
    function renderManagementPanels() {
        // 1. Personel Listesi Render
        // personelListesi artık sadece yönetilen kişileri içeriyor.
        const managedPersonel = personelListesi;

        const personelNames = managedPersonel.map(p => `
        <div class="personel-item" data-id="${p.id}">
            ${p.ad} 
            <button onclick="deletePersonel('${p.id}')">Sil</button>
        </div>
    `).join('');

        personelListesiDOM.innerHTML = `
        <p>Kayıtlı Personel: <strong id="personel-sayisi">${personelListesi.length}</strong></p>
        ${personelNames}
    `;

        // ... (Geri kalan bölüm listesi render kodları aynı kalıyor) ...

        const bolumItems = bolumler.map(b =>
            `<div class="bolum-item" data-id="${b.id}">
            <strong>${b.adi}</strong>: ${b.kontenjan} Kontenjan 
            <button onclick="deleteBolum('${b.id}')">Sil</button>
        </div>`
        ).join('');

        const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);

        bolumListesiDOM.innerHTML = `
        <p>Toplam Kontenjan: <strong id="kontenjan-toplami">${toplamKontenjan}</strong></p>
        ${bolumItems}
    `;
    }

    function renderRotasyonTablosu(sonuc) {
        let html = '<table class="rotasyon-tablosu"><thead><tr><th>Bölüm</th><th>Atanan Personel</th><th>Kontenjan</th></tr></thead><tbody>';

        sonuc.forEach(bolum => {
            const personelAdlari = bolum.atananlar.map(p => p.ad).join(', ');
            html += `<tr><td>${bolum.adi}</td><td>${personelAdlari || 'BOŞ'}</td><td>${bolum.kontenjan}</td></tr>`;
        });

        html += '</tbody></table>';
        rotasyonTablosuAlaniDOM.innerHTML = html;
    }


    // --------------------------------------------------
    // C. KÜTÜPHANE BAŞLATMA MANTIK
    // --------------------------------------------------

    if (window.supabase) {
        supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    } else {
        displayMessage("Supabase kütüphanesi yüklenemedi. Lütfen CDN bağlantısını (index.html) kontrol edin.", 'error');
        console.error("Supabase Kütüphanesi Yükleme Hatası.");
        return;
    }


    // --------------------------------------------------
    // D. AUTH VE EVENT LISTENERS
    // --------------------------------------------------

    // Auth
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loginHandler(emailInput.value, passwordInput.value);
    });

    signupBtn.addEventListener('click', () => {
        signupHandler(emailInput.value, passwordInput.value, adSoyadInput.value);
    });

    logoutBtn.addEventListener('click', logoutHandler);

    // Yönetim Paneli
    olusturBtn.addEventListener('click', olusturRotasyonHandler);
    bolumForm.addEventListener('submit', handleAddBolum);
    personelForm.addEventListener('submit', handleAddPersonel);

    // Rotasyon Ayarları
    rotasyonTipiSelect.addEventListener('change', (e) => {
        rotasyonTipi = e.target.value;
        // Haftalık seçiliyse günleri göster, değilse gizle
        haftalikGunlerKontrolDOM.style.display = rotasyonTipi === 'Haftalık' ? 'block' : 'none';

        // Günlük/Aylıkta gün seçimini boşalt
        if (rotasyonTipi !== 'Haftalık') {
            secilenGunler = [];
        } else {
            // Haftalık seçildiyse checkbox'lardan tekrar topla
            secilenGunler = Array.from(haftalikGunlerKontrolDOM.querySelectorAll('input:checked')).map(c => c.value);
        }
    });

    haftalikGunlerKontrolDOM.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            secilenGunler = Array.from(haftalikGunlerKontrolDOM.querySelectorAll('input:checked')).map(c => c.value);
        });
    });


    // Auth durumu dinleyicisi
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            checkAuthAndLoadData();
        } else if (event === 'SIGNED_OUT') {
            checkAuthAndLoadData();
        }
    });

    checkAuthAndLoadData();

    // =======================================================
    // YENİ CRUD FONKSİYONLARI (Personel & Bölüm)
    // =======================================================

    // 🔥 Silme butonlarının çalışması için global olarak tanımlanması gerekir.
    window.deletePersonel = deletePersonel;
    window.deleteBolum = deleteBolum;

    // --- Personel Yönetimi (managed_personel tablosu) ---

    async function handleAddPersonel(e) {
        // Form gönderimini engelle ve tekrar çalışmasını önle
        e.preventDefault();

        // Değerleri al ve temizle
        const personelAdInput = document.getElementById('personel-ad');
        const personelForm = document.getElementById('personel-form');
        const personelAddButton = personelForm.querySelector('button[type="submit"]');

        const ad_soyad = personelAdInput.value.trim();
        if (!ad_soyad) {
            return; // Boşsa işlem yapma
        }

        // Butonu devre dışı bırak
        personelAddButton.disabled = true;

        // 1. Oturum açmış kullanıcıyı (Yönetici) kontrol et
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            personelAddButton.disabled = false;
            return displayMessage('Lütfen personel eklemek için giriş yapın.', 'error');
        }

        // 2. Mükerrer İsim Kontrolü (Aynı isimde personel var mı?)
        const { data: existingPersonel, error: checkError } = await supabase
            .from('managed_personel')
            .select('id')
            .eq('ad_soyad', ad_soyad)
            .eq('user_id', user.id) // Sadece bu yöneticinin personellerini kontrol et
            .limit(1);

        if (checkError) {
            personelAddButton.disabled = false;
            return displayMessage(`Personel kontrolü sırasında hata: ${checkError.message}`, 'error');
        }

        if (existingPersonel && existingPersonel.length > 0) {
            personelAddButton.disabled = false;
            return displayMessage(`${ad_soyad} isimli personel zaten kayıtlı.`, 'warning');
        }

        // 3. Veritabanına Ekleme (INSERT) işlemi
        const { data, error } = await supabase
            .from('managed_personel')
            .insert({
                ad_soyad: ad_soyad,
                user_id: user.id // Yönetici ID'si eklenmeli (RLS gereksinimi)
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase Personel Ekleme Hatası Detayı:", error);
            // Eğer RLS yetkilendirme hatası varsa, kullanıcıya özel bir mesaj gösteririz.
            if (error.code === '42501') {
                displayMessage('Yetkilendirme Hatası: Bu işlemi yapmaya izniniz yok (RLS). Lütfen RLS ayarlarınızı kontrol edin.', 'error');
            } else {
                displayMessage(`Personel eklenirken kritik hata: ${error.message}`, 'error');
            }
            personelAddButton.disabled = false;
            return;
        }

        // 4. Başarılı Ekleme Sonrası Yerel Listeyi ve Arayüzü Güncelle

        // Yeni eklenen personeli yerel listeye ekle
        personelListesi.push({ id: data.id, ad: data.ad_soyad });

        // Arayüzü yeniden çiz
        renderManagementPanels();

        // Inputu temizle ve butonu etkinleştir
        personelAdInput.value = '';
        personelAddButton.disabled = false;

        displayMessage(`${ad_soyad} başarıyla eklendi.`, 'success');
    }

    async function deletePersonel(id) {
        const { error } = await supabase
            .from('managed_personel')
            .delete()
            .eq('id', id);

        if (error) {
            displayMessage(`Personel silinirken hata: ${error.message}`, 'error');
            return;
        }

        personelListesi = personelListesi.filter(p => p.id !== id);
        renderManagementPanels();
        displayMessage('Personel başarıyla silindi.', 'success');
    }

    // --- Bölüm Yönetimi (bolumler tablosu) ---

    async function handleAddBolum(e) {
        e.preventDefault();
        const bolum_adi = bolumAdiInput.value.trim();
        const kontenjan = parseInt(bolumKontenjanInput.value, 10);

        if (!bolum_adi || kontenjan < 1 || isNaN(kontenjan)) {
            displayMessage('Lütfen geçerli bir bölüm adı ve kontenjan girin.', 'error');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return displayMessage('Lütfen giriş yapın.', 'error');

        const { data, error } = await supabase
            .from('bolumler')
            .insert({ bolum_adi: bolum_adi, kontenjan: kontenjan, user_id: user.id, aktif: true })
            .select()
            .single();

        if (error) {
            displayMessage(`Bölüm eklenirken hata: ${error.message}`, 'error');
            console.error(error);
            return;
        }

        bolumler.push({ id: data.id, adi: data.bolum_adi, kontenjan: data.kontenjan });
        renderManagementPanels();
        bolumAdiInput.value = '';
        bolumKontenjanInput.value = '1';
        displayMessage(`${bolum_adi} başarıyla eklendi.`, 'success');
    }

    async function deleteBolum(id) {
        // 1. Veritabanından silme işlemi
        const { error } = await supabase
            .from('bolumler')
            .delete()
            .eq('id', id);

        if (error) {
            displayMessage(`Bölüm silinirken hata: ${error.message}`, 'error');
            return;
        }

        // 2. 🔥 LOKAL LİSTEYİ GÜNCELLEME 🔥
        bolumler = bolumler.filter(b => b.id !== id);

        // 3. 🔥 ARABİRİMİ YENİLEME 🔥 (Eksik olan kısım burasıydı)
        renderManagementPanels();

        displayMessage('Bölüm başarıyla silindi.', 'success');
    }


    // =======================================================
    // AUTH VE VERİ ÇEKME FONKSİYONLARI
    // =======================================================

    async function checkAuthAndLoadData() {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            // ... auth panel gösterme kısmı ...
            authPanel.style.display = 'block';
            adminPanel.style.display = 'none';
            userDisplayNameDOM.textContent = '';
            return;
        }

        // ... admin panel gösterme kısmı ...
        authPanel.style.display = 'none';
        adminPanel.style.display = 'block';

        // Kullanıcı adını al
        const { data: userData } = await supabase.from('users').select('ad_soyad').eq('id', user.id).single();
        userDisplayNameDOM.textContent = userData ? userData.ad_soyad : user.email;

        // Tüm verileri çek
        fetchInitialData(user.id);
    }

    async function fetchInitialData(currentUserId) {
    try {
        if (!currentUserId) {
            // Kullanıcı ID'si yoksa veri çekme.
            return;
        }

        // 1. Yönetilen Personel Listesini Çekme
        let { data: managedPersonelData, error: mpError } = await supabase
            .from('managed_personel')
            .select('id, ad_soyad')
            .eq('user_id', currentUserId); 

        if (mpError) throw mpError;
        
        // Global personelListesi değişkenini güncelle
        personelListesi = managedPersonelData.map(p => ({ 
            id: p.id, 
            ad: p.ad_soyad 
        }));
        
        // 2. Bölümler Listesini Çekme (Hata düzeltmesi burada yapıldı!)
        // Eğer veritabanınızdaki sütun adı 'bolum_adi' değilse, lütfen bu satırı kendi sütun adınızla değiştirin.
        let { data: bolumData, error: bError } = await supabase
            .from('bolumler')
            .select('id, bolum_adi, kontenjan'); // 🔥 'ad' yerine 'bolum_adi' çekildi 🔥

        if (bError) throw bError;
        
        // Global bolumler değişkenini güncelle ve veriyi standartlaştır (ad/kontenjan)
        bolumler = bolumData.map(b => ({
            id: b.id,
            ad: b.bolum_adi,     // 🔥 b.bolum_adi global 'ad' alanına eşlendi
            kontenjan: b.kontenjan
        }));

        // 3. Rotasyon Geçmişini Çekme
        let { data: gecmisData, error: gecmisError } = await supabase
            .from('rotasyon_gecmisi')
            .select('user_id, bolum_id') 
            .eq('manager_id', currentUserId); 

        if (gecmisError) throw gecmisError;
        
        // Global rotasyonGecmisi değişkenini güncelle
        rotasyonGecmisi = gecmisData; 

        // 4. Arayüzü Güncelleme
        renderManagementPanels();
        
    } catch (error) {
        console.error('Veri yüklenirken hata:', error);
        displayMessage(`Başlangıç verileri yüklenirken hata oluştu: ${error.message}`, 'error');
    }
}

    // ... (loginHandler, signupHandler, logoutHandler fonksiyonları devam ediyor) ...

    async function loginHandler(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            displayMessage(`Giriş Hatası: ${error.message}`, 'error');
        }
    }

    async function signupHandler(email, password, adSoyad) {
        if (!email || !password || !adSoyad) {
            displayMessage("Tüm alanları doldurunuz.", 'error');
            return;
        }
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) {
            displayMessage(`Kayıt Hatası: ${authError.message}`, 'error');
            return;
        }
        if (authData.user) {
            const { error: userInsertError } = await supabase
                .from('users')
                .insert({ id: authData.user.id, ad_soyad: adSoyad, email: email });

            if (userInsertError) {
                console.error("User Insert Error:", userInsertError);
                displayMessage('Kayıt oldu ancak kullanıcı bilgisi kaydedilemedi. (RLS kontrol edin)', 'error');
                return;
            }
            displayMessage('Kayıt başarılı! Lütfen giriş yapın.', 'success');
            emailInput.value = '';
            passwordInput.value = '';
            adSoyadInput.value = '';
        }
    }

    async function logoutHandler() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Çıkış Hatası:', error);
        }
    }


    // =======================================================
    // ROTASYON FONKSİYONLARI (Rotasyon Tipi Dahil Edildi)
    // =======================================================

    // Global tanımlanan personelListesi, bolumler ve rotasyonGecmisi değişkenlerini kullanır.

    function atamaAlgoritmasi() {
        if (personelListesi.length === 0 || bolumler.length === 0) {
            displayMessage("Atama yapmak için personel ve bölüm eklenmiş olmalıdır.", 'warning');
            return [];
        }

        // Rotasyon için gerekli bilgileri hazırlama
        const atanacakPersonel = [...personelListesi]; // Atanacak personelin kopyası
        let mevcutBolumler = bolumler.map(b => ({
            ...b,
            mevcut_kontenjan: b.kontenjan || 1, // Kontenjan yoksa min 1
            atananlar: []
        }));

        // Geçmiş rotasyon frekansını hesapla (Adım 1)
        const personelFrekans = hesaplaPersonelFrekansi();

        // 1. Rastgelelik için personeli karıştır (Adım 3)
        const karistirilmisPersonel = shuffleArray(atanacakPersonel);

        // 2. Zorunlu Atama Fazı (Minimum 1 kişi kuralı için)
        // Her bölüme en az 1 kişi atanana kadar devam et.
        const zorunluAtamaPersoneli = [...karistirilmisPersonel];
        const zorunluAtamaBolumler = [...mevcutBolumler];

        // Bölümleri rastgele karıştır, ilk atama adil olsun
        shuffleArray(zorunluAtamaBolumler);

        // Her bölüme en az 1 kişi ata (Minimum 1 kişi kuralı)
        zorunluAtamaBolumler.forEach(bolum => {
            if (bolum.mevcut_kontenjan > 0 && zorunluAtamaPersoneli.length > 0) {

                // Personel için geçmişi en az olan adayları bul
                const adaylar = zorunluAtamaPersoneli.filter(p => !bolum.atananlar.includes(p.id));

                if (adaylar.length > 0) {
                    // Geçmişe göre ağırlıklandırılmış rastgele personel seç
                    const secilenPersonel = getWeightedRandomPersonel(adaylar, personelFrekans, bolum.id);

                    // Atamayı yap
                    bolum.atananlar.push(secilenPersonel.id);
                    bolum.mevcut_kontenjan--;

                    // Seçilen personeli ana atama listesinden ve zorunlu listeden çıkar
                    removePersonelById(karistirilmisPersonel, secilenPersonel.id);
                    removePersonelById(zorunluAtamaPersoneli, secilenPersonel.id);
                }
            }
        });

        // 3. Kalan Personeli Atama Fazı (Kontenjanları Doldurma)
        // Kalan personeli kontenjan bitene kadar ağırlıklı rastgele atama yap.

        // Personel sayısını bölümlere adil dağıtmak için bölümleri kontenjana göre çoğalt
        let kalanKontenjanHavuzu = [];
        mevcutBolumler.forEach(bolum => {
            // Zorunlu atama sonrası kalan kontenjanı havuza ekle
            for (let i = 0; i < bolum.mevcut_kontenjan; i++) {
                kalanKontenjanHavuzu.push(bolum.id);
            }
        });

        // Kontenjan havuzunu karıştır
        shuffleArray(kalanKontenjanHavuzu);

        // Kalan her personel için atama yap
        karistirilmisPersonel.forEach(personel => {
            if (kalanKontenjanHavuzu.length === 0) return; // Kontenjan kalmadıysa dur

            // Personel için geçmişi en az olan aday bölümleri bul
            const adayBolumler = kalanKontenjanHavuzu.map(bolumId => mevcutBolumler.find(b => b.id === bolumId));

            // Geçmişe göre ağırlıklandırılmış rastgele bölüm seç (Adım 2)
            const secilenBolumId = getWeightedRandomBolum(adayBolumler, personelFrekans[personel.id] || {}, kalanKontenjanHavuzu);

            if (secilenBolumId) {
                const secilenBolum = mevcutBolumler.find(b => b.id === secilenBolumId);

                secilenBolum.atananlar.push(personel.id);
                secilenBolum.mevcut_kontenjan--;

                // Havuzdan bu kontenjanı çıkar (Adil dağıtım)
                const index = kalanKontenjanHavuzu.indexOf(secilenBolumId);
                if (index > -1) {
                    kalanKontenjanHavuzu.splice(index, 1);
                }
            }
        });


        // 4. Sonuçları Rotasyon Formatına Çevirme
        const rotasyonSonuclari = [];
        mevcutBolumler.forEach(bolum => {
            bolum.atananlar.forEach(personelId => {
                const personel = personelListesi.find(p => p.id === personelId);
                if (personel) {
                    rotasyonSonuclari.push({
                        user_id: personelId,
                        ad_soyad: personel.ad,
                        bolum_id: bolum.id,
                        bolum_adi: bolum.ad
                    });
                }
            });
        });

        return rotasyonSonuclari;
    }

    // YARDIMCI FONKSİYONLAR

    /**
     * Personelin geçmiş rotasyon frekansını hesaplar.
     */
    function hesaplaPersonelFrekansi() {
        const frekans = {};
        rotasyonGecmisi.forEach(gecmis => {
            if (!frekans[gecmis.user_id]) {
                frekans[gecmis.user_id] = {};
            }
            frekans[gecmis.user_id][gecmis.bolum_id] = (frekans[gecmis.user_id][gecmis.bolum_id] || 0) + 1;
        });
        return frekans;
    }

    /**
     * Bir diziyi karıştırır (Fisher-Yates algoritması).
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Bir personel listesinden ID'ye göre kişiyi çıkarır.
     */
    function removePersonelById(array, id) {
        const index = array.findIndex(p => p.id === id);
        if (index > -1) {
            array.splice(index, 1);
        }
    }

    /**
     * Personelin geçmiş frekansına göre ağırlıklı rastgele bölüm seçer.
     * Geçmişte AZ çalışılan bölüme yüksek şans verir.
     */
    function getWeightedRandomBolum(adayBolumler, personelGecmisi, kalanKontenjanHavuzu) {
        let agirliklar = [];
        let toplamAgirlik = 0;

        const benzersizAdayBolumIdler = [...new Set(adayBolumler.map(b => b.id))];

        benzersizAdayBolumIdler.forEach(bolumId => {
            const calismaSayisi = personelGecmisi[bolumId] || 0;

            // 🔥 Ağırlıklandırma Mantığı: Çalışma sayısı ne kadar azsa, ağırlık o kadar yüksek olur.
            // Örnek: Hiç çalışmadıysa (0) -> Ağırlık 5 olsun. 4 kez çalıştıysa -> Ağırlık 1 olsun.
            // Güçlü bir rastgelelik ve geçmiş önceliği için sabitler ayarlanabilir.
            const agirlik = Math.max(1, 5 - calismaSayisi);

            // Bu ağırlık kadar, bölümü seçme havuzuna ekle
            for (let i = 0; i < agirlik; i++) {
                agirliklar.push(bolumId);
                toplamAgirlik++;
            }
        });

        if (agirliklar.length === 0) return null;

        // Ağırlıklandırılmış havuzdan rastgele seçim yap
        const randomIndex = Math.floor(Math.random() * agirliklar.length);
        return agirliklar[randomIndex];
    }

    /**
     * Bölüm için ağırlıklı rastgele personel seçer (Zorunlu atama fazı için kullanılabilir).
     */
    function getWeightedRandomPersonel(adayPersonel, personelFrekans, bolumId) {
        let agirliklar = [];
        let toplamAgirlik = 0;

        adayPersonel.forEach(personel => {
            const gecmis = personelFrekans[personel.id] || {};
            const calismaSayisi = gecmis[bolumId] || 0;

            // Mantık: Bu bölüme hiç atanmamış personele daha yüksek şans ver.
            const agirlik = Math.max(1, 5 - calismaSayisi);

            for (let i = 0; i < agirlik; i++) {
                agirliklar.push(personel);
                toplamAgirlik++;
            }
        });

        // Ağırlıklandırılmış havuzdan rastgele seçim yap
        const randomIndex = Math.floor(Math.random() * agirliklar.length);
        return agirliklar[randomIndex];
    }

    async function olusturRotasyonHandler() {
        displayMessage('Rotasyon ataması başlatılıyor...', 'info');

        try {
            // 1. Gelişmiş Atama Algoritmasını Çalıştır
            const rotasyonlar = atamaAlgoritmasi();

            if (rotasyonlar.length === 0) {
                return displayMessage('Atama algoritması boş sonuç döndürdü. Personel, Bölüm veya Kontenjanları kontrol edin.', 'warning');
            }

            // Rotasyonları arayüze yansıt (Bu fonksiyonun zaten tanımlı olduğunu varsayıyoruz)
            renderRotasyon(rotasyonlar);

            // 2. Rotasyon Geçmişini Kaydetme

            // Oturum açmış kullanıcıyı (Yönetici) al
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Oturum açmış yönetici bulunamadı. Kayıt yapılamaz.');
            }

            // Kaydedilecek veriyi hazırlama
            const bugununTarihi = new Date().toISOString().split('T')[0];

            const dataToInsert = rotasyonlar.map(r => ({
                user_id: r.user_id,         // Atanan Personel ID'si (managed_personel'den)
                bolum_id: r.bolum_id,       // Atanan Bölüm ID'si (bolumler'den)
                rotasyon_tarihi: bugununTarihi,
                manager_id: user.id         // Rotasyonu oluşturan Yönetici ID'si
            }));

            // Veritabanına kaydetme (RLS ve Foreign Key hataları artık çözülmüş olmalı)
            const { error: insertError } = await supabase
                .from('rotasyon_gecmisi')
                .insert(dataToInsert);

            if (insertError) {
                console.error('Rotasyon Geçmişi Kayıt Hatası:', insertError);
                throw new Error(`Geçmişe kayıt sırasında Supabase hatası: ${insertError.message}`);
            }

            // 3. Başarı Mesajı ve Güncelleme

            // Yerel rotasyon geçmişi listesini güncellemek için verileri yeniden çek
            await fetchInitialData(user.id);

            displayMessage('Rotasyon başarıyla oluşturuldu ve geçmişe kaydedildi.', 'success');

        } catch (error) {
            console.error('Genel Rotasyon Oluşturma Hatası:', error);
            displayMessage(`Rotasyon oluşturulurken veya kaydedilirken hata oluştu: ${error.message}`, 'error');
        }
    }

    // Rotasyon Tipi veritabanına kaydediliyor
    async function saveRotasyon(sonuc, rotationType) {

        // 🔥 YENİ KISIM: Yönetici ID'sini al
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Giriş yapılmamış. Kayıt işlemi iptal edildi.");
        const managerId = user.id;

        const dataToInsert = [];
        const bugununTarihi = new Date().toISOString().split('T')[0];

        sonuc.forEach(bolum => {
            bolum.atananlar.forEach(personel => {
                dataToInsert.push({
                    user_id: personel.id, // Rotasyona tabi tutulan personel
                    bolum_id: bolum.id,
                    rotasyon_tarihi: bugununTarihi,
                    rotasyon_tipi: rotationType,
                    manager_id: managerId // 🔥 RLS hatasını çözen ID
                });
            });
        });

        const { error } = await supabase.from('rotasyon_gecmisi').insert(dataToInsert);
        if (error) throw error;
    }

}); // DOMContentLoaded sonu