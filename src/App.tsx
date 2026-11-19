import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/app.store';
import { ToastProvider } from '@/components/ui/Toast';
import { hydrate } from '@/data/hydrate';

// Pages
import { SplashPage } from '@/pages/SplashPage';
import { OnboardingFlow } from '@/pages/onboarding/OnboardingFlow';
import { MainLayout } from '@/components/layout/MainLayout';
import { HomePage } from '@/pages/home/HomePage';
import { GamesPage } from '@/pages/games/GamesPage';
import { MoodGamesPage } from '@/pages/games/MoodGamesPage';
import { GameDetailPage } from '@/pages/games/GameDetailPage';
import { GamePlayPage } from '@/pages/games/GamePlayPage';
import { ChatPage } from '@/pages/chat/ChatPage';
import { TrophiesPage } from '@/pages/trophies/TrophiesPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { JoinRoomPage } from '@/pages/onboarding/JoinRoomPage';
import { subscribe } from '@/services/channel';
import { useChatStore } from '@/stores/chat.store';

function App() {
  const location = useLocation();
  const hasCompletedOnboarding = useAppStore((s) => s.hasCompletedOnboarding);

  useEffect(() => {
    hydrate();
    const unsubscribe = subscribe((envelope) => {
      if (envelope.type !== 'chat') return;
      const roomCode = useAppStore.getState().roomCode;
      if (!roomCode || envelope.roomCode !== roomCode) return;
      const deviceId = useAppStore.getState().deviceId;
      if (envelope.senderId === deviceId) return;
      void useChatStore.getState().receiveMessage(envelope.payload as never);
    });
    return unsubscribe;
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-ad-bg text-ad-text font-body">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Splash / Entry */}
            <Route path="/" element={<SplashPage />} />
            
            {/* Onboarding */}
            <Route path="/onboarding/*" element={<OnboardingFlow />} />
            <Route path="/join" element={<JoinRoomPage />} />
            
            {/* Main App — Protected by onboarding */}
            <Route element={<MainLayout />}>
              <Route path="/home" element={
                hasCompletedOnboarding ? <HomePage /> : <Navigate to="/" replace />
              } />
              <Route path="/games" element={
                hasCompletedOnboarding ? <GamesPage /> : <Navigate to="/" replace />
              } />
              <Route path="/games/:moodId" element={
                hasCompletedOnboarding ? <MoodGamesPage /> : <Navigate to="/" replace />
              } />
              <Route path="/games/:moodId/:gameId" element={
                hasCompletedOnboarding ? <GameDetailPage /> : <Navigate to="/" replace />
              } />
              <Route path="/games/:moodId/:gameId/play" element={
                hasCompletedOnboarding ? <GamePlayPage /> : <Navigate to="/" replace />
              } />
              <Route path="/chat" element={
                hasCompletedOnboarding ? <ChatPage /> : <Navigate to="/" replace />
              } />
              <Route path="/trophies" element={
                hasCompletedOnboarding ? <TrophiesPage /> : <Navigate to="/" replace />
              } />
              <Route path="/settings" element={
                hasCompletedOnboarding ? <SettingsPage /> : <Navigate to="/" replace />
              } />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    </ToastProvider>
  );
}

export default App;
