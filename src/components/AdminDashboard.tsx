import { useState, useEffect } from 'react';
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
} from 'lucide-react';

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

interface AdminDashboardProps {
  onBackToChat: () => void;
}

const skinTypeLabels: Record<string, string> = {
  berminyak: 'Berminyak',
  kering: 'Kering',
  kombinasi: 'Kombinasi',
  sensitif: 'Sensitif',
};

export function AdminDashboard({ onBackToChat }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'conversations' | 'products' | 'insights'>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalMessages: 0,
    mostCommonSkinType: '-',
    totalProducts: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
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

  // Insights
  const [insight, setInsight] = useState<string>('');
  const [insightLoading, setInsightLoading] = useState(false);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const [convRes, msgRes, prodRes] = await Promise.all([
          supabase.from('conversations').select('skin_type'),
          supabase.from('messages').select('id', { count: 'exact' }),
          supabase.from('products').select('id', { count: 'exact' }),
        ]);

        const skinTypes = convRes.data?.map((c: Conversation) => c.skin_type) || [];
        const skinTypeCounts: Record<string, number> = {};
        skinTypes.forEach((st: string) => {
          skinTypeCounts[st] = (skinTypeCounts[st] || 0) + 1;
        });
        const mostCommon = Object.entries(skinTypeCounts).sort((a, b) => b[1] - a[1])[0];

        setStats({
          totalConversations: convRes.data?.length || 0,
          totalMessages: msgRes.count || 0,
          mostCommonSkinType: mostCommon ? skinTypeLabels[mostCommon[0]] || mostCommon[0] : '-',
          totalProducts: prodRes.count || 0,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
      setStatsLoading(false);
    };

    fetchStats();
  }, []);

  // Fetch conversations
  useEffect(() => {
    if (activeTab === 'conversations' || activeTab === 'overview') {
      const fetchConversations = async () => {
        setConversationsLoading(true);
        try {
          const { data } = await supabase
            .from('conversations')
            .select('*')
            .order('created_at', { ascending: false });
          setConversations(data || []);
        } catch (err) {
          console.error('Error fetching conversations:', err);
        }
        setConversationsLoading(false);
      };
      fetchConversations();
    }
  }, [activeTab]);

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
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
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

  // Generate AI Insight
  const generateInsight = async () => {
    setInsightLoading(true);
    setInsight('');
    try {
      const { data: messages } = await supabase
        .from('messages')
        .select('content, role')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!messages || messages.length === 0) {
        setInsight('Belum ada percakapan untuk dianalisis.');
        setInsightLoading(false);
        return;
      }

      const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');

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
              content:
                'Kamu adalah analis data untuk aplikasi skincare GlowBot. Analisis percakapan user dan berikan insight dalam format berikut:\n\n1. **Topik Paling Sering Dibahas** (3-5 topik)\n2. **Masalah Kulit Umum** yang sering dikeluhkan user\n3. **Tren Rekomendasi Produk** (jenis produk apa yang paling sering direkomendasikan)\n4. **Saran untuk Pemilik Toko** (bagaimana meningkatkan penjualan)\n\nTulis dalam Bahasa Indonesia yang ringkas dan jelas.',
            },
            {
              role: 'user',
              content: `Berikut adalah data percakpan:\n\n${conversationText}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      const data = await response.json();
      setInsight(data.choices?.[0]?.message?.content || 'Gagal membuat insight.');
    } catch (err) {
      console.error('Error generating insight:', err);
      setInsight('Terjadi kesalahan saat membuat insight.');
    }
    setInsightLoading(false);
  };

  // Pagination
  const totalPages = Math.ceil(conversations.length / itemsPerPage);
  const paginatedConversations = conversations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const StatCard = ({ icon: Icon, title, value, loading }: { icon: React.ElementType; title: string; value: string | number; loading: boolean }) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-500">{title}</p>
      </div>
      {loading ? (
        <div className="h-8 bg-pink-50 rounded-lg animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-pink-100 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-pink-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
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
            onClick={() => setActiveTab('insights')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'insights' ? 'bg-pink-500 text-white' : 'hover:bg-pink-50 text-gray-700'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            {sidebarOpen && <span>AI Insight</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-pink-100">
          <button
            onClick={onBackToChat}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            {sidebarOpen && <span>Kembali ke Chat</span>}
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
              {activeTab === 'insights' && 'AI Insights'}
            </h1>
            <div className="w-10" />
          </div>
        </header>

        <div className="p-6 overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={MessageSquare} title="Total Percakapan" value={stats.totalConversations} loading={statsLoading} />
                <StatCard icon={Users} title="Total Pesan" value={stats.totalMessages} loading={statsLoading} />
                <StatCard icon={Sparkles} title="Jenis Kulit Terbanyak" value={stats.mostCommonSkinType} loading={statsLoading} />
                <StatCard icon={Package} title="Total Produk" value={stats.totalProducts} loading={statsLoading} />
              </div>

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
                  <h3 className="font-semibold text-gray-800 mb-4">Produk Terbaru</h3>
                  {productsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-pink-50 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : products.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Belum ada produk</p>
                  ) : (
                    <div className="space-y-2">
                      {products.slice(0, 5).map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                          <div>
                            <p className="font-medium text-gray-800">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.category}</p>
                          </div>
                          <span className="text-sm font-semibold text-pink-500">Rp{product.price.toLocaleString('id-ID')}</span>
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
                            {new Date(conv.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleConversationClick(conv)}
                              className="p-2 rounded-lg hover:bg-pink-100 text-pink-500 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
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
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-pink-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm ${
                          currentPage === page ? 'bg-pink-500 text-white' : 'hover:bg-pink-100 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-pink-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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
                                <button
                                  onClick={() => handleEditProduct(product)}
                                  className="p-2 rounded-lg hover:bg-pink-100 text-pink-500 transition-colors"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  disabled={deletingProductId === product.id}
                                  className="p-2 rounded-lg hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                                >
                                  {deletingProductId === product.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
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

          {/* Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={generateInsight}
                  disabled={insightLoading}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {insightLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Menganalisis...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Insight
                    </>
                  )}
                </button>
              </div>

              {insight ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">AI Insight</h3>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{insight}</div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-12 shadow-sm border border-pink-100 text-center">
                  <Sparkles className="w-16 h-16 text-pink-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Belum Ada Insight</h3>
                  <p className="text-gray-500 mb-6">Klik tombol "Generate Insight" untuk menganalisis percakapan user</p>
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
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white rounded-tr-none'
                          : 'bg-gray-100 text-gray-800 rounded-tl-none'
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
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 rounded-lg hover:bg-pink-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleProductSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <input
                  type="text"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400"
                  placeholder="e.g., Cleanser, Moisturizer"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kulit</label>
                <select
                  value={productForm.skin_type}
                  onChange={(e) => setProductForm({ ...productForm, skin_type: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400"
                  required
                >
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
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 resize-none"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga (Rp)</label>
                <input
                  type="number"
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bahan Utama</label>
                <textarea
                  value={productForm.ingredients}
                  onChange={(e) => setProductForm({ ...productForm, ingredients: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 resize-none"
                  rows={2}
                  placeholder="e.g., Niacinamide, Hyaluronic Acid"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl border-2 border-pink-200 text-gray-700 hover:bg-pink-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={productSaving}
                  className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium disabled:opacity-50"
                >
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
