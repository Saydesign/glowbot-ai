import { Sparkles, User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  image?: string | null;
}

export function ChatMessage({ role, content, image }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${isUser ? 'bg-gradient-to-br from-pink-400 to-pink-500' : 'bg-gradient-to-br from-rose-300 to-pink-400'}`}>
        {isUser ? <User className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
      </div>
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${isUser ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-pink-100'}`}>
        {image && (
          <div className="mb-2">
            <img src={`data:image/jpeg;base64,${image}`} alt="Uploaded" className="max-w-[200px] max-h-[200px] object-cover rounded-xl" />
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
}
