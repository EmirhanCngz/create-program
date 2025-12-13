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
let rotasyonGecmisi = []; // Global rotasyon geçmişi (atama algoritması için kritik)

// Global settings
let rotasyonTipi = 'Haftalık';
let secilenGunler = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']; // Default olarak hafta içi

// --------------------------------------------------
// A. DOM ELEMANLARINI GLOBAL OLARAK TANIMLAMA
// --------------------------------------------------
// Tüm DOM elemanlarını burada çekiyoruz. DOMContentLoaded içinde tekrar çekmeyeceğiz.
let personelSayisiDOM;
let kontenjanToplamiDOM;
let olusturBtn;
let authPanel;
let adminPanel;
let loginForm;
let signupBtn;
let logoutBtn;
let userDisplayNameDOM;
let statusMessageDOM;
let baslangicTarihiInput;

// YENİ DİNAMİK ALANLAR
let bolumForm;
let bolumAdInput; // ID: bolum-adi
let kontenjanInput; // ID: bolum-kontenjan
let bolumListesiDOM;

let personelForm;
let personelAdInput;
let personelListesiDOM;

let rotasyonTipiSelect;
let haftalikGunlerKontrolDOM;

// =======================================================
// TÜM KODLAR DOMContentLoaded İÇİNDE YER ALMALIDIR
// =======================================================
document.addEventListener('DOMContentLoaded', () => {

    // --------------------------------------------------
    // A. DOM ELEMENTLERİNİ ALMA (Atamalar)
    // --------------------------------------------------
    const emailInput = document.getElementById('email');
    baslangicTarihiInput = document.getElementById('baslangic-tarihi');
    personelSayisiDOM = document.getElementById('personel-sayisi');
    kontenjanToplamiDOM = document.getElementById('kontenjan-toplami');
    olusturBtn = document.getElementById('olustur-btn');
    authPanel = document.getElementById('auth-panel');
    adminPanel = document.getElementById('admin-panel');
    loginForm = document.getElementById('login-form');
    signupBtn = document.getElementById('signup-btn');
    logoutBtn = document.getElementById('logout-btn');
    userDisplayNameDOM = document.getElementById('user-display-name');
    statusMessageDOM = document.getElementById('status-message');

    // YENİ DİNAMİK ALANLARIN KESİN EŞLEŞEN ID'LERİ
    bolumForm = document.getElementById('bolum-form');
    bolumAdInput = document.getElementById('bolum-adi'); // 🔥 ID EŞLEŞTİ
    kontenjanInput = document.getElementById('bolum-kontenjan'); // 🔥 ID EŞLEŞTİ
    bolumListesiDOM = document.getElementById('bolum-listesi');

    personelForm = document.getElementById('personel-form');
    personelAdInput = document.getElementById('personel-ad');
    personelListesiDOM = document.getElementById('personel-listesi');

    rotasyonTipiSelect = document.getElementById('rotasyon-tipi');
    haftalikGunlerKontrolDOM = document.getElementById('haftalik-gunler-kontrol');


    // --------------------------------------------------
    // B. YARDIMCI FONKSİYONLAR
    // --------------------------------------------------

    /**
 * Rotasyon sonuçlarını takvim formatında (görseldeki gibi) gösterir.
 * @param {Array} takvimselRotasyonlar - Tarih, gün ve o güne ait atamaları içeren 4 haftalık liste.
 */
    function renderRotasyonTakvimi(takvimselRotasyonlar) {
        const rotasyonSonucDiv = document.getElementById('rotasyon-sonuc-alani');
        if (!rotasyonSonucDiv) return;

        if (takvimselRotasyonlar.length === 0) {
            rotasyonSonucDiv.innerHTML = '<p class="text-warning">Seçilen günler için takvim oluşturulamadı.</p>';
            return;
        }

        // Bölüm Başlıklarını Hazırla
        const mevcutBolumler = bolumler.map(b => ({
            ad: b.ad,
            kontenjan: b.kontenjan
        }));

        // Rotasyon Takvim HTML Başlangıcı
        let html = '<h2>Rotasyon Takvimi</h2>';
        html += '<table class="table table-bordered rotasyon-takvimi">';

        // 1. Tablo Başlığı (Header): Bölüm Adları ve Kontenjanları
        html += '<thead><tr><th>BÖLÜMLER → <br> GÜNLER ↓</th>';
        mevcutBolumler.forEach(b => {
            html += `<th>${b.ad} (${b.kontenjan})</th>`;
        });
        html += '</tr></thead><tbody>';

        // 2. Takvimsel Rotasyonları Çizme
        takvimselRotasyonlar.forEach(takvimGunu => {

            // Tarih Sütunu (11.11.2025 Perşembe formatında)
            const tarihDate = new Date(takvimGunu.tarih);
            const gunAdi = getGunAdi(tarihDate.getDay());
            const tarihFormatli = `${('0' + tarihDate.getDate()).slice(-2)}.${('0' + (tarihDate.getMonth() + 1)).slice(-2)}.${tarihDate.getFullYear()} ${gunAdi}`;

            html += `<tr><td>${tarihFormatli}</td>`;

            mevcutBolumler.forEach(bolum => {
                // Bu bölüme atanan personelleri bul
                const atananPersoneller = takvimGunu.rotasyon
                    .filter(r => r.bolum_adi === bolum.ad)
                    .map(r => r.ad_soyad);

                // Personelleri <br> ile ayırarak hücreye ekle
                const personelListesiHtml = atananPersoneller.join('<br>');

                html += `<td>${personelListesiHtml}</td>`;
            });

            html += '</tr>';
        });

        html += '</tbody></table>';
        rotasyonSonucDiv.innerHTML = html;
    }

    // Yardımcı fonksiyonlar (mevcut kodda olmalı, burada tamlık için tekrar eklenmiştir)
    function getGunAdi(dayIndex) {
        const gunler = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return gunler[dayIndex];
    }

    // Javascript Date objesi için gün index'i (Pazar=0, P.tesi=1... Cmt=6)
    function getGunIndex(jsDayIndex) {
        return jsDayIndex;
    }

    function displayMessage(text, type = 'none') {
        if (!statusMessageDOM) return; // DOM elementi yüklenmediyse hata vermemek için kontrol
        statusMessageDOM.textContent = text;
        statusMessageDOM.className = `message ${type}`;
    }

    // Yeni: Yönetim Paneli Listelerini Render Eden Ana Fonksiyon
    function renderManagementPanels() {
        if (!personelListesiDOM || !bolumListesiDOM) return;

        // 1. Personel Listesi Render
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

        // 2. Bölüm Listesi Render
        const bolumItems = bolumler.map(b =>
            `<div class="bolum-item" data-id="${b.id}">
            <strong>${b.ad}</strong>: ${b.kontenjan} Kontenjan 
            <button onclick="deleteBolum('${b.id}')">Sil</button>
        </div>`
        ).join('');

        const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);

        bolumListesiDOM.innerHTML = `
        <p>Toplam Kontenjan: <strong id="kontenjan-toplami">${toplamKontenjan}</strong></p>
        ${bolumItems}
    `;
    }

    // Rotasyon ataması sonucunu arayüze yansıtan fonksiyon
    function renderRotasyon(rotasyonlar) {
        const rotasyonSonucDiv = document.getElementById('rotasyon-sonuc-alani');

        if (!rotasyonSonucDiv) {
            console.error('Rotasyon sonuç alanı DIV bulunamadı.');
            return;
        }

        if (rotasyonlar.length === 0) {
            rotasyonSonucDiv.innerHTML = '<p class="text-warning">Atanan rotasyon bulunamadı.</p>';
            return;
        }

        let html = '<h2>Atama Sonuçları</h2>';
        html += '<table class="table table-striped">';
        html += '<thead><tr><th>Personel Adı</th><th>Atandığı Bölüm</th></tr></thead>';
        html += '<tbody>';

        rotasyonlar.forEach(r => {
            html += `<tr><td>${r.ad_soyad}</td><td>${r.bolum_adi}</td></tr>`;
        });

        html += '</tbody></table>';

        rotasyonSonucDiv.innerHTML = html;
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
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            loginHandler(emailInput.value, passwordInput.value);
        });
    }

    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const adSoyadInput = document.getElementById('ad_soyad');
            signupHandler(emailInput.value, passwordInput.value, adSoyadInput.value);
        });
    }

    if (logoutBtn) logoutBtn.addEventListener('click', logoutHandler);

    // Yönetim Paneli
    if (olusturBtn) olusturBtn.addEventListener('click', olusturRotasyonHandler);
    if (bolumForm) bolumForm.addEventListener('submit', handleAddBolum); // 🔥 Bölüm formu dinleniyor
    if (personelForm) personelForm.addEventListener('submit', handleAddPersonel);

    // Rotasyon Ayarları
    if (rotasyonTipiSelect && haftalikGunlerKontrolDOM) {
        rotasyonTipiSelect.addEventListener('change', (e) => {
            rotasyonTipi = e.target.value;
            haftalikGunlerKontrolDOM.style.display = rotasyonTipi === 'Haftalık' ? 'block' : 'none';

            if (rotasyonTipi !== 'Haftalık') {
                secilenGunler = [];
            } else {
                secilenGunler = Array.from(haftalikGunlerKontrolDOM.querySelectorAll('input:checked')).map(c => c.value);
            }
        });

        haftalikGunlerKontrolDOM.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                secilenGunler = Array.from(haftalikGunlerKontrolDOM.querySelectorAll('input:checked')).map(c => c.value);
            });
        });
    }


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
        e.preventDefault();

        if (!personelForm || !personelAdInput) return; // Null kontrolü

        const personelAddButton = personelForm.querySelector('button[type="submit"]');
        const ad_soyad = personelAdInput.value.trim();

        if (!ad_soyad) return;

        personelAddButton.disabled = true;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            personelAddButton.disabled = false;
            return displayMessage('Lütfen personel eklemek için giriş yapın.', 'error');
        }

        // 2. Mükerrer İsim Kontrolü
        const { data: existingPersonel, error: checkError } = await supabase
            .from('managed_personel')
            .select('id')
            .eq('ad_soyad', ad_soyad)
            .eq('user_id', user.id)
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
                user_id: user.id
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase Personel Ekleme Hatası Detayı:", error);
            if (error.code === '42501') {
                displayMessage('Yetkilendirme Hatası: Bu işlemi yapmaya izniniz yok (RLS). Lütfen RLS ayarlarınızı kontrol edin.', 'error');
            } else {
                displayMessage(`Personel eklenirken kritik hata: ${error.message}`, 'error');
            }
            personelAddButton.disabled = false;
            return;
        }

        // 4. Başarılı Ekleme Sonrası
        personelListesi.push({ id: data.id, ad: data.ad_soyad });
        renderManagementPanels();
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

        // Elementlerin DOMContentLoaded içinde çekildiğinden emin olunuyor.
        if (!bolumAdInput || !kontenjanInput || !bolumForm) {
            console.error("Kritik Hata: Bölüm Formu elementleri bulunamadı. Lütfen HTML ID'lerini doğrulayın.");
            displayMessage("Form alanlarına ulaşılamıyor. Lütfen HTML ID'lerini doğrulayın.", 'error');
            return;
        }

        const bolumAddButton = bolumForm.querySelector('button[type="submit"]');

        const bolumAd = bolumAdInput.value.trim();
        const kontenjan = parseInt(kontenjanInput.value);

        // Giriş Kontrolü
        if (!bolumAd || isNaN(kontenjan) || kontenjan < 1) {
            displayMessage('Lütfen geçerli bir bölüm adı ve en az 1 olan kontenjan girin.', 'warning');
            return;
        }

        bolumAddButton.disabled = true;

        // 1. Mükerrer İsim Kontrolü (bolum_adi sütunu kullanıldı)
        const { data: existingBolum, error: checkError } = await supabase
            .from('bolumler')
            .select('id')
            .eq('bolum_adi', bolumAd)
            .limit(1);

        if (checkError) {
            bolumAddButton.disabled = false;
            return displayMessage(`Bölüm kontrolü sırasında hata: ${checkError.message}`, 'error');
        }

        if (existingBolum && existingBolum.length > 0) {
            bolumAddButton.disabled = false;
            return displayMessage(`${bolumAd} isimli bölüm zaten kayıtlı. Başka bir isim kullanın.`, 'warning');
        }

        // 2. Veritabanına Ekleme (INSERT) işlemi
        const { data, error } = await supabase
            .from('bolumler')
            .insert({ bolum_adi: bolumAd, kontenjan: kontenjan })
            .select()
            .single();

        if (error) {
            console.error("Supabase Bölüm Ekleme Hatası Detayı:", error);
            bolumAddButton.disabled = false;

            if (error.code === '42501') {
                displayMessage('Yetkilendirme Hatası (RLS): Bölüm ekleme izniniz yok. Lütfen RLS ayarlarınızı kontrol edin.', 'error');
            } else {
                displayMessage(`Bölüm eklenirken kritik hata: ${error.message}`, 'error');
            }
            return;
        }

        // 3. Başarılı Ekleme Sonrası
        bolumler.push({
            id: data.id,
            ad: data.bolum_adi, // bolum_adi, global 'ad' alanına atanmalı
            kontenjan: data.kontenjan
        });

        renderManagementPanels();

        bolumAdInput.value = '';
        kontenjanInput.value = '';
        bolumAddButton.disabled = false;
        displayMessage(`${bolumAd} başarıyla eklendi.`, 'success');
    }

    async function deleteBolum(id) {
        // 1. Veritabanından silme işlemi
        const { error } = await supabase
            .from('bolumler')
            .delete()
            .eq('id', id);

        if (error) {
            displayMessage(`Bölüm silinirken kritik hata: ${error.message}`, 'error');
            return;
        }

        // 2. Başarılı silme mesajını göster
        displayMessage('Bölüm başarıyla silindi.', 'success');

        // 3. 🔥🔥 EN KRİTİK ADIM: Verileri Supabase'den YENİDEN ÇEK ve Arayüzü Güncelle 🔥🔥
        // Bu, lokal bolumler dizisini filtrelemek yerine, veritabanındaki güncel durumu alır.
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await fetchInitialData(user.id); // fetchInitialData, bolumler dizisini ve arayüzü günceller.
        }
    }


    // =======================================================
    // AUTH VE VERİ ÇEKME FONKSİYONLARI
    // =======================================================

    async function checkAuthAndLoadData() {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            if (authPanel && adminPanel) {
                authPanel.style.display = 'block';
                adminPanel.style.display = 'none';
            }
            if (userDisplayNameDOM) userDisplayNameDOM.textContent = '';
            return;
        }

        if (authPanel && adminPanel) {
            authPanel.style.display = 'none';
            adminPanel.style.display = 'block';
        }

        // Kullanıcı adını al
        const { data: userData } = await supabase.from('users').select('ad_soyad').eq('id', user.id).single();
        if (userDisplayNameDOM) userDisplayNameDOM.textContent = userData ? userData.ad_soyad : user.email;

        // Tüm verileri çek
        fetchInitialData(user.id);
    }

    async function fetchInitialData(currentUserId) {
        try {
            if (!currentUserId) return;

            // 1. Yönetilen Personel Listesini Çekme
            let { data: managedPersonelData, error: mpError } = await supabase
                .from('managed_personel')
                .select('id, ad_soyad')
                .eq('user_id', currentUserId);

            if (mpError) throw mpError;

            personelListesi = managedPersonelData.map(p => ({
                id: p.id,
                ad: p.ad_soyad
            }));

            // 2. Bölümler Listesini Çekme
            let { data: bolumData, error: bError } = await supabase
                .from('bolumler')
                .select('id, bolum_adi, kontenjan');

            if (bError) throw bError;

            bolumler = bolumData.map(b => ({
                id: b.id,
                ad: b.bolum_adi, // b.bolum_adi global 'ad' alanına eşlendi
                kontenjan: b.kontenjan
            }));

            // 3. Rotasyon Geçmişini Çekme
            let { data: gecmisData, error: gecmisError } = await supabase
                .from('rotasyon_gecmisi')
                .select('user_id, bolum_id')
                .eq('manager_id', currentUserId);

            if (gecmisError) throw gecmisError;

            rotasyonGecmisi = gecmisData;

            // 4. Arayüzü Güncelleme
            renderManagementPanels();

        } catch (error) {
            console.error('Veri yüklenirken hata:', error);
            displayMessage(`Başlangıç verileri yüklenirken hata oluştu: ${error.message}`, 'error');
        }
    }

    // Auth fonksiyonları
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
            // Inputlar DOMContentLoaded içinde çekildiği için burada tekrar çekmeye gerek yok.
            document.getElementById('email').value = '';
            document.getElementById('password').value = '';
            document.getElementById('ad_soyad').value = '';
        }
    }

    async function logoutHandler() {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Çıkış Hatası:', error);
        }
    }


    // =======================================================
    // ROTASYON FONKSİYONLARI (Algoritma ve Handler)
    // =======================================================

    // Global tanımlanan personelListesi, bolumler ve rotasyonGecmisi değişkenlerini kullanır.

    function atamaAlgoritmasi() {
        if (personelListesi.length === 0 || bolumler.length === 0) {
            displayMessage("Atama yapmak için personel ve bölüm eklenmiş olmalıdır.", 'warning');
            return [];
        }

        // Rotasyon için gerekli bilgileri hazırlama
        const atanacakPersonel = [...personelListesi];
        let mevcutBolumler = bolumler.map(b => ({
            ...b,
            mevcut_kontenjan: b.kontenjan || 1,
            atananlar: []
        }));

        // Geçmiş rotasyon frekansını hesapla
        const personelFrekans = hesaplaPersonelFrekansi();

        // 1. Rastgelelik için personeli karıştır
        const karistirilmisPersonel = shuffleArray(atanacakPersonel);

        // 2. Zorunlu Atama Fazı (Minimum 1 kişi kuralı için)
        const zorunluAtamaPersoneli = [...karistirilmisPersonel];
        const zorunluAtamaBolumler = [...mevcutBolumler];
        shuffleArray(zorunluAtamaBolumler);

        zorunluAtamaBolumler.forEach(bolum => {
            if (bolum.mevcut_kontenjan > 0 && zorunluAtamaPersoneli.length > 0) {
                const adaylar = zorunluAtamaPersoneli.filter(p => !bolum.atananlar.includes(p.id));

                if (adaylar.length > 0) {
                    const secilenPersonel = getWeightedRandomPersonel(adaylar, personelFrekans, bolum.id);

                    if (secilenPersonel) {
                        bolum.atananlar.push(secilenPersonel.id);
                        bolum.mevcut_kontenjan--;

                        removePersonelById(karistirilmisPersonel, secilenPersonel.id);
                        removePersonelById(zorunluAtamaPersoneli, secilenPersonel.id);
                    }
                }
            }
        });

        // 3. Kalan Personeli Atama Fazı (Kontenjanları Doldurma)
        let kalanKontenjanHavuzu = [];
        mevcutBolumler.forEach(bolum => {
            for (let i = 0; i < bolum.mevcut_kontenjan; i++) {
                kalanKontenjanHavuzu.push(bolum.id);
            }
        });
        shuffleArray(kalanKontenjanHavuzu);

        karistirilmisPersonel.forEach(personel => {
            if (kalanKontenjanHavuzu.length === 0) return;

            // Personel için atanabileceği tüm bölümleri havuza al
            const adayBolumler = kalanKontenjanHavuzu.map(bolumId => mevcutBolumler.find(b => b.id === bolumId));

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

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function removePersonelById(array, id) {
        const index = array.findIndex(p => p.id === id);
        if (index > -1) {
            array.splice(index, 1);
        }
    }

    function getWeightedRandomBolum(adayBolumler, personelGecmisi, kalanKontenjanHavuzu) {
        let agirliklar = [];

        const benzersizAdayBolumIdler = [...new Set(adayBolumler.map(b => b.id).filter(id => id !== undefined))];

        benzersizAdayBolumIdler.forEach(bolumId => {
            const calismaSayisi = personelGecmisi[bolumId] || 0;

            // Çalışma sayısı ne kadar azsa, ağırlık o kadar yüksek olur.
            const agirlik = Math.max(1, 5 - calismaSayisi);

            for (let i = 0; i < agirlik; i++) {
                agirliklar.push(bolumId);
            }
        });

        if (agirliklar.length === 0) return null;

        // Ağırlıklandırılmış havuzdan rastgele seçim yap
        const randomIndex = Math.floor(Math.random() * agirliklar.length);
        return agirliklar[randomIndex];
    }

    function getWeightedRandomPersonel(adayPersonel, personelFrekans, bolumId) {
        let agirliklar = [];

        adayPersonel.forEach(personel => {
            const gecmis = personelFrekans[personel.id] || {};
            const calismaSayisi = gecmis[bolumId] || 0;

            // Mantık: Bu bölüme hiç atanmamış personele daha yüksek şans ver.
            const agirlik = Math.max(1, 5 - calismaSayisi);

            for (let i = 0; i < agirlik; i++) {
                agirliklar.push(personel);
            }
        });

        if (agirliklar.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * agirliklar.length);
        return agirliklar[randomIndex];
    }

    async function olusturRotasyonHandler() {
        displayMessage('Rotasyon takvimi oluşturuluyor...', 'info');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error('Oturum açmış yönetici bulunamadı. Kayıt yapılamaz.');
            }

            const baslangicTarihiStr = baslangicTarihiInput.value;
            if (!baslangicTarihiStr || personelListesi.length === 0 || bolumler.length === 0) {
                return displayMessage('Lütfen başlangıç tarihi seçin ve personel/bölüm ekleyin.', 'warning');
            }

            // 4 Haftalık periyot için rotasyonları hesaplama
            const ROTASYON_SURESI_HAFTA = 4;
            const toplamGunSayisi = ROTASYON_SURESI_HAFTA * 7;
            const baslangicTarihi = new Date(baslangicTarihiStr);
            let simdikiTarih = new Date(baslangicTarihi);

            const takvimselRotasyonlar = []; // Tüm 4 haftalık periyodu tutacak ana yapı
            let haftalikRotasyonSonucu = null; // Haftalık mod için sabit tutulacak rotasyon sonucu

            let kaydedilecekGecmis = []; // Veritabanına kaydedilecek geçmiş listesi

            for (let i = 0; i < toplamGunSayisi; i++) {
                const gunAdi = getGunAdi(simdikiTarih.getDay());
                const tarihStr = simdikiTarih.toISOString().split('T')[0];
                const isPazartesi = simdikiTarih.getDay() === 1; // 1 = Pazartesi

                // Sadece seçilen günlerde işlem yap
                if (secilenGunler.includes(gunAdi)) {
                    let gununRotasyonu = [];

                    if (rotasyonTipi === 'Günlük') {
                        // Günlük Rotasyon: Her gün için yeni atama algoritması çalıştır
                        gununRotasyonu = atamaAlgoritmasi();

                    } else if (rotasyonTipi === 'Haftalık') {
                        // Haftalık Rotasyon: Haftada bir (Pazartesi'de) yeni atama yap
                        if (isPazartesi || haftalikRotasyonSonucu === null) {
                            haftalikRotasyonSonucu = atamaAlgoritmasi();
                        }
                        gununRotasyonu = haftalikRotasyonSonucu;
                    }

                    // Takvimsel Rotasyona ekle
                    takvimselRotasyonlar.push({
                        tarih: tarihStr,
                        gun: gunAdi,
                        rotasyon: gununRotasyonu
                    });

                    // Rotasyon Geçmişine Kaydedilecek Veriyi hazırla (Sadece Günlük veya Haftanın İlk Günü için)
                    if (gununRotasyonu.length > 0) {
                        gununRotasyonu.forEach(r => {
                            kaydedilecekGecmis.push({
                                user_id: r.user_id,
                                bolum_id: r.bolum_id,
                                rotasyon_tarihi: tarihStr,
                                manager_id: user.id,
                                rotasyon_tipi: rotasyonTipi
                            });
                        });
                    }
                }

                // Tarihi bir gün ilerlet
                simdikiTarih.setDate(simdikiTarih.getDate() + 1);
            }

            if (takvimselRotasyonlar.length === 0) {
                return displayMessage('Seçilen günler için rotasyon oluşturulamadı. Seçimlerinizi kontrol edin.', 'warning');
            }

            // 1. Rotasyonları arayüze yansıt
            renderRotasyonTakvimi(takvimselRotasyonlar, rotasyonTipi);

            // 2. Rotasyon Geçmişini Kaydetme (Tüm 4 haftalık veriyi tek seferde kaydet)
            if (kaydedilecekGecmis.length > 0) {
                const { error: insertError } = await supabase
                    .from('rotasyon_gecmisi')
                    .insert(kaydedilecekGecmis);

                if (insertError) {
                    console.error('Rotasyon Geçmişi Kayıt Hatası:', insertError);
                    throw new Error(`Geçmişe kayıt sırasında Supabase hatası: ${insertError.message}`);
                }
            }

            // 3. Başarı Mesajı ve Güncelleme
            await fetchInitialData(user.id);
            displayMessage('Rotasyon takvimi başarıyla oluşturuldu ve geçmişe kaydedildi.', 'success');

        } catch (error) {
            console.error('Genel Rotasyon Oluşturma Hatası:', error);
            displayMessage(`Rotasyon oluşturulurken veya kaydedilirken hata oluştu: ${error.message}`, 'error');
        }
    }

}); // DOMContentLoaded sonu