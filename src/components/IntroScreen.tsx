import { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface IntroScreenProps {
  onComplete: (name: string, skinType: string) => void;
}

const skinTypes = [
  { id: 'berminyak', label: 'Berminyak', description: 'Kulit cenderung berminyak dan berkilau' },
  { id: 'kering', label: 'Kering', description: 'Kulit cenderung kering dan kaku' },
  { id: 'kombinasi', label: 'Kombinasi', description: 'Area T berminyak, pipi kering' },
  { id: 'sensitif', label: 'Sensitif', description: 'Mudah iritasi dan kemerahan' },
];

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [step, setStep] = useState<'name' | 'skin'>('name');
  const [name, setName] = useState('');

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setStep('skin');
    }
  };

  if (step === 'name') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg animate-pulse">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
              GlowBot
            </h1>
            <p className="text-gray-600 text-sm">Asisten Skincare AI untuk UMKM Indonesia</p>
          </div>

          <form onSubmit={handleNameSubmit} className="bg-white rounded-3xl shadow-xl p-6 border border-pink-100">
            <div className="text-center mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Hai! Aku GlowBot</h2>
              <p className="text-sm text-gray-600">
                Siapa nama kamu? Aku ingin kenal kamu lebih baik!
              </p>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama kamu..."
                className="w-full px-4 py-3 rounded-xl border-2 border-pink-200 focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 transition-all text-center"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lanjutkan
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2">
            GlowBot
          </h1>
          <p className="text-gray-600 text-sm">Asisten Skincare AI untuk UMKM Indonesia</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 border border-pink-100">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Halo, {name}!</h2>
            <p className="text-sm text-gray-600">
              Jenis kulitmu apa? Ini membantuku memberikan rekomendasi yang tepat untukmu.
            </p>
          </div>

          <div className="space-y-3">
            {skinTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => onComplete(name, type.id)}
                className="w-full p-4 rounded-xl border-2 border-pink-100 hover:border-pink-400 hover:bg-pink-50 transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 group-hover:text-pink-600 transition-colors">
                      {type.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-pink-100 group-hover:bg-pink-400 flex items-center justify-center transition-colors">
                    <svg
                      className="w-4 h-4 text-pink-400 group-hover:text-white transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Gemini AI
        </p>
      </div>
    </div>
  );
}
