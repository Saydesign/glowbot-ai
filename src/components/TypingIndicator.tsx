import { Sparkles } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md bg-gradient-to-br from-rose-300 to-pink-400">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <div className="bg-white text-gray-800 rounded-2xl rounded-tl-none border border-pink-100 px-4 py-3 shadow-sm">
        <div className="flex gap-1.5 items-center h-6">
          <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
