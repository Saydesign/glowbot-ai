import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  MessageSquare,
  Users,
  Sparkles,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Pencil,
  Trash2,
  Eye,
  BarChart3,
  Loader2,
  Menu,
  ShoppingBag,
  LogOut,
  Calendar,
  Download,
  Search,
  RefreshCw,
  Copy,
  Check,
  Filter,
} from 'lucide-react';
import { BarChart, PieChart } from './Charts';
import { AdminLogin } from './AdminLogin';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface Conversation {
  id: string;
  user_name: string;
  skin_type: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  category: string;
  skin_type: string;
  description: string;
  price: number;
  ingredients: string;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  address: string;
  items: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  total: number;
  status: string;
  created_at: string;
}

interface AdminDashboardProps {
  onBackToChat: () => void;
}

 const skinTypeLabels: Record<string, string> = {
  berminyak: 'Berminyak',
  kering: 'Kering',
  kombinasi: 'Kombinasi',
  sensitif: 'Sensitif',
  semua: 'Semua',
 };

 const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  selesai: 'bg-green-100 text-green-700',
  batal: 'bg-red-100 text-red-700',
 };

 const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  selesai: 'Selesai',
  batal: 'Batal',
 };

export function AdminDashboard({ onBackToChat }: AdminDashboardProps) {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('glowbot_admin_session') === 'true');

  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'products' | 'orders' | 'insights'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    mostCommonSkinType: '-',
    totalProducts: 0,
    totalOrders: 0,
    todayConversations: 0,
    todayMessages: 0,
    todayOrders: 0,
    todayRevenue: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Chat History Modal
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    category: '',
    skin_type: '',
    description: '',
    price: '',
    ingredients: '',
  });
  const [productSaving, setProductSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Charts
  const [conversationChartData, setConversationChartData] = useState<{ label: string; value: number }[]>([]);
  const [skinTypeChartData, setSkinTypeChartData] = useState<{ label: string; value: number; color?: string }[]>([]);

  // Insights
  const [insight, setInsight] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState(false);
  const [lastInsightTime, setLastInsightTime] = useState<string | null>(null);
  const [insightCopied, setInsightCopied] = useState(false);

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('glowbot_admin_session');
    setIsLoggedIn(false);
  };

  // Fetch all stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [convRes, msgRes, prodRes, ordersRes, todayConv, todayMsg, todayOrdersRes] = await Promise.all([
        supabase.from('conversations').select('skin_type'),
        supabase.from('messages').select('id', { count: 'exact' }),
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select('total'),
        supabase.from('conversations').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
        supabase.from('messages').select('id', { count: 'exact' }).gte('created_at', today.toISOString()),
        supabase.from('orders').select('total').gte('created_at', today.toISOString()),
      ]);

      const skinTypes = convRes.data?.map((c: Conversation) => c.skin_type) || [];
      const skinTypeCounts: Record<string, number> = {};
      skinTypes.forEach((st: string) => {
        skinTypeCounts[st] = (skinTypeCounts[st] || 0) + 1;
      });
      const mostCommon = Object.entries(skinTypeCounts).sort((a, b) => b[1] - a[1])[0];

      const todayRevenue = todayOrdersRes.data?.reduce((sum: number, o: { total: number }) => sum + o.total, 0) || 0;

      const totalOrders = ordersRes.data?.length || 0;

      setStats({
        totalConversations: convRes.data?.length || 0,
        totalMessages: msgRes.count || 0,
        mostCommonSkinType: mostCommon ? skinTypeLabels[mostCommon[0]] || mostCommon[0] : '-',
        totalProducts: prodRes.count || 0,
        totalOrders,
        todayConversations: todayConv.count || 0,
        todayMessages: todayMsg.count || 0,
        todayOrders: todayOrdersRes.data?.length || 0,
        todayRevenue,
      });

      // Chart data
      if (skinTypes.length > 0) {
        const skinChartData = Object.entries(skinTypeCounts).map(([type, count]) => ({
          label: skinTypeLabels[type] || type,
          value: count,
          color: type === 'berminyak' ? '#ec4899' : type === 'kering' ? '#f43f5e' : type === 'kombinasi' ? '#f59e0b' : '#10b981',
        }));
        setSkinTypeChartData(skinChartData);
      }

      // Conversation chart (last 7 days)
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const { count } = await supabase
          .from('conversations')
          .select('id', { count: 'exact' })
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());

        last7Days.push({
          label: date.toLocaleDateString('id-ID', { weekday: 'short' }),
          value: count || 0,
        });
      }
      setConversationChartData(last7Days);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
    setStatsLoading(false);
  }, []);

  // Filter conversations by time
  const filterConversationsByTime = useCallback(async (filter: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setConversationsLoading(true);
    const now = new Date();
    let startDate: Date;

    switch (filter) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });
      setConversations(data || []);
    } catch (err) {
      console.error('Error filtering conversations:', err);
    }
    setConversationsLoading(false);
  }, []);

  // Fetch conversations
  useEffect(() => {
    if (activeTab === 'conversations' || activeTab === 'overview') {
      filterConversationsByTime(timeFilter);
    }
  }, [activeTab, timeFilter, filterConversationsByTime]);

  // Fetch products
  useEffect(() => {
    if (activeTab === 'products' || activeTab === 'overview') {
      const fetchProducts = async () => {
        setProductsLoading(true);
        try {
          const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
          setProducts(data || []);
        } catch (err) {
          console.error('Error fetching products:', err);
        }
        setProductsLoading(false);
      };
      fetchProducts();
    }
  }, [activeTab]);

  // Fetch orders
  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'overview') {
      const fetchOrders = async () => {
        setOrdersLoading(true);
        try {
          const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
          setOrders(data || []);
        } catch (err) {
          console.error('Error fetching orders:', err);
        }
        setOrdersLoading(false);
      };
      fetchOrders();
    }
  }, [activeTab]);

  // Fetch stats
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch chat history
  const fetchChatHistory = async (conversationId: string) => {
    setChatHistoryLoading(true);
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setChatHistory(data || []);
    } catch (err) {
      console.error('Error fetching chat history:', err);
    }
    setChatHistoryLoading(false);
  };

  const handleConversationClick = (conv: Conversation) => {
    setSelectedConversation(conv);
    setShowChatModal(true);
    fetchChatHistory(conv.id);
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    if (!confirm('Hapus percakapan ini beserta semua pesannya?')) return;
    setDeletingConversationId(id);
    try {
      await supabase.from('messages').delete().eq('conversation_id', id);
      await supabase.from('conversations').delete().eq('id', id);
      setConversations(conversations.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
    setDeletingConversationId(null);
  };

  // Delete all conversations
  const handleDeleteAllConversations = async () => {
    if (!confirm('Hapus SEMUA percakapan? Tindakan ini tidak dapat dibatalkan!')) return;
    try {
      const { data: allConvs } = await supabase.from('conversations').select('id');
      if (allConvs) {
        for (const conv of allConvs) {
          await supabase.from('messages').delete().eq('conversation_id', conv.id);
        }
      }
      await supabase.from('conversations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      setConversations([]);
    } catch (err) {
      console.error('Error deleting all conversations:', err);
    }
  };

  // Product CRUD
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductSaving(true);
    try {
      const productData = {
        name: productForm.name,
        category: productForm.category,
        skin_type: productForm.skin_type,
        description: productForm.description,
        price: parseInt(productForm.price),
        ingredients: productForm.ingredients,
      };

      if (editingProduct) {
        await supabase.from('products').update(productData).eq('id', editingProduct.id);
      } else {
        await supabase.from('products').insert(productData);
      }

      setShowProductModal(false);
      setEditingProduct(null);
      setProductForm({ name: '', category: '', skin_type: '', description: '', price: '', ingredients: '' });

      const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      setProducts(data || []);
      setStats((prev) => ({ ...prev, totalProducts: data?.length || 0 }));
    } catch (err) {
      console.error('Error saving product:', err);
    }
    setProductSaving(false);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category,
      skin_type: product.skin_type,
      description: product.description,
      price: product.price.toString(),
      ingredients: product.ingredients,
    });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Hapus produk ini?')) return;
    setDeletingProductId(productId);
    try {
      await supabase.from('products').delete().eq('id', productId);
      setProducts(products.filter((p) => p.id !== productId));
      setStats((prev) => ({ ...prev, totalProducts: prev.totalProducts - 1 }));
    } catch (err) {
      console.error('Error deleting product:', err);
    }
    setDeletingProductId(null);
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrderId(orderId);
    try {
      await supabase.from('orders').update({ status }).eq('id', orderId);
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (err) {
      console.error('Error updating order status:', err);
    }
    setUpdatingOrderId(null);
  };

  // Export orders to CSV
  const exportOrdersToCSV = () => {
    const filteredOrders = orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (orderSearch && !o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) && !o.order_number.toLowerCase().includes(orderSearch.toLowerCase())) return false;
      return true;
    });

    const headers = ['No Order', 'Nama', 'HP', 'Alamat', 'Total', 'Status', 'Tanggal'];
    const rows = filteredOrders.map((o) => [
      o.order_number,
      o.customer_name,
      o.phone,
      o.address.replace(/,/g, ';'),
      o.total,
      o.status,
      new Date(o.created_at).toLocaleDateString('id-ID'),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate AI Insight
  const generateInsight = async () => {
    setInsightLoading(true);
    setInsight('');
    try {
      const [messages, ordersData, productsData, conversationsData] = await Promise.all([
        supabase.from('messages').select('content, role').order('created_at', { ascending: false }).limit(200),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('products').select('*'),
        supabase.from('conversations').select('*'),
      ]);

      const dataContext = `
=== DATA BISNIS GLOWBOT ===

KONVERSI & PESAN (${conversationsData.data?.length || 0} percakapan, ${messages.data?.length || 0} pesan):
${messages.data?.slice(0, 50).map((m) => `${m.role}: ${m.content?.substring(0, 100)}`).join('\n') || 'Tidak ada data'}

PESANAN (${ordersData.data?.length || 0} total):
${ordersData.data?.map((o) => `Order #${o.order_number}: Rp${o.total} - ${o.status}`).join('\n') || 'Tidak ada data'}

PRODUK (${productsData.data?.length || 0} produk):
${productsData.data?.map((p) => `${p.name} (${p.category}) - ${p.skin_type}`).join('\n') || 'Tidak ada data'}
`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `Kamu adalah analis bisnis senior untuk aplikasi skincare GlowBot. Analisis data berikut dan berikan insight yang MENYELURUH dan TERSTRUKTUR dalam Bahasa Indonesia:

Buat analisis dengan format berikut:

## 1. Tren Percakapan
Analisis topik yang paling sering ditanyakan customers

## 2. Analisis Jenis Kulit
Segmentasi pelanggan berdasarkan jenis kulit dan saran marketing

## 3. Produk Terpopuler
Produk yang paling sering dibahas dan direkomendasikan

## 4. Performa Penjualan
Analisis tren pesanan dan pendapatan

## 5. Rekomendasi Bisnis
Minimal 3 saran konkret untuk meningkatkan penjualan

## 6. Waktu Tersibuk
Analisis kapan pelanggan paling aktif

Beri jawaban yang detail dan actionable!`,
            },
            {
              role: 'user',
              content: dataContext,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      const data = await response.json();
      setInsight(data.choices?.[0]?.message?.content || 'Gagal membuat insight.');
      setLastInsightTime(new Date().toLocaleString('id-ID'));
    } catch (err) {
      console.error('Error generating insight:', err);
      setInsight('Terjadi kesalahan saat membuat insight.');
    }
    setInsightLoading(false);
  };

  const copyInsight = () => {
    navigator.clipboard.writeText(insight);
    setInsightCopied(true);
    setTimeout(() => setInsightCopied(false), 2000);
  };

  // Pagination
  const totalPages = Math.ceil(conversations.length / itemsPerPage);
  const paginatedConversations = conversations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    if (orderSearch && !o.customer_name.toLowerCase().includes(orderSearch.toLowerCase()) && !o.order_number.toLowerCase().includes(orderSearch.toLowerCase())) return false;
    return true;
  });

  const StatCard = ({ icon: Icon, title, value, loading, suffix }: { icon: React.ElementType; title: string; value: string | number; loading?: boolean; suffix?: string }) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-pink-100">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
      {loading ? (
        <div className="h-8 bg-pink-50 rounded-lg animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-gray-800">
          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
          {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
        </p>
      )}
    </div>
  );

  if (!isLoggedIn) {
    return <AdminLogin onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-pink-100 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-pink-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && <span className="font-bold text-gray-800">GlowBot Admin</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'overview' ? 'bg-pink-500 text-white' : 'hover:bg-pink-50 text-gray-700'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            {sidebarOpen && <span>Overview</span>}
          </button>
          <button
            onClick={() => setActiveTab('conversations')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'conversations' ? 'bg-pink-500 text-white' : 'hover:bg-pink-50 text-gray-700'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {sidebarOpen && <span>Percakapan</span>}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'products' ? 'bg-pink-500 text-white' : 'hover:bg-pink-50 text-gray-700'
            }`}
          >
            <Package className="w-5 h-5" />
            {sidebarOpen && <span>Produk</span>}
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'orders' ? 'bg-pink-500 text-white' : 'hover:bg-pink-50 text-gray-700'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            {sidebarOpen && <span>Pesanan</span>}
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'insights' ? 'bg-pink-500 text-white' : 'hover:bg-pink-50 text-gray-700'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            {sidebarOpen && <span>AI Insight</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-pink-100 space-y-2">
          <button
            onClick={onBackToChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            {sidebarOpen && <span>Kembali ke Chat</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-gray-600 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-pink-100">
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'conversations' && 'Riwayat Percakapan'}
              {activeTab === 'products' && 'Manajemen Produk'}
              {activeTab === 'orders' && 'Daftar Pesanan'}
              {activeTab === 'insights' && 'AI Insights'}
            </h1>
            <div className="w-10" />
          </div>
        </header>

        <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Row 1 - Main Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={MessageSquare} title="Total Percakapan" value={stats.totalConversations} loading={statsLoading} />
                <StatCard icon={Users} title="Total Pesan" value={stats.totalMessages} loading={statsLoading} />
                <StatCard icon={Package} title="Total Produk" value={stats.totalProducts} loading={statsLoading} />
                <StatCard icon={ShoppingBag} title="Total Pesanan" value={stats.totalOrders} loading={statsLoading} />
              </div>

              {/* Row 2 - Today Stats */}
              <div className="bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Statistik Hari Ini
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-pink-100 text-sm">Percakapan</p>
                    <p className="text-2xl font-bold">{stats.todayConversations}</p>
                  </div>
                  <div>
                    <p className="text-pink-100 text-sm">Pesan</p>
                    <p className="text-2xl font-bold">{stats.todayMessages}</p>
                  </div>
                  <div>
                    <p className="text-pink-100 text-sm">Pesanan</p>
                    <p className="text-2xl font-bold">{stats.todayOrders}</p>
                  </div>
                  <div>
                    <p className="text-pink-100 text-sm">Pendapatan</p>
                    <p className="text-2xl font-bold">Rp{stats.todayRevenue.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>

              {/* Row 3 - Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChart data={conversationChartData} title="Percakapan 7 Hari Terakhir" loading={statsLoading} />
                <PieChart data={skinTypeChartData} title="Distribusi Jenis Kulit" loading={statsLoading} />
              </div>

              {/* Row 4 - Tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
                  <h3 className="font-semibold text-gray-800 mb-4">Percakapan Terbaru</h3>
                  {conversationsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-pink-50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : conversations.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Belum ada percakapan</p>
                  ) : (
                    <div className="space-y-2">
                      {conversations.slice(0, 5).map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => handleConversationClick(conv)}
                          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-pink-50 transition-all text-left"
                        >
                          <div>
                            <p className="font-medium text-gray-800">{conv.user_name}</p>
                            <p className="text-xs text-gray-500">{skinTypeLabels[conv.skin_type] || conv.skin_type}</p>
                          </div>
                          <span className="text-xs text-gray-400">{new Date(conv.created_at).toLocaleDateString('id-ID')}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
                  <h3 className="font-semibold text-gray-800 mb-4">Pesanan Terbaru</h3>
                  {ordersLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-pink-50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : orders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Belum ada pesanan</p>
                  ) : (
                    <div className="space-y-2">
                      {orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                          <div>
                            <p className="font-medium text-gray-800">{order.customer_name}</p>
                            <p className="text-xs text-gray-500">{order.order_number}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-pink-500">Rp{order.total.toLocaleString('id-ID')}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                              {statusLabels[order.status]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conversations Tab */}
          {activeTab === 'conversations' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <button onClick={() => setTimeFilter('daily')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${timeFilter === 'daily' ? 'bg-pink-500 text-white' : 'bg-white text-gray-700 hover:bg-pink-50'}`}>
                    Harian
                  </button>
                  <button onClick={() => setTimeFilter('weekly')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${timeFilter === 'weekly' ? 'bg-pink-500 text-white' : 'bg-white text-gray-700 hover:bg-pink-50'}`}>
                    Mingguan
                  </button>
                  <button onClick={() => setTimeFilter('monthly')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${timeFilter === 'monthly' ? 'bg-pink-500 text-white' : 'bg-white text-gray-700 hover:bg-pink-50'}`}>
                    Bulanan
                  </button>
                  <button onClick={() => setTimeFilter('yearly')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${timeFilter === 'yearly' ? 'bg-pink-500 text-white' : 'bg-white text-gray-700 hover:bg-pink-50'}`}>
                    Tahunan
                  </button>
                  <span className="text-sm text-gray-500 ml-2">({conversations.length} percakapan)</span>
                </div>
                {conversations.length > 0 && (
                  <button onClick={handleDeleteAllConversations} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium">
                    <Trash2 className="w-4 h-4" />
                    Hapus Semua
                  </button>
                )}
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-pink-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">No</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nama User</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Jenis Kulit</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversationsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : paginatedConversations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            Belum ada percakapan
                          </td>
                        </tr>
                      ) : (
                        paginatedConversations.map((conv, idx) => (
                          <tr key={conv.id} className="border-t border-pink-50 hover:bg-pink-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-600">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-800">{conv.user_name}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 rounded-full text-xs bg-pink-100 text-pink-600">
                                {skinTypeLabels[conv.skin_type] || conv.skin_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(conv.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleConversationClick(conv)} className="p-2 rounded-lg hover:bg-pink-100 text-pink-500 transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteConversation(conv.id)} disabled={deletingConversationId === conv.id} className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50">
                                  {deletingConversationId === conv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-pink-100">
                    <p className="text-sm text-gray-500">
                      Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, conversations.length)} dari {conversations.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg hover:bg-pink-100 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                        <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm ${currentPage === page ? 'bg-pink-500 text-white' : 'hover:bg-pink-100 text-gray-700'}`}>
                          {page}
                        </button>
                      ))}
                      <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg hover:bg-pink-100 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProductForm({ name: '', category: '', skin_type: '', description: '', price: '', ingredients: '' });
                    setShowProductModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium shadow-md hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Produk
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-pink-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nama</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Kategori</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Jenis Kulit</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Harga</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsLoading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center">
                            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : products.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            Belum ada produk
                          </td>
                        </tr>
                      ) : (
                        products.map((product) => (
                          <tr key={product.id} className="border-t border-pink-50 hover:bg-pink-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-800">{product.name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{product.category}</td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 rounded-full text-xs bg-pink-100 text-pink-600">
                                {skinTypeLabels[product.skin_type] || product.skin_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-pink-500">
                              Rp{product.price.toLocaleString('id-ID')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleEditProduct(product)} className="p-2 rounded-lg hover:bg-pink-100 text-pink-500 transition-colors">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteProduct(product.id)} disabled={deletingProductId === product.id} className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50">
                                  {deletingProductId === product.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Cari nama atau no order..."
                      className="pl-9 pr-4 py-2 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400 text-sm"
                    />
                  </div>
                  <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="px-4 py-2 rounded-xl border border-pink-200 focus:outline-none focus:border-pink-400 text-sm">
                    <option value="all">Semua Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="selesai">Selesai</option>
                    <option value="batal">Batal</option>
                  </select>
                </div>
                <button onClick={exportOrdersToCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-100 text-pink-600 hover:bg-pink-200 text-sm font-medium">
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-pink-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-pink-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">No Order</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nama</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">HP</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tanggal</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersLoading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center">
                            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            Tidak ada pesanan
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((order) => (
                          <tr key={order.id} className="border-t border-pink-50 hover:bg-pink-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-800">{order.order_number}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{order.customer_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{order.phone}</td>
                            <td className="px-6 py-4 text-sm font-semibold text-pink-500">Rp{order.total.toLocaleString('id-ID')}</td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                                {statusLabels[order.status]}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(order.created_at).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={order.status}
                                onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                disabled={updatingOrderId === order.id}
                                className="px-2 py-1 rounded-lg border border-pink-200 text-xs focus:outline-none focus:border-pink-400 disabled:opacity-50"
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="selesai">Selesai</option>
                                <option value="batal">Batal</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">AI Insight Lengkap</h2>
                  {lastInsightTime && <p className="text-sm text-gray-500">Terakhir diperbarui: {lastInsightTime}</p>}
                </div>
                <div className="flex gap-2">
                  {insight && (
                    <button onClick={copyInsight} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-medium">
                      {insightCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {insightCopied ? 'Tersalin!' : 'Export Insight'}
                    </button>
                  )}
                  <button onClick={generateInsight} disabled={insightLoading} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50">
                    {insightLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Menganalisis...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Insight Lengkap
                      </>
                    )}
                  </button>
                </div>
              </div>

              {insight ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{insight}</div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-pink-100 text-center">
                  <Sparkles className="w-16 h-16 text-pink-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Belum Ada Insight</h3>
                  <p className="text-gray-500 mb-6">Klik tombol di atas untuk menganalisis data bisnis GlowBot</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Chat History Modal */}
      {showChatModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-pink-100">
              <div>
                <h3 className="font-semibold text-gray-800">Chat dengan {selectedConversation.user_name}</h3>
                <p className="text-sm text-gray-500">{skinTypeLabels[selectedConversation.skin_type] || selectedConversation.skin_type}</p>
              </div>
              <button onClick={() => setShowChatModal(false)} className="p-2 rounded-lg hover:bg-pink-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistoryLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                </div>
              ) : chatHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-12">Tidak ada pesan</p>
              ) : (
                chatHistory.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        msg.role === 'user' ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-pink-100">
              <h3 className="font-semibold text-gray-800">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 rounded-lg hover:bg-pink-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                <input type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <input type="text" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400" placeholder="e.g., Cleanser, Moisturizer" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kulit</label>
                <select value={productForm.skin_type} onChange={(e) => setProductForm({ ...productForm, skin_type: e.target.value })} className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400" required>
                  <option value="">Pilih jenis kulit</option>
                  <option value="berminyak">Berminyak</option>
                  <option value="kering">Kering</option>
                  <option value="kombinasi">Kombinasi</option>
                  <option value="sensitif">Sensitif</option>
                  <option value="semua">Semua Jenis Kulit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi / Manfaat</label>
                <textarea value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 resize-none" rows={3} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp)</label>
                <input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bahan Utama</label>
                <textarea value={productForm.ingredients} onChange={(e) => setProductForm({ ...productForm, ingredients: e.target.value })} className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 resize-none" rows={2} placeholder="e.g., Niacinamide, Hyaluronic Acid" required />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowProductModal(false)} className="flex-1 px-4 py-2 rounded-xl border-2 border-pink-200 text-gray-700 hover:bg-pink-50 transition-colors">
                  Batal
                </button>
                <button type="submit" disabled={productSaving} className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium disabled:opacity-50">
                  {productSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </span>
                  ) : editingProduct ? (
                    'Simpan Perubahan'
                  ) : (
                    'Tambah Produk'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
