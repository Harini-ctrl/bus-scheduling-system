import { useOutletContext } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

interface OutletContext {
  onMenuClick: () => void;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { onMenuClick } = useOutletContext<OutletContext>();

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date — hidden on very small screens */}
        <span className="hidden sm:block text-xs text-gray-400">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <div className="hidden sm:block w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs px-2.5 sm:px-3 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
          Live
        </div>
      </div>
    </header>
  );
}