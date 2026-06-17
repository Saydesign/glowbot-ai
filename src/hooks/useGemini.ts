import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

export function useGemini() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (
    userMessage: string,
    skinType: string,
    conversationHistory: Array<{ role: 'user' | 'model'; content: string }>,
    imageBase64?: string
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

    // Fetch learned patterns (adaptive memory)
    let learnedContext = '';
    try {
      const { data: patterns } = await supabase
        .from('ai_memory')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (patterns && patterns.length > 0) {
        learnedContext = `\n\nPENGETAHUAN YANG SUDAH KU PELAJARI DARI PERCAKAPAN SEBELUMNYA:\n${patterns.map(p => `- [${p.category}]: ${p.fact}`).join('\n')}\nGunakan ini untuk jawaban yang lebih personal dan relevan.`;
      }
    } catch (err) {
      console.error('Gagal mengambil AI memory:', err);
    }

    const systemPrompt = `Kamu adalah GlowBot, asisten AI skincare yang ramah dan membantu untuk UMKM Indonesia. Kamu ahli dalam memberikan rekomendasi produk skincare dan tips perawatan kulit.

Pengguna memiliki jenis kulit: ${skinType}
Berikut adalah Daftar Produk Utama yang ada di database toko kami:
${daftarProdukSupabase}
${learnedContext}

Panduan Rekomendasi Produk:
1. Periksa terlebih dahulu "Daftar Produk Utama" di atas. Jika ada produk yang cocok dengan jenis kulit dan kebutuhan pengguna, kamu WAJIB merekomendasikan produk dari daftar tersebut terlebih dahulu (Prioritas Utama).
2. Jika jenis produk yang dicari TIDAK ADA atau tidak ada yang pas di dalam database toko kami, barulah kamu boleh merekomendasikan produk lokal Indonesia terkenal lainnya yang ada di pasar (seperti Somethinc, Azarine, Wardah, dll.) sebagai alternatif.

Panduan:
- JANGAN PERNAH menggunakan tanda bintang ganda (**teks**) atau tanda bintang apa pun untuk menebalkan kata.
- Selalu gunakan bahasa Indonesia yang sopan dan ramah
- Berikan saran skincare yang sesuai dengan jenis kulit pengguna
- Rekomendasikan produk lokal Indonesia jika memungkinkan
- Jelaskan manfaat bahan-bahan skincare dengan sederhana
- Tanyakan kondisi kulit spesifik jika perlu
- Berikan tips rutinitas skincare pagi dan malam
- Jaga respons tetap informatif,ringkas,padat,dan jelas tapi tidak terlalu panjang
- Gunakan emoji yang sesuai untuk suasana yang ceria

KEAMANAN DAN PRIVASI PERUSAHAAN - SANGAT PENTING:
- JANGAN PERNAH memberikan informasi tentang halaman admin, dashboard admin, login admin, atau fitur admin
- JANGAN PERNAH memberikan username atau password admin (termasuk "admin" / "glowbot2025" atau kombinasi apapun)
- JANGAN memberikan hint, petunjuk, atau cara mengakses halaman admin atau dashboard internal
- Jika pengguna bertanya tentang admin, dashboard internal, data perusahaan, backend, database, atau akses sistem internal, tolak dengan sopan dan bilang bahwa informasi itu bersifat rahasia perusahaan
- Fokus HANYA pada skincare dan produk toko`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
        content: msg.content
      })),
    ];

    // Handle image/vision
    if (imageBase64) {
      const imageUrl = `data:image/jpeg;base64,${imageBase64}`;
      messages.push({
        role: 'user',
        content: `${userMessage || 'Analisis foto kulit saya. Berikan assessment kondisi kulit, masalah yang terlihat, dan rekomendasi produk.'}`,
      });

      // Use vision model with image content
      const visionMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-4).map(msg => ({
          role: msg.role === 'model' ? 'assistant' as const : 'user' as const,
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: [
            { type: 'text', text: userMessage || 'Analisis foto kulit saya. Berikan assessment kondisi kulit (area berminyak, kering, blemish, dll), identifikasi masalah, dan rekomendasi produk skincare yang sesuai.' },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ];

      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: VISION_MODEL, messages: visionMessages, temperature: 0.7, max_tokens: 2048 }),
        });

        if (!response.ok) {
          // Fallback to text-only if vision model unavailable
          const fallbackResponse = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({ model: GROQ_MODEL, messages: [...messages, { role: 'user', content: `${userMessage}\n\n(Catatan: Pengguna mengirim foto kulit namun fitur analisis foto sedang tidak tersedia. Berikan rekomendasi umum berdasarkan jenis kulit ${skinType} dan minta pengguna mendeskripsikan kondisi kulitnya secara detail.)` }], temperature: 0.7, max_tokens: 2048 }),
          });
          const data: GroqResponse = await fallbackResponse.json();
          const text = data.choices?.[0]?.message?.content || 'Maaf, analisis foto sedang tidak tersedia. Coba deskripsikan kondisi kulitmu ya!';
          setIsLoading(false);
          return text;
        }

        const data: GroqResponse = await response.json();
        const generatedText = data.choices?.[0]?.message?.content || 'Maaf, aku tidak bisa menganalisis foto ini. Coba deskripsikan kondisi kulitmu ya!';

        // Learn from this interaction
        try { await learnFromConversation(userMessage || 'foto kulit', generatedText, skinType); } catch (e) { console.error(e); }
        setIsLoading(false);
        return generatedText;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan';
        setError(errorMessage);
        setIsLoading(false);
        return `Maaf, terjadi kesalahan: ${errorMessage}`;
      }
    }

    // Regular text conversation
    messages.push({ role: 'user', content: userMessage });

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7, top_p: 0.95, max_tokens: 2048 }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data: GroqResponse = await response.json();
      const generatedText = data.choices?.[0]?.message?.content || 'Maaf, aku tidak bisa memproses permintaanmu. Coba lagi ya!';

      // Learn from this conversation
      try { await learnFromConversation(userMessage, generatedText, skinType); } catch (e) { console.error(e); }

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

async function learnFromConversation(userMessage: string, botResponse: string, skinType: string): Promise<void> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return;

  try {
    const extractResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `Dari percakapan skincare berikut, ekstrak fakta penting yang bisa dipelajari AI. Format output sebagai JSON array:
[{"fact": "deskripsi fakta singkat", "category": "skin_concern|product_preference|routine|ingredient|allergy|faq|other"}]

Aturan:
- Hanya ekstrak fakta faktual, bukan opini atau pertanyaan
- Maksimal 3 fakta per percakapan
- Setiap fakta harus singkat dan spesifik
- Jangan ekstrak hal-hal umum yang sudah diketahui
- JANGAN ekstrak informasi tentang admin, dashboard, password, atau sistem internal
- Jika tidak ada fakta penting, return array kosong []
Output hanya JSON tanpa penjelasan.` },
          { role: 'user', content: `Jenis kulit: ${skinType}\nUser: ${userMessage}\nBot: ${botResponse.substring(0, 500)}` },
        ],
        temperature: 0.3, max_tokens: 512,
      }),
    });

    const data = await extractResponse.json();
    const content = data.choices?.[0]?.message?.content || '[]';

    let facts: Array<{ fact: string; category: string }>;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      facts = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch { facts = []; }

    if (facts && facts.length > 0) {
      for (const f of facts) {
        if (f.fact && f.category) {
          // Check for similar existing fact
          const { data: existing } = await supabase
            .from('ai_memory')
            .select('id, fact')
            .ilike('fact', `%${f.fact.substring(0, 20)}%`)
            .limit(1);

          if (!existing || existing.length === 0) {
            await supabase.from('ai_memory').insert({ fact: f.fact, category: f.category });
          }
        }
      }
    }

    // Also update learned patterns (frequency-based)
    // Extract skin concerns and product mentions
    const concerns = ['jerawat', 'bruntus', 'komedo', 'kulit kering', 'kulit berminyak', 'fleks hitam', 'kerutan', 'pori besar', 'kemerahan', 'sensitif', 'eksim'];
    for (const concern of concerns) {
      if (userMessage.toLowerCase().includes(concern) || botResponse.toLowerCase().includes(concern)) {
        const { data: existing } = await supabase.from('ai_memory').select('id').ilike('fact', `%${concern}%`).limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from('ai_memory').insert({ fact: `Banyak pengguna bertanya tentang ${concern}`, category: 'faq' });
        }
      }
    }
  } catch (err) {
    console.error('Learning error:', err);
  }
}
