import { useState, FormEvent, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Camera, Image as ImageIcon } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, imageBase64?: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.lang = 'id-ID';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? prev + ' ' + transcript : transcript);
        setIsListening(false);
      };
      recognition.onerror = () => { setIsListening(false); };
      recognition.onend = () => { setIsListening(false); };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) { alert('Ukuran gambar maksimal 5MB'); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(',')[1]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const msg = input.trim();
    if (!msg && !imageBase64) return;
    onSend(msg || 'Analisis foto kulit saya', imageBase64 || undefined);
    setInput('');
    setImagePreview(null);
    setImageBase64(null);
  };

  const clearImage = () => { setImagePreview(null); setImageBase64(null); };

  return (
    <form onSubmit={handleSubmit} className="p-3 lg:p-4 bg-white border-t border-pink-100">
      <div className="max-w-3xl mx-auto">
        {/* Image preview */}
        {imagePreview && (
          <div className="mb-2 flex items-center gap-2">
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-xl border-2 border-pink-200" />
              <button type="button" onClick={clearImage} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">x</button>
            </div>
            <span className="text-xs text-gray-500">Gambar siap dikirim</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* Camera button */}
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors flex-shrink-0" title="Upload foto">
            <Camera className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

          <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ketik pesan kamu..." disabled={disabled}
            className="flex-1 px-4 py-3 rounded-full border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition-all text-sm disabled:opacity-50" />

          {/* Mic button */}
          {speechSupported && (
            <button type="button" onClick={toggleListening} disabled={disabled}
              className={`p-2.5 rounded-full transition-all flex-shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-pink-50 text-pink-500 hover:bg-pink-100'}`} title={isListening ? 'Berhenti merekam' : 'Voice input'}>
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Send button */}
          <button type="submit" disabled={disabled || (!input.trim() && !imageBase64)}
            className="px-5 py-3 rounded-full bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
        {isListening && <p className="text-xs text-red-500 mt-1 text-center animate-pulse">Mendengarkan... bicara sekarang</p>}
      </div>
    </form>
  );
}
