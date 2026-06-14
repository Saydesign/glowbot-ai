import { Sparkles, User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
          isUser
            ? 'bg-gradient-to-br from-pink-400 to-pink-500'
            : 'bg-gradient-to-br from-rose-300 to-pink-400'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-white" />
        ) : (
          <Sparkles className="w-5 h-5 text-white" />
        )}
      </div>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white rounded-tr-none'
            : 'bg-white text-gray-800 rounded-tl-none border border-pink-100'
        }`}
      >
        {/* PERBAIKAN: Menggunakan dangerouslySetInnerHTML agar tag <b> dari Gemini otomatis jadi teks tebal */}
        <p 
          className="text-sm leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
}