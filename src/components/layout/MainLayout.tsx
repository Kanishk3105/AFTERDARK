import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from '@/config/app.config';
import { useChatStore } from '@/stores/chat.store';
import { useTrophyStore } from '@/stores/trophy.store';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const unreadCount = useChatStore((s) => s.unreadCount);
  const latestUnlocked = useTrophyStore((s) => s.latestUnlocked);

  return (
    <div className="flex flex-col min-h-screen bg-ad-bg text-ad-text">
      {/* Main Content Area */}
      <main className="flex-1 pb-24 max-w-md mx-auto w-full relative">
        <Outlet />
      </main>

      {/* Luxury Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-ad-bg-secondary/95 backdrop-blur-xl border-t border-ad-burgundy/40 shadow-2xl safe-bottom">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const showChatBadge = item.id === 'chat' && unreadCount > 0;
            const showTrophyBadge = item.id === 'trophies' && latestUnlocked !== null;

            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-300 ${
                  isActive ? 'text-ad-gold' : 'text-ad-text-secondary hover:text-ad-text'
                }`}
              >
                {/* Active Indicator Glow */}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-ad-red/15 rounded-xl border border-ad-gold/30 -z-10 shadow-lg shadow-ad-red/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Icon with badges */}
                <div className="relative text-xl mb-0.5 select-none">
                  <span>{item.icon}</span>

                  {showChatBadge && (
                    <span className="absolute -top-1 -right-2 bg-ad-red text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full border border-ad-bg animate-pulse">
                      {unreadCount}
                    </span>
                  )}

                  {showTrophyBadge && (
                    <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-ad-gold rounded-full border border-ad-bg shadow-sm shadow-ad-gold animate-ping" />
                  )}
                </div>

                {/* Label */}
                <span className={`text-[10px] font-medium tracking-wider uppercase ${isActive ? 'font-semibold text-ad-gold' : 'text-ad-text-secondary'}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
