import { useState, useRef, useEffect } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { useGemini } from '../hooks/useGemini';

interface ChatWindowProps {
  userName: string;
  skinType: string;
  onReset: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { generateResponse, isLoading } = useGemini();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `Hai ${userName}! Senang bertemu denganmu! \n\nAku GlowBot, asisten skincare kamu. Aku lihat kamu punya kulit ${skinTypeLabels[skinType].toLowerCase()}. Aku siap membantu kamu dengan rekomendasi produk dan tips perawatan yang sesuai untuk jenis kulitmu. \n\nMau tanya apa hari ini? \n\nBeberapa topik yang bisa kita bahas:\n- Rutinitas skincare pagi & malam\n- Rekomendasi produk untuk kulit ${skinTypeLabels[skinType].toLowerCase()}\n- Tips mengatasi masalah kulit\n- Bahan-bahan yang cocok untukmu`,
    };
    setMessages([welcomeMessage]);
  }, [userName, skinType]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setConversationHistory((prev) => [...prev, { role: 'user', content }]);

    const response = await generateResponse(content, skinType, conversationHistory);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setConversationHistory((prev) => [...prev, { role: 'model', content: response }]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-pink-100 px-4 py-3 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">GlowBot</h1>
              <p className="text-xs text-gray-500">
                {userName} - {skinTypeLabels[skinType]}
              </p>
            </div>
          </div>
          <button
            onClick={onReset}
            className="p-2 rounded-full hover:bg-pink-100 transition-colors group"
            title="Mulai ulang"
          >
            <RotateCcw className="w-5 h-5 text-pink-400 group-hover:text-pink-600" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.map((message) => (
            <ChatMessage key={message.id} role={message.role} content={message.content} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
