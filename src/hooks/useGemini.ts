import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export function useGemini() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (
    userMessage: string,
    skinType: string,
    conversationHistory: Array<{ role: 'user' | 'model'; content: string }>
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    let daftarProdukSupabase = "Tidak ada produk yang tersedia di toko kami.";

    try {
      const jenisKulitUser = skinType.toLowerCase().trim();
      const { data: dbProducts } = await supabase
        .from('products')
        .select('*')
        .or(`skin_type.ilike.%${jenisKulitUser}%,skin_type.ilike.%semua%`);

      if (dbProducts && dbProducts.length > 0) {
        daftarProdukSupabase = dbProducts.map(p =>
          `- Nama: ${p.name}, Kategori: ${p.category}, Untuk Kulit: ${p.skin_type}, Manfaat: ${p.description}, Bahan: ${p.ingredients}, Harga: Rp${p.price}`
        ).join('\n');
      }
    } catch (supabaseErr) {
      console.error("Gagal mengambil data Supabase:", supabaseErr);
    }

    const systemPrompt = `Kamu adalah GlowBot, asisten AI skincare yang ramah dan membantu untuk UMKM Indonesia. Kamu ahli dalam memberikan rekomendasi produk skincare dan tips perawatan kulit.

Pengguna memiliki jenis kulit: ${skinType}
Berikut adalah Daftar Produk Utama yang ada di database toko kami:
${daftarProdukSupabase}

Panduan Rekomendasi Produk:
1. Periksa terlebih dahulu "Daftar Produk Utama" di atas. Jika ada produk yang cocok dengan jenis kulit dan kebutuhan pengguna, kamu WAJIB merekomendasikan produk dari daftar tersebut terlebih dahulu (Prioritas Utama).
2. Jika jenis produk yang dicari (misalnya pembersih wajah atau sunscreen) TIDAK ADA atau tidak ada yang pas di dalam database toko kami, barulah kamu boleh merekomendasikan produk lokal Indonesia terkenal lainnya yang ada di pasar (seperti Somethinc, Azarine, Wardah, dll.) sebagai alternatif luar yang membantu.

Panduan:
- JANGAN PERNAH menggunakan tanda bintang ganda (**teks**) atau tanda bintang apa pun untuk menebalkan kata.
- Selalu gunakan bahasa Indonesia yang sopan dan ramah
- Berikan saran skincare yang sesuai dengan jenis kulit pengguna
- Rekomendasikan produk lokal Indonesia jika memungkinkan
- Jelaskan manfaat bahan-bahan skincare dengan sederhana
- Tanyakan kondisi kulit spesifik jika perlu
- Berikan tips rutinitas skincare pagi dan malam
- Jaga respons tetap informatif,ringkas,padat,dan jelas tapi tidak terlalu panjang
- Gunakan emoji yang sesuai untuk suasana yang ceria`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.7,
          top_p: 0.95,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: GroqResponse = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || 'Maaf, aku tidak bisa memproses permintaanmu. Coba lagi ya!';

      setIsLoading(false);
      return generatedText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi ya!';
      setError(errorMessage);
      setIsLoading(false);
      return `Maaf, terjadi kesalahan: ${errorMessage}`;
    }
  }, []);

  return { generateResponse, isLoading, error };
}
