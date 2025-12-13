<template>
  <div class="rotasyon-container">
    <h2>Rotasyon Programı Oluşturucu</h2>
    
    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>

    <section class="parametreler">
      <h3>1. Parametreler</h3>
      <p>Toplam Personel Sayısı: <strong>{{ personelListesi.length }}</strong></p>
      <p>Toplam Kontenjan: <strong>{{ toplamKontenjan }}</strong></p>
      
      </section>

    <section class="bolumler">
      <h3>2. Bölüm Kontenjanları</h3>
      <ul>
        <li v-for="bolum in bolumler" :key="bolum.id">
          {{ bolum.adi }} (Kontenjan: {{ bolum.kontenjan }})
        </li>
      </ul>
    </section>

    <button @click="olusturRotasyon" :disabled="isProcessing">
      {{ isProcessing ? 'Oluşturuluyor...' : 'Rotasyonu Oluştur' }}
    </button>
    
    <hr>
    
    <section v-if="rotasyonSonucu.length > 0" class="sonuc">
      <h3>3. Oluşturulan Program ({{ rotasyonSonucu.length }} kişi atandı)</h3>
      <table class="rotasyon-tablo">
        <thead>
          <tr><th>Bölüm</th><th>Atanan Personel</th></tr>
        </thead>
        <tbody>
          <tr v-for="(personel, bolumAdi) in gruptanmisSonuc" :key="bolumAdi">
            <td>{{ bolumAdi }}</td>
            <td>
              <span v-for="(p, index) in personel" :key="p.id">
                {{ p.ad }}<span v-if="index < personel.length - 1">, </span>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script>
// ---------- ROTASYON ATAMA MANTIĞI (Logic) ----------

// Kısıtlama: Bir kişi daha önce çalıştığı bölüme atanamaz.
// Kısıtlama: Atama, en az 1 kişi kuralı uygulanarak kontenjan sırasına göre yapılır.
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

    // Adım 1: Her Bölüme En Az Bir Kişi Atama (Madde d)
    for (const bolum of bolumlerDurumu) {
        if (bolum.mevcutKontenjan <= 0) continue;

        // Bu bölüme atanabilecek, geçmişte çalışmamış kişileri bul
        let uygunKisiIndex = atanmamisPersonel.findIndex(p => {
            // Geçmişi yoksa veya geçmişte bu bölümde çalışmamışsa
            const gecmis = personelinGecmisi[p.id];
            return !gecmis || !gecmis.has(bolum.id);
        });

        if (uygunKisiIndex === -1) {
            // Geçmişte çalışmamış kimse kalmadıysa, rastgele birini ata (zorunlu minimum atama)
             uygunKisiIndex = atanmamisPersonel.findIndex(p => p.id); // İlk kişiyi al
        }
        
        if (uygunKisiIndex !== -1) {
            const atanacakKisi = atanmamisPersonel[uygunKisiIndex];
            
            // Atamayı yap ve listeden çıkar
            bolum.atananlar.push(atanacakKisi);
            bolum.mevcutKontenjan--;
            atanmamisPersonel.splice(uygunKisiIndex, 1);
        } else {
             // Kritik Hata: Atanacak kimse kalmadı (normalde olmamalı)
             // Bu durumda algoritmanın devam etmesi sorun yaratır.
             return null; 
        }
    }
    
    // Adım 2: Kalan Kontenjanları Doldurma (Madde a ve b)
    // Kalan personeli ve kontenjanları doldur. Bu aşamada artık kontenjan bazlı dağıtım yapılır.
    while (atanmamisPersonel.length > 0) {
        const kisi = atanmamisPersonel.shift();
        
        // Atanabilecek, halen kontenjanı olan bölümleri filtrele
        let bosBolumler = bolumlerDurumu.filter(b => b.mevcutKontenjan > 0);
        
        if (bosBolumler.length === 0) break; // Tüm kontenjanlar doldu.

        // Öncelik Sıralaması (En Uygun Bölümü Bulma)
        // 1. Kriter: Geçmişte çalışmamış olmak (Madde a)
        // 2. Kriter: En çok boş kontenjana sahip olmak (Madde b ve Optimizasyon)
        
        // En iyi bölümleri bulmak için sıralama yapalım (Büyükten küçüğe)
        bosBolumler.sort((b1, b2) => {
            const gecmis1 = personelinGecmisi[kisi.id].has(b1.id) ? 1 : 0;
            const gecmis2 = personelinGecmisi[kisi.id].has(b2.id) ? 1 : 0;

            // Önce geçmişte çalışmamış olanları öne al (0 < 1)
            if (gecmis1 !== gecmis2) {
                return gecmis1 - gecmis2; 
            }
            // İkinci Kriter: Eşitlerse, en çok boş kontenjanı olana öncelik ver
            return b2.mevcutKontenjan - b1.mevcutKontenjan;
        });

        const atanacakBolum = bosBolumler[0];
        
        // Atamayı gerçekleştir
        atanacakBolum.atananlar.push(kisi);
        atanacakBolum.mevcutKontenjan--;
    }
    
    // Sonuç dizisini döndür
    return bolumlerDurumu.flatMap(b => b.atananlar.map(p => ({
        bolumAdi: b.adi,
        personel: p
    })));
}

export default {
    data() {
        return {
            isProcessing: false,
            errorMessage: '',
            rotasyonSonucu: [],
            
            // Simülasyon Verileri (Bunlar Supabase'ten çekilecek)
            personelListesi: [
                { id: 'p1', ad: 'Ayşe Nur Bülbül' },
                { id: 'p2', ad: 'Ahmet Leblebi' },
                { id: 'p3', ad: 'Beytullah Selim' },
                { id: 'p4', ad: 'Mukkaddes Danış' },
                { id: 'p5', ad: 'Emircan Aydın' },
                { id: 'p6', ad: 'Aysa Aydın' },
                // 6 Kişi
            ],
            bolumler: [
                { id: 1, adi: 'SEKRETERLİK', kontenjan: 1 },
                { id: 2, adi: 'Acil Laboratuvar', kontenjan: 2 },
                { id: 3, adi: 'Rutin Laboratuvar', kontenjan: 1 },
                { id: 4, adi: 'İdrar Laboratuvar', kontenjan: 2 },
                // Toplam 6 Kontenjan
            ],
            // Örnek Geçmiş Verisi (Supabase rotasyon_gecmisi tablosundan gelecek)
            // 'p1' (Ayşe) daha önce 1 ve 4'te çalıştı varsayalım
            gecmisData: [
                { userId: 'p1', bolumId: 1 },
                { userId: 'p1', bolumId: 4 }, 
                // ... diğer geçmiş kayıtları
            ]
        };
    },
    computed: {
        toplamKontenjan() {
            return this.bolumler.reduce((sum, b) => sum + b.kontenjan, 0);
        },
        gruptanmisSonuc() {
            // Rotasyon sonucunu bölümlere göre gruplayan ve görüntülemeyi kolaylaştıran yardımcı computed
            return this.rotasyonSonucu.reduce((acc, atama) => {
                acc[atama.bolumAdi] = acc[atama.bolumAdi] || [];
                acc[atama.bolumAdi].push(atama.personel);
                return acc;
            }, {});
        }
    },
    methods: {
        async olusturRotasyon() {
            this.errorMessage = '';
            this.isProcessing = true;
            this.rotasyonSonucu = [];

            // Supabase'ten güncel verileri çekme simülasyonu
            // const personelListesi = await this.fetchPersonel();
            // const bolumler = await this.fetchBolumler();
            // const gecmisData = await this.fetchGecmisData();

            // 1. Kontrol: Toplam Kontenjan vs. Toplam Personel (Kısıtlama c)
            if (this.toplamKontenjan < this.personelListesi.length) {
                this.errorMessage = `HATA: Toplam kontenjan (${this.toplamKontenjan}) toplam personel sayısından (${this.personelListesi.length}) az. Lütfen kontenjanları artırın.`;
                this.isProcessing = false;
                return;
            }
            
            // 2. Kontrol: Her Bölüme Bir Kişi İçin Gerekli Kontrol (İş mantığı)
            if (this.bolumler.length > this.personelListesi.length) {
                 this.errorMessage = `HATA: Bölüm sayısı (${this.bolumler.length}) personel sayısından (${this.personelListesi.length}) fazla. Her bölüme en az bir kişi atanamaz.`;
                 this.isProcessing = false;
                 return;
            }

            try {
                // Atama algoritmasını çağır
                const sonuc = atamaAlgoritmasi(
                    this.personelListesi, 
                    this.bolumler, 
                    this.gecmisData
                );

                if (sonuc === null) {
                    this.errorMessage = "Atama algoritması bir sorunla karşılaştı veya yeterli personel kalmadı.";
                    this.rotasyonSonucu = [];
                } else {
                    this.rotasyonSonucu = sonuc;
                    // Başarılı kayıttan sonra bu veriyi Supabase'e kaydetme simülasyonu
                    // await this.saveRotasyon(this.rotasyonSonucu);
                }

            } catch (error) {
                this.errorMessage = 'Rotasyon oluşturulurken beklenmedik bir hata oluştu.';
                console.error("Rotasyon Hatası:", error);
            } finally {
                this.isProcessing = false;
            }
        },
        
        // Supabase API Çağrısı Simülasyonları
        async fetchPersonel() { /* Supabase.from('users').select('*') */ },
        async fetchBolumler() { /* Supabase.from('bolumler').select('*') */ },
        async fetchGecmisData() { /* Supabase.from('rotasyon_gecmisi').select('*') */ },
        async saveRotasyon(data) { /* Supabase.from('rotasyon_gecmisi').insert(data) */ }
    }
};
</script>

<style scoped>
.rotasyon-container {
    max-width: 800px;
    margin: 20px auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-family: Arial, sans-serif;
}
.alert {
    padding: 10px;
    margin-bottom: 15px;
    border-radius: 4px;
    font-weight: bold;
}
.error {
    background-color: #f8d7da;
    color: #721c24;
    border-color: #f5c6cb;
}
button {
    padding: 10px 15px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
}
button:hover:not(:disabled) {
    background-color: #0056b3;
}
button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}
.rotasyon-tablo {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
}
.rotasyon-tablo th, .rotasyon-tablo td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}
.rotasyon-tablo th {
    background-color: #f2f2f2;
}
</style>