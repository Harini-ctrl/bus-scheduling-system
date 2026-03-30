import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'amber' | 'purple';
  loading?: boolean;
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700'   },
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  badge: 'bg-green-100 text-green-700'  },
  amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700'  },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
};

export default function StatCard({ title, value, subtitle, icon: Icon, color, loading = false }: Props) {
  const c = colorMap[color];

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="h-3 bg-gray-200 rounded w-24" />
          <div className="w-9 h-9 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200">
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </p>
        <div className={`${c.bg} p-2 rounded-lg`}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
        {subtitle}
      </span>
    </div>
  );
}