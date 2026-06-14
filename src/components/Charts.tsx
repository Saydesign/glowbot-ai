// Simple chart components without external dependencies

interface BarChartProps {
  data: { label: string; value: number }[];
  title: string;
  color?: string;
  loading?: boolean;
}

export function BarChart({ data, title, color = 'from-pink-400 to-rose-500', loading }: BarChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
        <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="h-40 flex items-end justify-center gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="w-10 bg-pink-100 rounded-t animate-pulse" style={{ height: `${Math.random() * 80 + 20}%` }} />
          ))}
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      {data.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Tidak ada data</p>
      ) : (
        <div className="h-40 flex items-end justify-center gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <div className="relative group">
                <div
                  className={`w-10 rounded-t bg-gradient-to-t ${color} transition-all cursor-pointer hover:opacity-80`}
                  style={{ height: `${Math.max((item.value / maxValue) * 100, 8)}%` }}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {item.value}
                </div>
              </div>
              <span className="text-xs text-gray-500 truncate w-12 text-center">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface PieChartProps {
  data: { label: string; value: number; color?: string }[];
  title: string;
  loading?: boolean;
}

export function PieChart({ data, title, loading }: PieChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
        <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-pink-100 animate-pulse" />
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
        <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">Tidak ada data</p>
      </div>
    );
  }

  const colors = ['bg-pink-400', 'bg-rose-400', 'bg-amber-400', 'bg-emerald-400', 'bg-blue-400'];

  let cumulativePercent = 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-pink-100">
      <h3 className="font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="flex items-center justify-center gap-4">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
            {data.map((item, index) => {
              const percent = (item.value / total) * 100;
              const strokeDasharray = `${percent} ${100 - percent}`;
              const strokeDashoffset = -cumulativePercent;
              cumulativePercent += percent;
              return (
                <circle
                  key={index}
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke={item.color || ['#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6'][index % 5]}
                  strokeWidth="8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all hover:opacity-80 cursor-pointer"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-800">{total}</span>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${item.color || colors[index]}`} />
              <span className="text-sm text-gray-600">{item.label}</span>
              <span className="text-sm font-medium text-gray-800 ml-2">
                {((item.value / total) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
