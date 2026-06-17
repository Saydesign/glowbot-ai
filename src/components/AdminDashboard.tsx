import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  MessageSquare, Users, Sparkles, Package, ChevronLeft, ChevronRight,
  X, Plus, Pencil, Trash2, Eye, BarChart3, Loader2, Menu, ShoppingBag,
  LogOut, Calendar, Download, Search, Copy, Check, Filter, CreditCard,
  QrCode, Smartphone, Building2, RefreshCw,
} from 'lucide-react';
import { BarChart, PieChart } from './Charts';
import { AdminLogin } from './AdminLogin';
import { useToast } from './Toast';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface Conversation { id: string; user_name: string; skin_type: string; created_at: string }
interface Msg { id: string; conversation_id: string; role: string; content: string; created_at: string }
interface Product { id: string; name: string; category: string; skin_type: string; description: string; price: number; ingredients: string; created_at: string }
interface OrderItem { id: string; name: string; category: string; price: number; quantity: number; subtotal: number }
interface Order { id: string; order_number: string; customer_name: string; phone: string; address: string; items: OrderItem[]; total: number; status: string; payment_method: string; created_at: string }

interface AdminDashboardProps { onBackToChat: () => void }

const skinLabels: Record<string, string> = { berminyak: 'Berminyak', kering: 'Kering', kombinasi: 'Kombinasi', sensitif: 'Sensitif', semua: 'Semua' };
const statusColors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', paid: 'bg-blue-100 text-blue-700', shipped: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };
const statusLabels: Record<string, string> = { pending: 'Pending', paid: 'Paid', shipped: 'Shipped', completed: 'Completed', cancelled: 'Cancelled' };
const payLabels: Record<string, string> = { qris: 'QRIS', gopay: 'GoPay', ovo: 'OVO', dana: 'DANA', shopeepay: 'ShopeePay', va_bca: 'VA BCA', va_mandiri: 'VA Mandiri' };
const payIcons: Record<string, React.ElementType> = { qris: QrCode, gopay: Smartphone, ovo: Smartphone, dana: Smartphone, shopeepay: Smartphone, va_bca: Building2, va_mandiri: Building2 };

function SkeletonRow() { return <div className="h-14 bg-pink-50/60 rounded-xl animate-pulse" /> }
function SkeletonCard() { return <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-pink-100"><div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 rounded-xl bg-pink-100 animate-pulse" /><div className="h-4 w-20 bg-pink-100 rounded animate-pulse" /></div><div className="h-8 w-24 bg-pink-100 rounded-lg animate-pulse" /></div> }
function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return <div className="text-center py-12"><Icon className="w-12 h-12 text-pink-200 mx-auto mb-3" /><p className="text-gray-700 font-medium text-sm">{title}</p><p className="text-gray-400 text-xs mt-1">{sub}</p></div>;
}

export function AdminDashboard({ onBackToChat }: AdminDashboardProps) {
  const { addToast } = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('glowbot_admin_session') === 'true');
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'products' | 'orders' | 'insights'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [stats, setStats] = useState({ totalConv: 0, totalMsg: 0, totalProd: 0, totalOrders: 0, todayConv: 0, todayMsg: 0, todayOrders: 0, todayRevenue: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [convPage, setConvPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);
  const perPage = 10;

  const [selConv, setSelConv] = useState<Conversation | null>(null);
  const [chatHist, setChatHist] = useState<Msg[]>([]);
  const [chatHistLoad, setChatHistLoad] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [prodLoading, setProdLoading] = useState(true);
  const [showProdModal, setShowProdModal] = useState(false);
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({ name: '', category: '', skin_type: '', description: '', price: '', ingredients: '' });
  const [prodSaving, setProdSaving] = useState(false);
  const [deletingProdId, setDeletingProdId] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordLoading, setOrdLoading] = useState(true);
  const [ordFilter, setOrdFilter] = useState('all');
  const [ordSearch, setOrdSearch] = useState('');
  const [updatingOrdId, setUpdatingOrdId] = useState<string | null>(null);
  const [selOrder, setSelOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [deletingOrdId, setDeletingOrdId] = useState<string | null>(null);

  const [convChart, setConvChart] = useState<{ label: string; value: number }[]>([]);
  const [skinChart, setSkinChart] = useState<{ label: string; value: number; color?: string }[]>([]);

  const [insight, setInsight] = useState('');
  const [insightLoad, setInsightLoad] = useState(false);
  const [insightTime, setInsightTime] = useState<string | null>(null);
  const [insightCopied, setInsightCopied] = useState(false);

  const handleLogout = () => { localStorage.removeItem('glowbot_admin_session'); setIsLoggedIn(false); };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [c, m, p, o, tc, tm, to] = await Promise.all([
        supabase.from('conversations').select('skin_type'),
        supabase.from('messages').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select('total'),
        supabase.from('conversations').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
        supabase.from('messages').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
        supabase.from('orders').select('total').gte('created_at', today.toISOString()),
      ]);
      const st = c.data?.map((x: Conversation) => x.skin_type) || [];
      const stc: Record<string, number> = {}; st.forEach((s: string) => { stc[s] = (stc[s] || 0) + 1; });
      const rev = to.data?.reduce((s: number, x: { total: number }) => s + x.total, 0) || 0;
      setStats({ totalConv: c.data?.length || 0, totalMsg: m.count || 0, totalProd: p.count || 0, totalOrders: o.data?.length || 0, todayConv: tc.count || 0, todayMsg: tm.count || 0, todayOrders: to.data?.length || 0, todayRevenue: rev });
      if (st.length > 0) setSkinChart(Object.entries(stc).map(([t, v]) => ({ label: skinLabels[t] || t, value: v, color: t === 'berminyak' ? '#ec4899' : t === 'kering' ? '#f43f5e' : t === 'kombinasi' ? '#f59e0b' : '#10b981' })));
      const d7 = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const ds = new Date(d); ds.setHours(0, 0, 0, 0); const de = new Date(d); de.setHours(23, 59, 59, 999); const { count } = await supabase.from('conversations').select('id', { count: 'exact' }).gte('created_at', ds.toISOString()).lte('created_at', de.toISOString()); d7.push({ label: d.toLocaleDateString('id-ID', { weekday: 'short' }), value: count || 0 }); }
      setConvChart(d7);
    } catch (e) { console.error(e); }
    setStatsLoading(false);
  }, []);

  const fetchConv = useCallback(async (f: typeof timeFilter) => {
    setConvLoading(true);
    const now = new Date(); let s: Date;
    switch (f) { case 'daily': s = new Date(now); s.setHours(0, 0, 0, 0); break; case 'weekly': s = new Date(now); s.setDate(now.getDate() - 7); break; case 'monthly': s = new Date(now.getFullYear(), now.getMonth(), 1); break; case 'yearly': s = new Date(now.getFullYear(), 0, 1); break; }
    try { const { data } = await supabase.from('conversations').select('*').gte('created_at', s.toISOString()).order('created_at', { ascending: false }); setConversations(data || []); } catch (e) { console.error(e); }
    setConvLoading(false);
  }, []);

  useEffect(() => { if (activeTab === 'conversations' || activeTab === 'overview') fetchConv(timeFilter); }, [activeTab, timeFilter, fetchConv]);
  useEffect(() => { if (activeTab === 'products' || activeTab === 'overview') { (async () => { setProdLoading(true); try { const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false }); setProducts(data || []); } catch (e) { console.error(e); } setProdLoading(false); })(); } }, [activeTab]);
  useEffect(() => { if (activeTab === 'orders' || activeTab === 'overview') { (async () => { setOrdLoading(true); try { const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }); setOrders(data || []); } catch (e) { console.error(e); } setOrdLoading(false); })(); } }, [activeTab]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const viewChat = async (conv: Conversation) => { setSelConv(conv); setShowChatModal(true); setChatHistLoad(true); try { const { data } = await supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true }); setChatHist(data || []); } catch (e) { console.error(e); } setChatHistLoad(false); };

  const delConv = async (id: string) => { if (!confirm('Hapus percakapan ini?')) return; setDeletingConvId(id); try { await supabase.from('messages').delete().eq('conversation_id', id); await supabase.from('conversations').delete().eq('id', id); setConversations(conversations.filter(c => c.id !== id)); addToast('success', 'Percakapan dihapus'); } catch (e) { console.error(e); addToast('error', 'Gagal menghapus'); } setDeletingConvId(null); };
  const delAllConv = async () => { if (!confirm('Hapus SEMUA percakapan?')) return; try { const { data: all } = await supabase.from('conversations').select('id'); if (all) for (const c of all) await supabase.from('messages').delete().eq('conversation_id', c.id); await supabase.from('conversations').delete().neq('id', '00000000'); setConversations([]); addToast('success', 'Semua percakapan dihapus'); } catch (e) { console.error(e); addToast('error', 'Gagal menghapus'); } };

  const saveProduct = async (e: React.FormEvent) => { e.preventDefault(); setProdSaving(true); try { const d = { name: prodForm.name, category: prodForm.category, skin_type: prodForm.skin_type, description: prodForm.description, price: parseInt(prodForm.price), ingredients: prodForm.ingredients }; if (editProd) { await supabase.from('products').update(d).eq('id', editProd.id); addToast('success', 'Produk diperbarui'); } else { await supabase.from('products').insert(d); addToast('success', 'Produk ditambahkan'); } setShowProdModal(false); setEditProd(null); setProdForm({ name: '', category: '', skin_type: '', description: '', price: '', ingredients: '' }); const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false }); setProducts(data || []); } catch (e) { console.error(e); addToast('error', 'Gagal menyimpan produk'); } setProdSaving(false); };
  const editProduct = (p: Product) => { setEditProd(p); setProdForm({ name: p.name, category: p.category, skin_type: p.skin_type, description: p.description, price: p.price.toString(), ingredients: p.ingredients }); setShowProdModal(true); };
  const delProduct = async (id: string) => { if (!confirm('Hapus produk ini?')) return; setDeletingProdId(id); try { await supabase.from('products').delete().eq('id', id); setProducts(products.filter(p => p.id !== id)); addToast('success', 'Produk dihapus'); } catch (e) { console.error(e); addToast('error', 'Gagal menghapus'); } setDeletingProdId(null); };

  const updateOrderStatus = async (id: string, status: string) => { setUpdatingOrdId(id); try { await supabase.from('orders').update({ status }).eq('id', id); setOrders(orders.map(o => o.id === id ? { ...o, status } : o)); if (selOrder?.id === id) setSelOrder({ ...selOrder, status }); addToast('success', `Status diubah ke ${statusLabels[status] || status}`); } catch (e) { console.error(e); addToast('error', 'Gagal mengubah status'); } setUpdatingOrdId(null); };
  const delOrder = async (id: string) => { if (!confirm('Hapus pesanan ini?')) return; setDeletingOrdId(id); try { await supabase.from('orders').delete().eq('id', id); setOrders(orders.filter(o => o.id !== id)); if (selOrder?.id === id) { setShowOrderModal(false); setSelOrder(null); } addToast('success', 'Pesanan dihapus'); } catch (e) { console.error(e); addToast('error', 'Gagal menghapus'); } setDeletingOrdId(null); };
  const viewOrder = (o: Order) => { setSelOrder(o); setShowOrderModal(true); };

  const exportCSV = () => {
    const fo = filteredOrders; const h = ['No Order', 'Nama', 'HP', 'Alamat', 'Pembayaran', 'Total', 'Status', 'Tanggal'];
    const r = fo.map(o => [o.order_number, o.customer_name, o.phone, (o.address || '').replace(/,/g, ';'), payLabels[o.payment_method] || '-', o.total, o.status, new Date(o.created_at).toLocaleDateString('id-ID')]);
    const csv = [h.join(','), ...r.map(x => x.join(','))].join('\n');
    const b = new Blob([csv], { type: 'text/csv' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(u);
    addToast('success', 'CSV berhasil di-export');
  };

  const genInsight = async () => {
    setInsightLoad(true); setInsight('');
    try {
      const [msg, ord, prod, conv] = await Promise.all([
        supabase.from('messages').select('content, role, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('products').select('*'),
        supabase.from('conversations').select('*'),
      ]);
      const ctx = `\nDATA BISNIS GLOWBOT\n\nPERCAKAPAN (${conv.data?.length || 0}):\n${msg.data?.slice(0, 40).map(m => `${m.role}: ${m.content?.substring(0, 80)}`).join('\n') || 'Tidak ada'}\n\nPESANAN (${ord.data?.length || 0}):\n${ord.data?.map(o => `#${o.order_number}: Rp${o.total} - ${o.status} - ${payLabels[o.payment_method] || 'N/A'}`).join('\n') || 'Tidak ada'}\n\nPRODUK (${prod.data?.length || 0}):\n${prod.data?.map(p => `${p.name} (${p.category}) - ${p.skin_type} - Rp${p.price}`).join('\n') || 'Tidak ada'}`;
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [
          { role: 'system', content: 'Kamu analis bisnis senior GlowBot. Analisis data berikut dan berikan insight MENYELURUH dalam Bahasa Indonesia:\n1. Tren Percakapan\n2. Analisis Jenis Kulit\n3. Produk Terpopuler\n4. Performa Penjualan\n5. Rekomendasi Bisnis (min 3)\n6. Waktu Tersibuk\nBeri jawaban detail dan actionable!' },
          { role: 'user', content: ctx },
        ], temperature: 0.7, max_tokens: 2000 }),
      });
      const d = await res.json(); setInsight(d.choices?.[0]?.message?.content || 'Gagal membuat insight.'); setInsightTime(new Date().toLocaleString('id-ID'));
    } catch (e) { console.error(e); setInsight('Terjadi kesalahan.'); addToast('error', 'Gagal generate insight'); }
    setInsightLoad(false);
  };

  const copyInsight = () => { navigator.clipboard.writeText(insight); setInsightCopied(true); setTimeout(() => setInsightCopied(false), 2000); addToast('success', 'Insight disalin'); };

  const totalPages = Math.ceil(conversations.length / perPage);
  const pagConv = conversations.slice((convPage - 1) * perPage, convPage * perPage);
  const filteredOrders = orders.filter(o => {
    if (ordFilter !== 'all' && o.status !== ordFilter) return false;
    if (ordSearch && !o.customer_name.toLowerCase().includes(ordSearch.toLowerCase()) && !o.order_number.toLowerCase().includes(ordSearch.toLowerCase())) return false;
    return true;
  });

  const SC = ({ icon: I, title, value, loading: l, suffix }: { icon: React.ElementType; title: string; value: string | number; loading?: boolean; suffix?: string }) => (
    <div className="bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-pink-100">
      <div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0"><I className="w-4 h-4 lg:w-5 lg:h-5 text-white" /></div><p className="text-xs lg:text-sm text-gray-500">{title}</p></div>
      {l ? <div className="h-7 bg-pink-50 rounded-lg animate-pulse" /> : <p className="text-xl lg:text-2xl font-bold text-gray-800">{typeof value === 'number' ? value.toLocaleString('id-ID') : value}{suffix && <span className="text-xs lg:text-sm font-normal text-gray-500 ml-1">{suffix}</span>}</p>}
    </div>
  );

  if (!isLoggedIn) return <AdminLogin onLogin={() => setIsLoggedIn(true)} />;

  const tabs = [
    { id: 'overview' as const, icon: BarChart3, label: 'Overview' },
    { id: 'conversations' as const, icon: MessageSquare, label: 'Percakapan' },
    { id: 'products' as const, icon: Package, label: 'Produk' },
    { id: 'orders' as const, icon: ShoppingBag, label: 'Pesanan' },
    { id: 'insights' as const, icon: Sparkles, label: 'AI Insight' },
  ];

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-pink-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5 text-white" /></div>
          {(sidebarOpen || mobileMenu) && <span className="font-bold text-gray-800">GlowBot Admin</span>}
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setMobileMenu(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${activeTab === t.id ? 'bg-pink-500 text-white' : 'hover:bg-pink-50 text-gray-700'}`}>
            <t.icon className="w-5 h-5 flex-shrink-0" />{(sidebarOpen || mobileMenu) && <span>{t.label}</span>}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-pink-100 space-y-1">
        <button onClick={onBackToChat} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-all text-sm"><ChevronLeft className="w-5 h-5 flex-shrink-0" />{(sidebarOpen || mobileMenu) && <span>Kembali ke Chat</span>}</button>
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all text-sm"><LogOut className="w-5 h-5 flex-shrink-0" />{(sidebarOpen || mobileMenu) && <span>Logout</span>}</button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex ${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-pink-100 transition-all duration-300 flex-col`}>{sidebarContent}</aside>
      {/* Mobile sidebar */}
      {mobileMenu && <div className="fixed inset-0 z-40 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenu(false)} /><aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl flex flex-col z-50">{sidebarContent}</aside></div>}

      <main className="flex-1 min-w-0 overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 px-4 lg:px-6 py-3 lg:py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button onClick={() => { if (window.innerWidth < 1024) setMobileMenu(true); else setSidebarOpen(!sidebarOpen); }} className="p-2 rounded-lg hover:bg-pink-100"><Menu className="w-5 h-5 text-gray-600" /></button>
            <h1 className="text-sm lg:text-xl font-bold text-gray-800 truncate mx-3">{tabs.find(t => t.id === activeTab)?.label}</h1>
            <div className="w-8" />
          </div>
        </header>

        <div className="p-3 lg:p-6 overflow-y-auto" style={{ height: 'calc(100vh - 57px)' }}>
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {statsLoading ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} />) : <>
                  <SC icon={MessageSquare} title="Total Percakapan" value={stats.totalConv} />
                  <SC icon={Users} title="Total Pesan" value={stats.totalMsg} />
                  <SC icon={Package} title="Total Produk" value={stats.totalProd} />
                  <SC icon={ShoppingBag} title="Total Pesanan" value={stats.totalOrders} />
                </>}
              </div>
              <div className="bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-4 lg:p-6 text-white">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm lg:text-base"><Calendar className="w-4 h-4 lg:w-5 lg:h-5" /> Statistik Hari Ini</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
                  <div><p className="text-pink-100 text-xs lg:text-sm">Percakapan</p><p className="text-xl lg:text-2xl font-bold">{stats.todayConv}</p></div>
                  <div><p className="text-pink-100 text-xs lg:text-sm">Pesan</p><p className="text-xl lg:text-2xl font-bold">{stats.todayMsg}</p></div>
                  <div><p className="text-pink-100 text-xs lg:text-sm">Pesanan</p><p className="text-xl lg:text-2xl font-bold">{stats.todayOrders}</p></div>
                  <div><p className="text-pink-100 text-xs lg:text-sm">Pendapatan</p><p className="text-xl lg:text-2xl font-bold">Rp{stats.todayRevenue.toLocaleString('id-ID')}</p></div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <BarChart data={convChart} title="Percakapan 7 Hari Terakhir" loading={statsLoading} />
                <PieChart data={skinChart} title="Distribusi Jenis Kulit" loading={statsLoading} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-pink-100">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">Percakapan Terbaru</h3>
                  {convLoading ? <div className="space-y-2">{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</div> : conversations.length === 0 ? <EmptyState icon={MessageSquare} title="Belum ada percakapan" sub="Data akan muncul setelah ada chat" /> :
                    <div className="space-y-1">{conversations.slice(0, 5).map(c => (<button key={c.id} onClick={() => viewChat(c)} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-pink-50 text-left"><div><p className="font-medium text-gray-800 text-sm">{c.user_name}</p><p className="text-xs text-gray-500">{skinLabels[c.skin_type] || c.skin_type}</p></div><span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('id-ID')}</span></button>))}</div>}
                </div>
                <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-pink-100">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">Pesanan Terbaru</h3>
                  {ordLoading ? <div className="space-y-2">{[1, 2, 3].map(i => <SkeletonRow key={i} />)}</div> : orders.length === 0 ? <EmptyState icon={ShoppingBag} title="Belum ada pesanan" sub="Data akan muncul setelah ada order" /> :
                    <div className="space-y-1">{orders.slice(0, 5).map(o => (<button key={o.id} onClick={() => viewOrder(o)} className="w-full flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-pink-50 text-left"><div><p className="font-medium text-gray-800 text-sm">{o.customer_name}</p><p className="text-xs text-gray-500">{o.order_number}</p></div><div className="text-right"><p className="text-sm font-semibold text-pink-500">Rp{o.total.toLocaleString('id-ID')}</p><span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabels[o.status] || o.status}</span></div></button>))}</div>}
                </div>
              </div>
            </div>
          )}

          {/* CONVERSATIONS */}
          {activeTab === 'conversations' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(f => (<button key={f} onClick={() => setTimeFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${timeFilter === f ? 'bg-pink-500 text-white' : 'bg-white text-gray-700 hover:bg-pink-50 border border-pink-100'}`}>{{ daily: 'Harian', weekly: 'Mingguan', monthly: 'Bulanan', yearly: 'Tahunan' }[f]}</button>))}
                  <span className="text-xs text-gray-500">({conversations.length})</span>
                </div>
                {conversations.length > 0 && <button onClick={delAllConv} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium"><Trash2 className="w-4 h-4" /> Hapus Semua</button>}
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]"><thead className="bg-pink-50"><tr><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">No</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Nama</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Kulit</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Tanggal</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Aksi</th></tr></thead>
                  <tbody>
                    {convLoading ? <tr><td colSpan={5} className="p-4"><div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}</div></td></tr> :
                      pagConv.length === 0 ? <tr><td colSpan={5}><EmptyState icon={MessageSquare} title="Tidak ada percakapan" sub="Ubah filter atau mulai chat baru" /></td></tr> :
                      pagConv.map((c, i) => (<tr key={c.id} className="border-t border-pink-50 hover:bg-pink-50/50"><td className="px-4 lg:px-6 py-3 text-xs text-gray-600">{(convPage - 1) * perPage + i + 1}</td><td className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-800">{c.user_name}</td><td className="px-4 lg:px-6 py-3"><span className="px-2 py-1 rounded-full text-xs bg-pink-100 text-pink-600">{skinLabels[c.skin_type] || c.skin_type}</span></td><td className="px-4 lg:px-6 py-3 text-xs text-gray-600">{new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td><td className="px-4 lg:px-6 py-3"><div className="flex gap-1"><button onClick={() => viewChat(c)} className="p-1.5 rounded-lg hover:bg-pink-100 text-pink-500"><Eye className="w-3.5 h-3.5" /></button><button onClick={() => delConv(c.id)} disabled={deletingConvId === c.id} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 disabled:opacity-50">{deletingConvId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button></div></td></tr>))}
                  </tbody></table>
                </div>
                {totalPages > 1 && <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-pink-100 gap-2"><p className="text-xs text-gray-500">{(convPage - 1) * perPage + 1}-{Math.min(convPage * perPage, conversations.length)} / {conversations.length}</p><div className="flex gap-1"><button onClick={() => setConvPage(p => Math.max(1, p - 1))} disabled={convPage === 1} className="p-1.5 rounded-lg hover:bg-pink-100 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>{Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => <button key={p} onClick={() => setConvPage(p)} className={`w-7 h-7 rounded-lg text-xs ${convPage === p ? 'bg-pink-500 text-white' : 'hover:bg-pink-100 text-gray-700'}`}>{p}</button>)}<button onClick={() => setConvPage(p => Math.min(totalPages, p + 1))} disabled={convPage === totalPages} className="p-1.5 rounded-lg hover:bg-pink-100 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button></div></div>}
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex justify-end"><button onClick={() => { setEditProd(null); setProdForm({ name: '', category: '', skin_type: '', description: '', price: '', ingredients: '' }); setShowProdModal(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white text-sm font-medium shadow-md hover:shadow-lg"><Plus className="w-4 h-4" /> Tambah Produk</button></div>
              <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]"><thead className="bg-pink-50"><tr><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Nama</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Kategori</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Kulit</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Harga</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Aksi</th></tr></thead>
                  <tbody>
                    {prodLoading ? <tr><td colSpan={5} className="p-4"><div className="space-y-2">{[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}</div></td></tr> :
                      products.length === 0 ? <tr><td colSpan={5}><EmptyState icon={Package} title="Belum ada produk" sub="Tambahkan produk pertama" /></td></tr> :
                      products.map(p => (<tr key={p.id} className="border-t border-pink-50 hover:bg-pink-50/50"><td className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-800">{p.name}</td><td className="px-4 lg:px-6 py-3 text-xs text-gray-600">{p.category}</td><td className="px-4 lg:px-6 py-3"><span className="px-2 py-1 rounded-full text-xs bg-pink-100 text-pink-600">{skinLabels[p.skin_type] || p.skin_type}</span></td><td className="px-4 lg:px-6 py-3 text-xs font-semibold text-pink-500">Rp{p.price.toLocaleString('id-ID')}</td><td className="px-4 lg:px-6 py-3"><div className="flex gap-1"><button onClick={() => editProduct(p)} className="p-1.5 rounded-lg hover:bg-pink-100 text-pink-500"><Pencil className="w-3.5 h-3.5" /></button><button onClick={() => delProduct(p.id)} disabled={deletingProdId === p.id} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 disabled:opacity-50">{deletingProdId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button></div></td></tr>))}
                  </tbody></table>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input type="text" value={ordSearch} onChange={e => setOrdSearch(e.target.value)} placeholder="Cari nama/no order..." className="w-full sm:w-52 pl-9 pr-4 py-2 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400 text-sm" /></div>
                  <select value={ordFilter} onChange={e => setOrdFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400 text-sm"><option value="all">Semua Status</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="shipped">Shipped</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
                </div>
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-100 text-pink-600 hover:bg-pink-200 text-sm font-medium whitespace-nowrap"><Download className="w-4 h-4" /> Export CSV</button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]"><thead className="bg-pink-50"><tr><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">No Order</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Nama</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">HP</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Pembayaran</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Total</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Tanggal</th><th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700">Aksi</th></tr></thead>
                  <tbody>
                    {ordLoading ? <tr><td colSpan={8} className="p-4"><div className="space-y-2">{[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}</div></td></tr> :
                      filteredOrders.length === 0 ? <tr><td colSpan={8}><EmptyState icon={ShoppingBag} title="Tidak ada pesanan" sub="Ubah filter atau tunggu order baru" /></td></tr> :
                      filteredOrders.map(o => { const PI = payIcons[o.payment_method] || CreditCard; return (
                        <tr key={o.id} className="border-t border-pink-50 hover:bg-pink-50/50 cursor-pointer" onClick={() => viewOrder(o)}>
                          <td className="px-4 lg:px-6 py-3 text-xs font-medium text-gray-800">{o.order_number}</td>
                          <td className="px-4 lg:px-6 py-3 text-xs text-gray-600">{o.customer_name}</td>
                          <td className="px-4 lg:px-6 py-3 text-xs text-gray-600">{o.phone}</td>
                          <td className="px-4 lg:px-6 py-3"><span className="flex items-center gap-1 text-xs"><PI className="w-3.5 h-3.5 text-gray-500" />{payLabels[o.payment_method] || 'N/A'}</span></td>
                          <td className="px-4 lg:px-6 py-3 text-xs font-semibold text-pink-500">Rp{o.total.toLocaleString('id-ID')}</td>
                          <td className="px-4 lg:px-6 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[o.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabels[o.status] || o.status}</span></td>
                          <td className="px-4 lg:px-6 py-3 text-xs text-gray-600">{new Date(o.created_at).toLocaleDateString('id-ID')}</td>
                          <td className="px-4 lg:px-6 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)} disabled={updatingOrdId === o.id} className="px-2 py-1 rounded-lg border border-pink-200 text-xs focus:outline-none focus:border-pink-400 disabled:opacity-50"><option value="pending">Pending</option><option value="paid">Paid</option><option value="shipped">Shipped</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
                              <button onClick={() => delOrder(o.id)} disabled={deletingOrdId === o.id} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 disabled:opacity-50">{deletingOrdId === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}</button>
                            </div>
                          </td>
                        </tr>); })}
                  </tbody></table>
                </div>
              </div>
            </div>
          )}

          {/* INSIGHTS */}
          {activeTab === 'insights' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div><h2 className="text-base lg:text-lg font-semibold text-gray-800">AI Insight Lengkap</h2>{insightTime && <p className="text-xs text-gray-500">Terakhir: {insightTime}</p>}</div>
                <div className="flex gap-2">
                  {insight && <button onClick={copyInsight} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium">{insightCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{insightCopied ? 'Tersalin!' : 'Export'}</button>}
                  <button onClick={genInsight} disabled={insightLoad} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white text-sm font-medium shadow-md hover:shadow-lg disabled:opacity-50">{insightLoad ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis...</> : <><Sparkles className="w-4 h-4" /> Generate Insight</>}</button>
                </div>
              </div>
              {insight ? <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-pink-100"><div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm">{insight}</div></div> :
                <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-sm border border-pink-100 text-center"><Sparkles className="w-12 h-12 lg:w-16 lg:h-16 text-pink-300 mx-auto mb-4" /><h3 className="text-base lg:text-lg font-semibold text-gray-800 mb-2">Belum Ada Insight</h3><p className="text-gray-500 text-sm mb-6">Klik tombol di atas untuk menganalisis data bisnis</p></div>}
            </div>
          )}
        </div>
      </main>

      {/* Chat Modal */}
      {showChatModal && selConv && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3"><div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"><div className="flex items-center justify-between p-4 border-b border-pink-100 flex-shrink-0"><div><h3 className="font-semibold text-gray-800 text-sm">Chat dengan {selConv.user_name}</h3><p className="text-xs text-gray-500">{skinLabels[selConv.skin_type] || selConv.skin_type}</p></div><button onClick={() => setShowChatModal(false)} className="p-2 rounded-lg hover:bg-pink-100"><X className="w-5 h-5 text-gray-500" /></button></div><div className="flex-1 overflow-y-auto p-4 space-y-3">{chatHistLoad ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-pink-500 animate-spin" /></div> : chatHist.length === 0 ? <p className="text-gray-500 text-center py-12 text-sm">Tidak ada pesan</p> : chatHist.map(m => (<div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}><p className="whitespace-pre-wrap">{m.content}</p></div></div>))}</div></div></div>)}

      {/* Order Detail Modal */}
      {showOrderModal && selOrder && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3"><div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"><div className="flex items-center justify-between p-4 border-b border-pink-100 flex-shrink-0"><div><h3 className="font-semibold text-gray-800 text-sm">Detail Pesanan</h3><p className="text-xs text-gray-500">{selOrder.order_number}</p></div><button onClick={() => { setShowOrderModal(false); setSelOrder(null); }} className="p-2 rounded-lg hover:bg-pink-100"><X className="w-5 h-5 text-gray-500" /></button></div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-pink-50 rounded-xl p-4"><h4 className="font-medium text-gray-800 text-sm mb-2">Info Pelanggan</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm"><div><span className="text-gray-500">Nama: </span><span className="font-medium">{selOrder.customer_name}</span></div><div><span className="text-gray-500">HP: </span><span className="font-medium">{selOrder.phone}</span></div><div className="sm:col-span-2"><span className="text-gray-500">Alamat: </span><span className="font-medium">{selOrder.address || '-'}</span></div></div></div>
          <div className="bg-blue-50 rounded-xl p-4"><h4 className="font-medium text-gray-800 text-sm mb-2 flex items-center gap-2">{(() => { const I = payIcons[selOrder.payment_method] || CreditCard; return <I className="w-4 h-4" />; })()}Pembayaran</h4><p className="text-sm font-medium">{payLabels[selOrder.payment_method] || 'Tidak ditentukan'}</p></div>
          <div><h4 className="font-medium text-gray-800 text-sm mb-2">Item Pesanan</h4><div className="space-y-2">{selOrder.items?.map((item, i) => (<div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-sm"><div><p className="font-medium text-gray-800">{item.name}</p><p className="text-xs text-gray-500">{item.category} | x{item.quantity}</p></div><p className="font-semibold text-pink-500">Rp{(item.subtotal || item.price * item.quantity).toLocaleString('id-ID')}</p></div>))}</div></div>
          <div className="border-t border-pink-100 pt-3 space-y-2 text-sm"><div className="flex justify-between text-gray-600"><span>Subtotal</span><span>Rp{(selOrder.total - 15000).toLocaleString('id-ID')}</span></div><div className="flex justify-between text-gray-600"><span>Ongkir</span><span>Rp15.000</span></div><div className="flex justify-between font-semibold text-gray-800 text-base pt-2 border-t border-pink-100"><span>Total</span><span className="text-pink-500">Rp{selOrder.total.toLocaleString('id-ID')}</span></div></div>
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-sm text-gray-500">Status:</span><span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[selOrder.status] || 'bg-gray-100 text-gray-600'}`}>{statusLabels[selOrder.status] || selOrder.status}</span></div><select value={selOrder.status} onChange={e => updateOrderStatus(selOrder.id, e.target.value)} disabled={updatingOrdId === selOrder.id} className="px-3 py-1.5 rounded-lg border border-pink-200 text-sm focus:outline-none focus:border-pink-400 disabled:opacity-50"><option value="pending">Pending</option><option value="paid">Paid</option><option value="shipped">Shipped</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
          <p className="text-xs text-gray-400">{new Date(selOrder.created_at).toLocaleString('id-ID')}</p>
        </div>
        <div className="p-4 border-t border-pink-100 flex-shrink-0"><button onClick={() => delOrder(selOrder.id)} disabled={deletingOrdId === selOrder.id} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium disabled:opacity-50">{deletingOrdId === selOrder.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}Hapus Pesanan</button></div>
      </div></div>)}

      {/* Product Modal */}
      {showProdModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3"><div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"><div className="flex items-center justify-between p-4 border-b border-pink-100 flex-shrink-0"><h3 className="font-semibold text-gray-800 text-sm">{editProd ? 'Edit Produk' : 'Tambah Produk'}</h3><button onClick={() => setShowProdModal(false)} className="p-2 rounded-lg hover:bg-pink-100"><X className="w-5 h-5 text-gray-500" /></button></div>
        <form onSubmit={saveProduct} className="flex-1 overflow-y-auto p-4 space-y-3">
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Nama</label><input type="text" value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 text-sm" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Kategori</label><input type="text" value={prodForm.category} onChange={e => setProdForm({ ...prodForm, category: e.target.value })} className="w-full px-3 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 text-sm" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Jenis Kulit</label><select value={prodForm.skin_type} onChange={e => setProdForm({ ...prodForm, skin_type: e.target.value })} className="w-full px-3 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 text-sm" required><option value="">Pilih</option><option value="berminyak">Berminyak</option><option value="kering">Kering</option><option value="kombinasi">Kombinasi</option><option value="sensitif">Sensitif</option><option value="semua">Semua</option></select></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Deskripsi</label><textarea value={prodForm.description} onChange={e => setProdForm({ ...prodForm, description: e.target.value })} className="w-full px-3 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 resize-none text-sm" rows={2} required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Harga (Rp)</label><input type="number" value={prodForm.price} onChange={e => setProdForm({ ...prodForm, price: e.target.value })} className="w-full px-3 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 text-sm" required /></div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Bahan Utama</label><textarea value={prodForm.ingredients} onChange={e => setProdForm({ ...prodForm, ingredients: e.target.value })} className="w-full px-3 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 resize-none text-sm" rows={2} required /></div>
          <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowProdModal(false)} className="flex-1 py-2 rounded-xl border-2 border-pink-200 text-gray-700 hover:bg-pink-50 text-sm">Batal</button><button type="submit" disabled={prodSaving} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white text-sm font-medium disabled:opacity-50">{prodSaving ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Menyimpan...</span> : editProd ? 'Simpan' : 'Tambah'}</button></div>
        </form>
      </div></div>)}
    </div>
  );
}
