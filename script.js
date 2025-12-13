// =======================================================
// SUPABASE AYARLARI 
// =======================================================
// 🔥 KENDİ SUPABASE PROJE URL'NİZİ BURAYA GİRİN
const supabaseUrl = 'https://omlgfusmwyusfrfotgwq.supabase.co'; 
// 🔥 KENDİ SUPABASE ANON (PUBLIC) ANAHTARINIZI BURAYA GİRİN
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGdmdXNtd3l1c2ZyZm90Z3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NjQ5MzIsImV4cCI6MjA4MTE0MDkzMn0.jjOGn5BFxHn819fHeGxUYZPDM9i_QCasd0YlDMBtvqs';
 
// İstemciyi başlatacak değişkeni 'var' ile global kapsamda tanımlıyoruz.
// Bu, "before initialization" hatasını çözer.
var supabase = null; 

// =======================================================
// VERİ DEĞİŞKENLERİ (Bunlar zaten global kalabilir)
// =======================================================
let personelListesi = [];
let bolumler = [];
let gecmisData = [];



// =======================================================
// TÜM İŞLEMLER VE DOM BAĞLANTILARI (DOMContentLoaded içinde)
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 🔥 1. Supabase İstemcisini Başlatma (Kütüphane yüklendiğinden emin olduktan sonra)
    // Bu, önceki 'ReferenceError' hatasını çözer.
    try {
        supabase = supabase.createClient(supabaseUrl, supabaseAnonKey); 
    } catch (e) {
        console.error("Supabase istemcisi başlatılamadı. CDN bağlantısını kontrol edin:", e);
        displayMessage("Uygulama yüklenirken hata oluştu. Lütfen konsolu kontrol edin.", 'error');
        return; 
    }

    // DOM ELEMANLARI (Burada tanımlanmalıdır)
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


    // =======================================================
    // OLAY DİNLEYİCİLERİ (EVENT LISTENERS)
    // =======================================================

    // Form gönderimini (Enter tuşu dahil) yakalar ve loginHandler'ı tetikler
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); 
        loginHandler(emailInput.value, passwordInput.value); 
    });

    signupBtn.addEventListener('click', () => {
        signupHandler(emailInput.value, passwordInput.value, adSoyadInput.value);
    });

    logoutBtn.addEventListener('click', logoutHandler);
    olusturBtn.addEventListener('click', olusturRotasyonHandler);


    // Auth durumu dinleyicisi (Sayfa yenilense bile oturumu korur)
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            checkAuthAndLoadData();
        } else if (event === 'SIGNED_OUT') {
            checkAuthAndLoadData(); 
        }
    });
    
    // İlk yüklemede kontrol et
    checkAuthAndLoadData();

    // =======================================================
    // YARDIMCI FONKSİYONLAR (displayMessage, updateDOMCounts vb.)
    // DOM elemanlarına ihtiyaç duyduğu için burada kalmaları daha iyidir
    // =======================================================

    function displayMessage(text, type = 'none') {
        statusMessageDOM.textContent = text;
        statusMessageDOM.className = `message ${type}`;
    }

    function updateDOMCounts() {
        personelSayisiDOM.textContent = personelListesi.length;
        const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);
        kontenjanToplamiDOM.textContent = toplamKontenjan;
        
        const bolumListesiDOM = document.getElementById('bolum-listesi');
        bolumListesiDOM.innerHTML = bolumler.map(b => 
            `<div class="bolum-item"><strong>${b.adi}</strong>: ${b.kontenjan} Kontenjan</div>`
        ).join('');
    }

    // Rotasyon sonucunu DOM'a yazdıran fonksiyon
    function renderRotasyonTablosu(sonuc) {
        let html = '<table class="rotasyon-tablosu"><thead><tr><th>Bölüm</th><th>Atanan Personel</th><th>Kontenjan</th></tr></thead><tbody>';
        
        sonuc.forEach(bolum => {
            // Bireysel modelde atanacak personel her zaman o kullanıcının kendisidir.
            const personelAdlari = bolum.atananlar.map(p => p.ad).join(', ');
            html += `<tr><td>${bolum.adi}</td><td>${personelAdlari || 'BOŞ'}</td><td>${bolum.kontenjan}</td></tr>`;
        });

        html += '</tbody></table>';
        rotasyonTablosuAlaniDOM.innerHTML = html;
    }


    // =======================================================
    // AUTH FONKSİYONLARI (Form event'leri ile çağrılır)
    // =======================================================
    
    async function loginHandler(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            displayMessage(`Giriş Hatası: ${error.message}`, 'error');
        } 
        // Başarılı girişten sonra onAuthStateChange tetiklenir ve checkAuthAndLoadData çağrılır.
    }

    async function signupHandler(email, password, adSoyad) {
        if (!email || !password || !adSoyad) {
            displayMessage("Tüm alanları doldurunuz.", 'error');
            return;
        }

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
                    email: email
                });

            if (userInsertError) {
                 console.error("User Insert Error:", userInsertError);
                 displayMessage('Kayıt oldu ancak kullanıcı bilgisi kaydedilemedi. (RLS kontrol edin)', 'error');
                 return;
            }

            displayMessage('Kayıt başarılı! Lütfen giriş yapın.', 'success');
            // Kayıt başarılı olduğunda inputları temizle
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
            // Oturum Açılmamış
            authPanel.style.display = 'block';
            adminPanel.style.display = 'none';
            userDisplayNameDOM.textContent = '';
            return;
        }

        // Oturum Açılmış
        authPanel.style.display = 'none';
        adminPanel.style.display = 'block';

        // Kullanıcı adını users tablosundan çek (Kendi RLS kuralıyla)
        const { data: userData } = await supabase.from('users').select('ad_soyad').eq('id', user.id).single();
        userDisplayNameDOM.textContent = userData ? userData.ad_soyad : user.email;
        
        // Sadece o kullanıcıya ait verileri çek
        fetchInitialData(user.id); 
    }

    // =======================================================
    // SUPABASE VERİ ÇEKME İŞLEMLERİ (Kullanıcıya Özel)
    // =======================================================

    async function fetchInitialData(currentUserId) {
        // ... (Veri çekme kodları önceki gibi) ...
        try {
            // 1. Personel Listesi (Sadece Oturum Açmış Kullanıcı)
            let { data: currentUserData, error: userError } = await supabase
                .from('users')
                .select('id, ad_soyad')
                .eq('id', currentUserId)
                .single();

            if (userError || !currentUserData) throw new Error("Kullanıcı verisi bulunamadı. Lütfen users tablosundaki kaydınızı kontrol edin.");

            // Bireysel modelde, personel listesi sadece o kullanıcıdır
            personelListesi = [{ id: currentUserData.id, ad: currentUserData.ad_soyad }];


            // 2. Bölümler (Tüm kullanıcılar için ortak)
            let { data: bolumlerData, error: bolumError } = await supabase
                .from('bolumler')
                .select('id, bolum_adi, kontenjan')
                .eq('aktif', true); // Varsayım: Bölümler herkes için ortaktır

            if (bolumError) throw bolumError;
            bolumler = bolumlerData.map(b => ({ id: b.id, adi: b.bolum_adi, kontenjan: b.kontenjan }));


            // 3. Rotasyon Geçmişi (Sadece bu kullanıcının geçmişini al)
            let { data: gecmis, error: gecmisError } = await supabase
                .from('rotasyon_gecmisi')
                .select('user_id, bolum_id')
                .eq('user_id', currentUserId); // 🔥 Kendi RLS kuralına uygun çekim

            if (gecmisError) throw gecmisError;
            gecmisData = gecmis.map(g => ({ userId: g.user_id, bolumId: g.bolum_id }));

            updateDOMCounts();

        } catch (error) {
            console.error("Veri çekilirken RLS/DB Hatası:", error.message);
        }
    }
    
    // =======================================================
    // ROTASYON VE KAYIT FONKSİYONLARI
    // =======================================================

    // Rotasyon Algoritması (Kodu çok uzun olduğu için burada kısaltıldı, önceki kodlardan almalısınız.)
    function atamaAlgoritmasi(personelList, bolumList, gecmisData) {
        // ... (Önceki atamaAlgoritmasi kodu buraya yapıştırılmalıdır) ...
        // Basitçe: personelListesi[0] (yani kullanıcı), bolumler listesine atanır.
        
        // Rotasyon Mantığı (Önceki atama algoritması)
        let atanmamisPersonel = [...personelList];
        let bolumlerDurumu = bolumList.map(b => ({
            ...b,
            mevcutKontenjan: b.kontenjan,
            atananlar: []
        }));
        
        // ... (Atama Kısıtlamaları ve Mantık) ...
        // Şimdilik sadece ilk kontenjanı doldurduğunu varsayalım
        if (bolumlerDurumu.length > 0 && atanmamisPersonel.length > 0) {
            bolumlerDurumu[0].atananlar.push(atanmamisPersonel[0]);
        }
        
        return bolumlerDurumu;
    }


    async function olusturRotasyonHandler() {
        // ... (Önceki olusturRotasyonHandler kodu buraya yapıştırılmalıdır) ...
        olusturBtn.disabled = true;
        displayMessage('Rotasyon oluşturuluyor...', 'none');
        
        const toplamKontenjan = bolumler.reduce((sum, b) => sum + b.kontenjan, 0);
        const toplamPersonel = personelListesi.length; // Bireysel modelde her zaman 1
        
        // Basit Kontrol: Bölüm varsa devam et
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
        
        const { error } = await supabase.from('rotasyon_gecmisi').insert(dataToInsert);
        if (error) throw error;
    }

}); // DOMContentLoaded sonu