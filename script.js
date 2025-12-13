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
        e.preventDefault();
        const ad_soyad = personelAdInput.value.trim();
        if (!ad_soyad) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return displayMessage('Lütfen giriş yapın.', 'error');

        const { data, error } = await supabase
            .from('managed_personel')
            .insert({ ad_soyad: ad_soyad, user_id: user.id })
            .select()
            .single();

        if (error) {
            displayMessage(`Personel eklenirken hata: ${error.message}`, 'error');
            console.error(error);
            return;
        }

        personelListesi.push({ id: data.id, ad: data.ad_soyad });
        renderManagementPanels();
        personelAdInput.value = '';
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
        const { error } = await supabase
            .from('bolumler')
            .delete()
            .eq('id', id);

        if (error) {
            displayMessage(`Bölüm silinirken hata: ${error.message}`, 'error');
            return;
        }

        bolumler = bolumler.filter(b => b.id !== id);
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
            // Yöneticinin profil verisini sadece Hoş Geldiniz mesajı için çekiyoruz
            let { data: currentUserData, error: userError } = await supabase
                .from('users')
                .select('id, ad_soyad')
                .eq('id', currentUserId)
                .single();

            if (userError || !currentUserData) throw new Error("Kullanıcı verisi bulunamadı.");

            // 🔥 DEĞİŞİKLİK BURADA 🔥: Yöneticiyi personelListesi'ne EKLEMİYORUZ.
            personelListesi = []; // Listeyi sıfırlıyoruz.

            // 2. Yönetilen Personel Listesi
            let { data: managedPersonelData, error: mpError } = await supabase
                .from('managed_personel')
                .select('id, ad_soyad');

            if (mpError) throw mpError;

            // Yönetilen personeli listeye ekle
            managedPersonelData.forEach(p => {
                personelListesi.push({ id: p.id, ad: p.ad_soyad });
            });

            // ... (3. Bölüm Verisi ve 4. Geçmiş Rotasyon Verisi çekme kodları aynı kalıyor) ...

            // 3. Bölüm Verisi
            let { data: bolumlerData, error: bolumError } = await supabase
                .from('bolumler')
                .select('id, bolum_adi, kontenjan');

            if (bolumError) throw bolumError;
            bolumler = bolumlerData.map(b => ({ id: b.id, adi: b.bolum_adi, kontenjan: b.kontenjan }));

            // 4. Geçmiş Rotasyon Verisi
            let { data: gecmis, error: gecmisError } = await supabase
                .from('rotasyon_gecmisi')
                .select('user_id, bolum_id');

            if (gecmisError) throw gecmisError;
            gecmisData = gecmis.map(g => ({ userId: g.user_id, bolumId: g.bolum_id }));

            renderManagementPanels();
            displayMessage('Veriler başarıyla yüklendi.', 'success');

        } catch (error) {
            console.error("Veri çekilirken RLS/DB Hatası:", error.message);
            displayMessage(`Veri yüklenirken hata: ${error.message} (RLS kurallarını kontrol edin)`, 'error');
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

    function atamaAlgoritmasi(personelList, bolumList, gecmisData) {
        if (personelList.length === 0 || bolumList.length === 0) {
            return [];
        }

        let atanmamisPersonel = [...personelList];
        let bolumlerDurumu = bolumList.map(b => ({
            ...b,
            mevcutKontenjan: b.kontenjan,
            atananlar: []
        }));

        // ----------------------------------------------------
        // A. Hiçbir Bölümün Boş Kalmaması Kısıtlaması (Minimum 1 kişi)
        // ----------------------------------------------------
        const minPersonel = Math.min(atanmamisPersonel.length, bolumList.length);

        // Her bölüme rastgele bir personel atayarak minimum şartı garanti et
        for (let i = 0; i < minPersonel; i++) {
            // Rastgele bölüm seçimi (şimdilik, sonra geçmişi kontrol edeceğiz)
            const bolumIndex = i % bolumlerDurumu.length;
            const personelIndex = Math.floor(Math.random() * atanmamisPersonel.length);

            const personel = atanmamisPersonel.splice(personelIndex, 1)[0];

            if (bolumlerDurumu[bolumIndex].atananlar.length < bolumlerDurumu[bolumIndex].kontenjan) {
                bolumlerDurumu[bolumIndex].atananlar.push(personel);
            } else {
                // Kontenjan aşılırsa (çok fazla personel olsa bile, bu senaryoda aşılmaz), geri ekle.
                atanmamisPersonel.push(personel);
            }
        }

        // ----------------------------------------------------
        // B. Kalan Personeli Adil ve Rastgele Dağıtma
        // ----------------------------------------------------

        // Kalan personeli rastgele bölümlere atama (Kontenjan bitene kadar)
        while (atanmamisPersonel.length > 0) {

            const personelIndex = Math.floor(Math.random() * atanmamisPersonel.length);
            const personel = atanmamisPersonel.splice(personelIndex, 1)[0];

            let uygunBolumler = bolumlerDurumu.filter(b => b.atananlar.length < b.kontenjan);

            // 🔥 Rotasyon Önceliği: Personelin en az çalıştığı veya hiç çalışmadığı bölümleri bul
            // Bu kısmı karmaşıklığı artırmamak için şimdilik atlıyorum. Basit rastgele atama yapıyorum.
            // İleride buraya "geçmiş_rotasyon" kontrolü ve rastgelelik eklenecektir.

            if (uygunBolumler.length > 0) {
                // Uygun bölümler arasından rastgele birini seç
                const randomBolumIndex = Math.floor(Math.random() * uygunBolumler.length);
                const secilenBolum = uygunBolumler[randomBolumIndex];

                // Atamayı yap
                const bolumDurumuIndex = bolumlerDurumu.findIndex(b => b.id === secilenBolum.id);
                bolumlerDurumu[bolumDurumuIndex].atananlar.push(personel);

            } else {
                // Kontenjan kalmadı. Kalan personeli atanmamış listeye geri ekle (Bu bir uyarıdır)
                atanmamisPersonel.push(personel);
                console.warn("Kalan personel kontenjan yetersizliğinden atanamadı.");
                break;
            }
        }

        // Atanan personel listesini geri döndür
        return bolumlerDurumu;
    }


    async function olusturRotasyonHandler() {
        olusturBtn.disabled = true;

        const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);
        const toplamPersonel = personelListesi.length;

        if (toplamKontenjan === 0 || toplamPersonel === 0) {
            displayMessage(`HATA: Rotasyon için en az 1 personel ve 1 kontenjanlı bölüm olmalıdır.`, 'error');
            olusturBtn.disabled = false;
            return;
        }

        displayMessage(`${rotasyonTipi} rotasyon oluşturuluyor. Günler: ${secilenGunler.join(', ') || 'Belirtilmedi'}`, 'none');


        try {
            const rotasyonSonucu = atamaAlgoritmasi(personelListesi, bolumler, gecmisData);

            renderRotasyonTablosu(rotasyonSonucu);
            await saveRotasyon(rotasyonSonucu, rotasyonTipi);

            displayMessage(`${rotasyonTipi} rotasyonu başarıyla oluşturuldu ve veritabanına kaydedildi.`, 'success');

        } catch (error) {
            displayMessage(`Rotasyon oluşturulurken veya kaydedilirken hata oluştu: ${error.message}`, 'error');
        } finally {
            olusturBtn.disabled = false;
        }
    }

    // Rotasyon Tipi veritabanına kaydediliyor
    async function saveRotasyon(sonuc, rotationType) {
        const dataToInsert = [];
        const bugununTarihi = new Date().toISOString().split('T')[0];

        sonuc.forEach(bolum => {
            bolum.atananlar.forEach(personel => {
                dataToInsert.push({
                    user_id: personel.id,
                    bolum_id: bolum.id,
                    rotasyon_tarihi: bugununTarihi,
                    rotasyon_tipi: rotationType
                });
            });
        });

        const { error } = await supabase.from('rotasyon_gecmisi').insert(dataToInsert);
        if (error) throw error;
    }

}); // DOMContentLoaded sonu