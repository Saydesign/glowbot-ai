# 🌸 GlowBot — AI Skincare Consultant Chatbot

> Asisten skincare berbasis AI untuk UMKM Kecantikan Lokal Indonesia

![Status](https://img.shields.io/badge/Status-Live-brightgreen) ![Groq AI](https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-black) ![Supabase](https://img.shields.io/badge/Database-Supabase-green) ![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue)

🔗 **Live Demo:** [glowbot-ai-chatbot-8mup.vercel.app](https://glowbot-ai-chatbot-8mup.vercel.app)

---

## 📌 Tentang Project

GlowBot adalah AI chatbot yang dirancang untuk membantu UMKM skincare lokal Indonesia melayani pelanggan secara otomatis 24/7. Bot ini mampu memberikan konsultasi jenis kulit, rekomendasi produk, edukasi bahan aktif, hingga proses checkout langsung dalam chat — menggunakan bahasa Indonesia yang santai dan mudah dipahami.

Project ini dibuat sebagai **Final Project** pelatihan AI Chatbot Development.

---

## ✨ Fitur Utama

### 🤖 Chat & AI
- **Konsultasi jenis kulit** — bot mendeteksi jenis kulit (berminyak, kering, kombinasi, sensitif) dan menyesuaikan respons
- **Chat interaktif** — tampilan bubble chat modern, mobile responsive, dengan markdown rendering
- **Rekomendasi produk** — bot merekomendasikan produk dari katalog UMKM berdasarkan kebutuhan kulit
- **Edukasi bahan aktif** — penjelasan niacinamide, retinol, AHA/BHA, dll dalam bahasa mudah dipahami
- **Memory percakapan** — riwayat chat tersimpan otomatis di Supabase

### 🛒 Checkout & Transaksi
- **Keranjang belanja dalam chat** — tambah produk langsung dari rekomendasi bot
- **Checkout otomatis** — isi nama, nomor HP, dan alamat pengiriman
- **Invoice otomatis** — nomor order dibuat otomatis setelah checkout
- **Manajemen pesanan** — semua pesanan tersimpan di database

### 🔐 Admin Dashboard
- **Login admin** — autentikasi untuk keamanan akses dashboard
- **Overview lengkap** — statistik percakapan, pesan, produk, pesanan, dan pendapatan
- **Manajemen produk** — tambah, edit, dan hapus produk katalog
- **Riwayat percakapan** — filter harian, mingguan, bulanan, tahunan + hapus percakapan
- **Manajemen pesanan** — update status pesanan (Pending/Confirmed/Selesai/Batal)
- **AI Insight** — analisis menyeluruh bisnis menggunakan Groq AI

---

## 🛠️ Tech Stack

| Teknologi | Kegunaan |
|---|---|
| React + Vite + TypeScript | Frontend framework |
| Tailwind CSS | Styling & responsive design |
| Groq AI (Llama 3.3-70b) | AI engine (free tier, ultra fast) |
| Supabase | Database, memory chat & orders |
| Vercel | Deployment & hosting |
| Bolt.new | Vibe coding & development |

---

## 🚀 Cara Menjalankan Lokal

### 1. Clone repository
```bash
git clone https://github.com/Saydesign/glowbot-ai.git
cd glowbot-ai
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Buat file `.env` di root folder:
```
VITE_GROQ_API_KEY=your_groq_api_key
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
  skin_concern text,
  created_at timestamp default now()
);

create table messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id),
  role text check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp default now()
);

create table orders (
  id uuid default gen_random_uuid() primary key,
  order_number text,
  customer_name text,
  phone text,
  address text,
  items jsonb,
  total integer,
  status text default 'pending',
  created_at timestamp default now()
);

-- Disable RLS & grant permissions
alter table products disable row level security;
alter table conversations disable row level security;
alter table messages disable row level security;
alter table orders disable row level security;

grant all on products to anon;
grant all on conversations to anon;
grant all on messages to anon;
grant all on orders to anon;
```

---

## 📁 Struktur Project

```
glowbot-ai/
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx    # Halaman admin dashboard
│   │   ├── AdminLogin.tsx        # Halaman login admin
│   │   ├── CartDrawer.tsx        # Keranjang belanja & checkout
│   │   ├── Charts.tsx            # Komponen grafik bar & pie
│   │   ├── ChatInput.tsx         # Input field chat
│   │   ├── ChatMessage.tsx       # Bubble pesan + markdown render
│   │   ├── ChatWindow.tsx        # Main chat interface
│   │   ├── IntroScreen.tsx       # Onboarding & pilih jenis kulit
│   │   └── TypingIndicator.tsx   # Animasi loading bot
│   ├── context/
│   │   └── CartContext.tsx       # State management keranjang
│   ├── hooks/
│   │   └── useGemini.ts          # Groq AI integration
│   ├── App.tsx                   # Root component & routing
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── .env.example                  # Template environment variables
├── .gitignore
├── README.md
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 🔐 Admin Dashboard

Akses admin di: `[live-url]/admin`

```
Username : admin
Password : glowbot2025
```

---

## 📷 Preview

| Intro Screen | Chat Interface | Admin Dashboard |
|---|---|---|
| Input nama & pilih jenis kulit | Konsultasi + checkout produk | Statistik & manajemen bisnis |

---

## 👤 Developer

**Nama:** M Qussay Farid Hidayat  
**Pelatihan:** LLM Based Tools and Gemini API Integration for Data Scientists(hacktiv8)  
**Tahun:** 2026

---

## 📄 Lisensi

Project ini dibuat untuk keperluan edukasi dan portofolio.
