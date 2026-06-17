import { useState, useRef, useEffect } from 'react';
import { Sparkles, RotateCcw, ShoppingBag } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { useGemini } from '../hooks/useGemini';
import { useCart } from '../context/CartContext';
import { CartDrawer } from './CartDrawer';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface ChatWindowProps {
  userName: string;
  skinType: string;
  onReset: () => void;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  image?: string | null;
}

const skinTypeLabels: Record<string, string> = {
  berminyak: 'Berminyak',
  kering: 'Kering',
  kombinasi: 'Kombinasi',
  sensitif: 'Sensitif',
};

export function ChatWindow({ userName, skinType, onReset }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'model'; content: string }>>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { generateResponse, isLoading } = useGemini();
  const { totalItems, addItem } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try { const { data } = await supabase.from('products').select('id, name, category, price'); if (data) setAllProducts(data); } catch (err) { console.error(err); }
    };
    fetchProducts();
  }, []);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    setMessages([{
      id: Date.now().toString(), role: 'assistant',
      content: `Hai ${userName}! Senang bertemu denganmu!\n\nAku GlowBot, asisten skincare kamu. Aku lihat kamu punya kulit ${skinTypeLabels[skinType].toLowerCase()}. Aku siap membantu kamu dengan rekomendasi produk dan tips perawatan.\n\nMau tanya apa hari ini?\n\nBeberapa topik yang bisa kita bahas:\n- Rutinitas skincare pagi & malam\n- Rekomendasi produk untuk kulit ${skinTypeLabels[skinType].toLowerCase()}\n- Tips mengatasi masalah kulit\n- Bahan-bahan yang cocok untukmu\n\nKamu juga bisa kirim foto kulitmu untuk dianalisis!`,
    }]);
  }, [userName, skinType]);

  const findMentionedProducts = (content: string): Product[] => {
    const mentioned: Product[] = [];
    allProducts.forEach(product => {
      if (content.toLowerCase().includes(product.name.toLowerCase())) {
        if (!mentioned.find(p => p.id === product.id)) mentioned.push(product);
      }
    });
    return mentioned;
  };

  const handleSendMessage = async (content: string, imageBase64?: string) => {
    const userMessage: Message = {
      id: Date.now().toString(), role: 'user', content, image: imageBase64 || null,
    };
    setMessages(prev => [...prev, userMessage]);
    setConversationHistory(prev => [...prev, { role: 'user', content }]);

    const response = await generateResponse(content, skinType, conversationHistory, imageBase64);
    const mentionedProducts = findMentionedProducts(response);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(), role: 'assistant', content: response,
      products: mentionedProducts.length > 0 ? mentionedProducts : undefined,
    };
    setMessages(prev => [...prev, assistantMessage]);
    setConversationHistory(prev => [...prev, { role: 'model', content: response }]);

    try {
      let convId = conversationId;
      if (!convId) {
        const { data: conv } = await supabase.from('conversations').insert({ user_name: userName, skin_type: skinType }).select().single();
        convId = conv?.id; setConversationId(convId);
      }
      await supabase.from('messages').insert([
        { conversation_id: convId, role: 'user', content },
        { conversation_id: convId, role: 'assistant', content: response },
      ]);
    } catch (err) { console.error('Gagal simpan:', err); }
  };

  const handleOrderComplete = (message: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: message }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex flex-col relative">
      <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-md"><Sparkles className="w-5 h-5 text-white" /></div>
            <div><h1 className="font-bold text-gray-800">GlowBot</h1><p className="text-xs text-gray-500">{userName} - {skinTypeLabels[skinType]}</p></div>
          </div>
          <button onClick={onReset} className="p-2 rounded-full hover:bg-pink-100 transition-colors group" title="Mulai ulang"><RotateCcw className="w-5 h-5 text-pink-400 group-hover:text-pink-600" /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-24">
        <div className="max-w-3xl mx-auto">
          {messages.map(message => (
            <div key={message.id}>
              <ChatMessage role={message.role} content={message.content} image={message.image} />
              {message.products && message.products.length > 0 && (
                <div className="mb-4 ml-4 md:ml-8">
                  <p className="text-xs text-gray-500 mb-2">Produk yang direkomendasikan:</p>
                  <div className="flex flex-wrap gap-2">
                    {message.products.map(product => (
                      <div key={product.id} className="bg-white rounded-xl p-3 border border-pink-100 shadow-sm flex items-center gap-3">
                        <div><p className="font-medium text-gray-800 text-sm">{product.name}</p><p className="text-xs text-gray-500">{product.category}</p><p className="text-sm font-semibold text-pink-500">Rp{product.price.toLocaleString('id-ID')}</p></div>
                        <button onClick={() => addItem({ id: product.id, name: product.name, category: product.category, price: product.price })} className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-rose-400 text-white text-xs font-medium hover:shadow-md transition-all whitespace-nowrap">+ Keranjang</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {totalItems > 0 && (
        <button onClick={() => setCartOpen(true)} className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-lg flex items-center justify-center hover:shadow-xl transition-all z-40">
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-pink-500 text-xs font-bold flex items-center justify-center">{totalItems}</span>
        </button>
      )}

      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} customerName={userName} onOrderComplete={handleOrderComplete} />
    </div>
  );
}
