# 🌸 GlowBot — AI Skincare Consultant Chatbot

> Asisten skincare berbasis AI untuk UMKM Kecantikan Lokal Indonesia

![GlowBot Preview](https://img.shields.io/badge/Status-Live-brightgreen) ![Gemini API](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-blue) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-black) ![Supabase](https://img.shields.io/badge/Database-Supabase-green)

🔗 **Live Demo:** [glowbot-ai-skincare-chatbot.vercel.app](https://glowbot-ai-skincare-chatbot.vercel.app)

iiiiiiiiiiiiiiiiiiiiiiiiiiii

---

## 📌 Tentang Project

GlowBot adalah AI chatbot yang dirancang untuk membantu UMKM skincare lokal Indonesia melayani pelanggan secara otomatis. Bot ini mampu memberikan konsultasi jenis kulit, rekomendasi produk, dan edukasi bahan aktif — menggunakan bahasa Indonesia yang santai dan mudah dipahami.

Project ini dibuat sebagai **Final Project** pelatihan AI Chatbot Development.

---

## ✨ Fitur Utama

- 🤖 **Konsultasi jenis kulit** — bot mendeteksi jenis kulit (berminyak, kering, kombinasi, sensitif) dan menyesuaikan respons
- 💬 **Chat interaktif** — tampilan bubble chat yang modern dan mobile responsive
- 🧴 **Rekomendasi produk** — bot merekomendasikan produk dari katalog UMKM berdasarkan kebutuhan kulit
- 📚 **Edukasi bahan aktif** — penjelasan niacinamide, retinol, AHA/BHA, dll dalam bahasa yang mudah dipahami
- 🧠 **Memory percakapan** — riwayat chat tersimpan di database Supabase
- ⚡ **Respons cepat** — didukung Gemini 1.5 Flash API

---

## 🛠️ Tech Stack

| Teknologi | Kegunaan |
|---|---|
| React + Vite + TypeScript | Frontend framework |
| Tailwind CSS | Styling & responsive design |
| Google Gemini 1.5 Flash | AI engine (free tier) |
| Supabase | Database & memory chat |
| Vercel | Deployment & hosting |
| Bolt.new | Vibe coding & development |

---

## 🚀 Cara Menjalankan Lokal

### 1. Clone repository
```bash
git clone https://github.com/username/glowbot-ai-skincare-chatbot.git
cd glowbot-ai-skincare-chatbot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Buat file `.env` di root folder, isi dengan:
```
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Jalankan project
```bash
npm run dev
```

Buka browser di `http://localhost:5173`

---

## 🗄️ Setup Database

Jalankan SQL ini di Supabase SQL Editor:

```sql
create table products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text,
  skin_type text,
  description text,
  price integer,
  ingredients text,
  created_at timestamp default now()
);

create table conversations (
  id uuid default gen_random_uuid() primary key,
  user_name text,
  skin_type text,
  created_at timestamp default now()
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id),
  role text check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp default now()
);
```

---

## 📁 Struktur Project

```
glowbot-ai-skincare-chatbot/
├── src/
│   ├── components/       # ChatWindow, IntroScreen, MessageBubble
│   ├── hooks/            # useGemini, useChat
│   ├── lib/              # gemini.ts, supabase.ts
│   └── App.tsx
├── .env.example          # Template environment variables
├── .gitignore
└── README.md
```

---

## 📷 Preview

| Intro Screen | Chat Interface |
|---|---|
| Input nama & pilih jenis kulit | Konsultasi produk skincare |

---

## 👤 Developer

**Nama:** [Nama Kamu]  
**Pelatihan:** [Nama Pelatihan]  
**Tahun:** 2025

---

## 📄 Lisensi

Project ini dibuat untuk keperluan edukasi dan portofolio.