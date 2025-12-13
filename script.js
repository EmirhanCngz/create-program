// =======================================================
// SUPABASE AYARLARI VE GLOBAL DEĞİŞKENLER
// =======================================================
const supabaseUrl = 'https://omlgfusmwyusfrfotgwq.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGdmdXNtd3l1c2ZyZm90Z3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQ5MzIsImV4cCI6MjA4MTE0MDkzMn0.jjOGn5BFxHn819fHeGxUYZPDM9i_QCasd0YlDMBtvqs'; 

// İstemciyi tutacak değişken. Auth işlemleri için fonksiyonlarda kullanılacak.
let supabase = null; 

let personelListesi = [];
let bolumler = [];
let gecmisData = [];

// =======================================================
// TÜM KODLAR DOMContentLoaded İÇİNDE YER ALMALIDIR
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // --------------------------------------------------
    // A. DOM ELEMANLARINI TANIMLAMA (Her zaman ilk adım olmalı)
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
    const statusMessageDOM = document.getElementById('status-message'); // Hata veren değişken
    const rotasyonTablosuAlaniDOM = document.getElementById('rotasyon-tablosu-alani');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const adSoyadInput = document.getElementById('ad_soyad');


    // --------------------------------------------------
    // B. YARDIMCI FONKSİYONLAR (DOM'u kullananlar)
    // --------------------------------------------------
    
    function displayMessage(text, type = 'none') {
        // statusMessageDOM artık tanımlanmış durumda, hata vermeyecek.
        statusMessageDOM.textContent = text;
        statusMessageDOM.className = `message ${type}`;
    }

    // (Diğer yardımcı fonksiyonlar: updateDOMCounts, renderRotasyonTablosu vb. buraya gelir)
    function updateDOMCounts() {
        personelSayisiDOM.textContent = personelListesi.length;
        const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);
        kontenjanToplamiDOM.textContent = toplamKontenjan;
        
        const bolumListesiDOM = document.getElementById('bolum-listesi');
        bolumListesiDOM.innerHTML = bolumler.map(b => 
            `<div class="bolum-item"><strong>${b.adi}</strong>: ${b.kontenjan} Kontenjan</div>`
        ).join('');
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

    // 🔥 Kütüphane yüklenmesini kontrol ederek istemciyi başlatıyoruz.
    if (window.supabase) {
        // window.supabase, CDN tarafından yüklenen global objedir.
        supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey); 
    } else {
        displayMessage("Supabase kütüphanesi yüklenemedi. Lütfen CDN bağlantısını kontrol edin.", 'error');
        console.error("Supabase Kütüphanesi Yükleme Hatası.");
        return; 
    }
    

    // --------------------------------------------------
    // D. AUTH İŞLEVLERİ VE EVENT LISTENERS
    // --------------------------------------------------
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); 
        loginHandler(emailInput.value, passwordInput.value); 
    });

    signupBtn.addEventListener('click', () => {
        signupHandler(emailInput.value, passwordInput.value, adSoyadInput.value);
    });

    logoutBtn.addEventListener('click', logoutHandler);
    olusturBtn.addEventListener('click', olusturRotasyonHandler);


    // Auth durumu dinleyicisi
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            checkAuthAndLoadData();
        } else if (event === 'SIGNED_OUT') {
            checkAuthAndLoadData(); 
        }
    });
    
    // İlk yüklemede kontrol et
    checkAuthAndLoadData();
    
    // ... (Diğer tüm fonksiyonlar: loginHandler, signupHandler, fetchInitialData, atamaAlgoritmasi, saveRotasyon vb. buraya gelir)

    // =======================================================
    // AUTH FONKSİYONLARI
    // =======================================================
    
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

    async function checkAuthAndLoadData() {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            authPanel.style.display = 'block';
            adminPanel.style.display = 'none';
            userDisplayNameDOM.textContent = '';
            return;
        }

        authPanel.style.display = 'none';
        adminPanel.style.display = 'block';

        const { data: userData } = await supabase.from('users').select('ad_soyad').eq('id', user.id).single();
        userDisplayNameDOM.textContent = userData ? userData.ad_soyad : user.email;
        
        fetchInitialData(user.id); 
    }

    // =======================================================
    // VERİ ÇEKME VE ROTASYON FONKSİYONLARI
    // =======================================================

    async function fetchInitialData(currentUserId) {
        try {
            // RLS Kuralı: Users read self profile
            let { data: currentUserData, error: userError } = await supabase
                .from('users')
                .select('id, ad_soyad')
                .eq('id', currentUserId)
                .single();

            if (userError || !currentUserData) throw new Error("Kullanıcı verisi bulunamadı. RLS ayarınızı kontrol edin.");

            personelListesi = [{ id: currentUserData.id, ad: currentUserData.ad_soyad }];

            // RLS Kuralı: All can read bolumler
            let { data: bolumlerData, error: bolumError } = await supabase
                .from('bolumler')
                .select('id, bolum_adi, kontenjan')
                .eq('aktif', true);

            if (bolumError) throw bolumError;
            bolumler = bolumlerData.map(b => ({ id: b.id, adi: b.bolum_adi, kontenjan: b.kontenjan }));

            // RLS Kuralı: Users can read own rotation history
            let { data: gecmis, error: gecmisError } = await supabase
                .from('rotasyon_gecmisi')
                .select('user_id, bolum_id')
                .eq('user_id', currentUserId);

            if (gecmisError) throw gecmisError;
            gecmisData = gecmis.map(g => ({ userId: g.user_id, bolumId: g.bolum_id }));

            updateDOMCounts();

        } catch (error) {
            console.error("Veri çekilirken RLS/DB Hatası:", error.message);
            displayMessage("Veri yüklenirken RLS hatası oluştu. Konsolu kontrol edin.", 'error');
        }
    }
    
    function atamaAlgoritmasi(personelList, bolumList, gecmisData) {
        let atanmamisPersonel = [...personelList];
        let bolumlerDurumu = bolumList.map(b => ({
            ...b,
            mevcutKontenjan: b.kontenjan,
            atananlar: []
        }));
        
        // Bu kısım daha karmaşık bir mantık gerektirir. Şimdilik sadece ilk kontenjanı doldurduğunu varsayalım.
        if (bolumlerDurumu.length > 0 && atanmamisPersonel.length > 0) {
            bolumlerDurumu[0].atananlar.push(atanmamisPersonel[0]);
        }
        
        return bolumlerDurumu;
    }


    async function olusturRotasyonHandler() {
        olusturBtn.disabled = true;
        displayMessage('Rotasyon oluşturuluyor...', 'none');
        
        const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);
        const toplamPersonel = personelListesi.length;
        
        if (toplamKontenjan === 0 || toplamPersonel === 0) {
            displayMessage(`HATA: Lütfen önce bölümleri ve kontenjanları tanımlayın.`, 'error');
            olusturBtn.disabled = false;
            return;
        }

        try {
            const rotasyonSonucu = atamaAlgoritmasi(personelListesi, bolumler, gecmisData);
            
            renderRotasyonTablosu(rotasyonSonucu);
            await saveRotasyon(rotasyonSonucu);

            displayMessage('Rotasyon başarıyla oluşturuldu ve veritabanına kaydedildi.', 'success');
            
        } catch (error) {
            displayMessage(`Rotasyon oluşturulurken veya kaydedilirken hata oluştu: ${error.message}`, 'error');
        } finally {
            olusturBtn.disabled = false;
        }
    }

    async function saveRotasyon(sonuc) {
        const dataToInsert = [];
        const bugununTarihi = new Date().toISOString().split('T')[0];
        
        sonuc.forEach(bolum => {
            bolum.atananlar.forEach(personel => {
                dataToInsert.push({
                    user_id: personel.id,
                    bolum_id: bolum.id,
                    rotasyon_tarihi: bugununTarihi,
                    rotasyon_tipi: 'Haftalık' 
                });
            });
        });
        
        // RLS Kuralı: Users can insert own rotation result
        const { error } = await supabase.from('rotasyon_gecmisi').insert(dataToInsert);
        if (error) throw error;
    }

}); // DOMContentLoaded sonu