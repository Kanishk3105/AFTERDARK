import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app.store';
import { useGameStore } from '@/stores/game.store';
import { useChatStore } from '@/stores/chat.store';
import { useTrophyStore } from '@/stores/trophy.store';
import { APP_CONFIG } from '@/config/app.config';
import { deleteRemoteRoom, getSyncStatus, revokeRemotePushToken } from '@/services/sync';
import { totalCatalogueSize } from '@/content/engine';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { IntensityLevel, MoodId } from '@/types';
import { clearRoomKey } from '@/security/crypto';
import { saveRemoteNotificationPreferences } from '@/services/sync';
import { hasEnabledRemoteNotifications, registerStoredPushToken } from '@/services/notifications';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const playerName = useAppStore((s) => s.playerName);
  const partnerName = useAppStore((s) => s.partnerName);
  const roomCode = useAppStore((s) => s.roomCode);
  const roomId = useAppStore((s) => s.roomId);
  const deviceId = useAppStore((s) => s.deviceId);
  const preferences = useAppStore((s) => s.preferences);

  const setPlayerName = useAppStore((s) => s.setPlayerName);
  const setPartnerName = useAppStore((s) => s.setPartnerName);
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const resetAll = useAppStore((s) => s.resetAll);

  const clearHistory = useGameStore((s) => s.clearHistory);
  const clearAllMessages = useChatStore((s) => s.clearAllMessages);
  const resetTrophies = useTrophyStore((s) => s.resetTrophies);

  // Editable local inputs
  const [myNick, setMyNick] = useState(playerName);
  const [theirNick, setTheirNick] = useState(partnerName);
  const [excludedTagInput, setExcludedTagInput] = useState('');

  // Confirmation Modals
  const [showUnpairModal, setShowUnpairModal] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);

  const syncStatus = getSyncStatus();
  const catalogueSize = totalCatalogueSize();

  const handleSaveNames = () => {
    if (myNick.trim()) setPlayerName(myNick.trim());
    if (theirNick.trim()) setPartnerName(theirNick.trim());
    showToast('Nicknames updated', 'success');
  };

  const handleAddExcludedTopic = () => {
    if (!excludedTagInput.trim()) return;
    const current = preferences.excludedTopics || [];
    if (!current.includes(excludedTagInput.trim())) {
      updatePreferences({ excludedTopics: [...current, excludedTagInput.trim()] });
      showToast(`Added "${excludedTagInput.trim()}" to excluded filter`, 'info');
    }
    setExcludedTagInput('');
  };

  const handleRemoveExcludedTopic = (topic: string) => {
    const current = preferences.excludedTopics || [];
    updatePreferences({ excludedTopics: current.filter((t) => t !== topic) });
  };

  const saveNotifications = (next: typeof preferences.notifications) => {
    updatePreferences({ notifications: next });
    const updateRemote = async () => {
      if (hasEnabledRemoteNotifications(next)) {
        await saveRemoteNotificationPreferences(roomId, {
          ...next,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
        await registerStoredPushToken();
      } else {
        await revokeRemotePushToken(roomId);
        await saveRemoteNotificationPreferences(roomId, {
          ...next,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        });
      }
    };
    void updateRemote().catch((error: unknown) => {
      console.error('Saving remote notification preferences failed', error);
      showToast('Notification preferences were saved locally but not synced.', 'warning');
    });
  };

  const handleConfirmClearData = async () => {
    try {
      await clearAllMessages();
      await clearHistory();
      resetTrophies();
      setShowClearDataModal(false);
      showToast('Local messages and history cleared', 'success');
    } catch (error) {
      console.error('Clearing local data failed', error);
      showToast('Could not clear all local data', 'error');
    }
  };

  const handleConfirmUnpair = async () => {
    try {
      const remoteDeletion = await deleteRemoteRoom(roomId);
      await clearAllMessages();
      await clearHistory();
      resetTrophies();
      await clearRoomKey();
      resetAll();
      setShowUnpairModal(false);
      showToast(
        remoteDeletion === 'deleted'
          ? 'Room data permanently deleted and local pairing reset'
          : remoteDeletion === 'queued'
            ? 'Room access revoked; permanent deletion is queued for cleanup'
            : 'Local pairing reset',
        'info',
      );
      navigate('/');
    } catch (error) {
      console.error('Room revocation failed', error);
      showToast('Could not revoke the remote room. Local pairing was kept.', 'error');
    }
  };

  return (
    <div className="space-y-6 px-4 pt-6 pb-12 max-w-md mx-auto">
      {/* Title */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wider text-ad-text uppercase">
          SETTINGS & PRIVACY
        </h1>
        <p className="text-xs text-ad-text-secondary">
          Configure pairing, intimacy preferences, and encryption.
        </p>
      </div>

      {/* 1. Account & Pairing */}
      <Card variant="solid" className="p-4 space-y-4 border-ad-burgundy/40">
        <h2 className="font-display text-sm font-bold text-ad-gold uppercase tracking-wider flex items-center gap-1.5">
          <span>🗝️</span> <span>Room & Identity</span>
        </h2>

        <div className="space-y-3">
          <Input
            label="My Nickname"
            value={myNick}
            onChange={(e) => setMyNick(e.target.value)}
          />
          <Input
            label="Partner's Nickname"
            value={theirNick}
            onChange={(e) => setTheirNick(e.target.value)}
          />
          <Button size="sm" variant="secondary" onClick={handleSaveNames}>
            Save Names
          </Button>
        </div>

        <div className="pt-2 border-t border-ad-burgundy/30 text-xs text-ad-text-secondary space-y-1 font-mono">
          <div>Room Code: <span className="text-ad-gold font-bold">{roomCode || 'UNPAIRED'}</span></div>
          <div className="truncate text-[10px] text-ad-text-secondary/60">Device ID: {deviceId}</div>
        </div>

        <div className="pt-1 flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-red-400 border border-red-900/40"
            onClick={() => setShowUnpairModal(true)}
          >
            Unpair & Reset Room
          </Button>
        </div>
      </Card>

      {/* 2. Privacy & Security */}
      <Card variant="solid" className="p-4 space-y-3.5 border-ad-burgundy/40">
        <h2 className="font-display text-sm font-bold text-ad-gold uppercase tracking-wider flex items-center gap-1.5">
          <span>🔒</span> <span>Privacy & Visibility</span>
        </h2>

        <div className="space-y-2.5 text-xs">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-ad-text">Show Online Visibility</span>
            <input
              type="checkbox"
              checked={preferences.showOnlineStatus}
              onChange={(e) => updatePreferences({ showOnlineStatus: e.target.checked })}
              className="rounded border-ad-burgundy/40 text-ad-red focus:ring-ad-red h-4 w-4 bg-ad-bg"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-ad-text">Show Read Receipts (✓✓)</span>
            <input
              type="checkbox"
              checked={preferences.readReceipts}
              onChange={(e) => updatePreferences({ readReceipts: e.target.checked })}
              className="rounded border-ad-burgundy/40 text-ad-red focus:ring-ad-red h-4 w-4 bg-ad-bg"
            />
          </label>

          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-ad-text">Share Game Activity</span>
            <input
              type="checkbox"
              checked={preferences.showGameActivity}
              onChange={(e) => updatePreferences({ showGameActivity: e.target.checked })}
              className="rounded border-ad-burgundy/40 text-ad-red focus:ring-ad-red h-4 w-4 bg-ad-bg"
            />
          </label>
        </div>
      </Card>

      {/* Notifications */}
      <Card variant="solid" className="p-4 space-y-3.5 border-ad-burgundy/40">
        <h2 className="font-display text-sm font-bold text-ad-gold uppercase tracking-wider flex items-center gap-1.5">
          <span>🔔</span> <span>Notifications</span>
        </h2>
        <div className="space-y-2.5 text-xs">
          {([
            ['messages', 'Chat messages'],
            ['gameInvites', 'Game invitations and turns'],
            ['partnerActivity', 'Partner activity'],
            ['trophies', 'Trophy unlocks'],
            ['sound', 'Notification sound'],
            ['vibration', 'Vibration'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-ad-text">{label}</span>
              <input
                type="checkbox"
                checked={preferences.notifications[key]}
                onChange={(e) =>
                  saveNotifications({
                    ...preferences.notifications,
                    [key]: e.target.checked,
                  })
                }
                className="rounded border-ad-burgundy/40 text-ad-red h-4 w-4 bg-ad-bg"
              />
            </label>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <label className="space-y-1">
              <span className="text-[10px] text-ad-text-secondary">Quiet hours start</span>
              <input
                type="time"
                value={preferences.notifications.quietHoursStart || ''}
                onChange={(e) =>
                  saveNotifications({
                    ...preferences.notifications,
                    quietHoursStart: e.target.value || undefined,
                  })
                }
                className="w-full bg-ad-bg border border-ad-burgundy/40 rounded-xl px-2 py-1.5 text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-ad-text-secondary">Quiet hours end</span>
              <input
                type="time"
                value={preferences.notifications.quietHoursEnd || ''}
                onChange={(e) =>
                  saveNotifications({
                    ...preferences.notifications,
                    quietHoursEnd: e.target.value || undefined,
                  })
                }
                className="w-full bg-ad-bg border border-ad-burgundy/40 rounded-xl px-2 py-1.5 text-xs"
              />
            </label>
          </div>
        </div>
      </Card>

      {/* 3. Gameplay Preferences & Excluded Topics */}
      <Card variant="solid" className="p-4 space-y-3.5 border-ad-burgundy/40">
        <h2 className="font-display text-sm font-bold text-ad-gold uppercase tracking-wider flex items-center gap-1.5">
          <span>🎮</span> <span>Gameplay Defaults</span>
        </h2>

        {/* Default Intensity */}
        <div className="space-y-1.5 text-xs">
          <span className="text-ad-text-secondary uppercase font-mono text-[10px]">
            Default Intensity
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {(['mild', 'moderate', 'spicy', 'extreme'] as IntensityLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => updatePreferences({ intensity: lvl })}
                className={`py-1.5 text-xs rounded-lg border capitalize transition-all ${
                  preferences.intensity === lvl
                    ? 'border-ad-gold bg-ad-red/25 text-ad-gold font-bold'
                    : 'border-ad-burgundy/30 bg-ad-bg-secondary text-ad-text-secondary'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Excluded topics */}
        <div className="space-y-1.5 text-xs pt-1">
          <span className="text-ad-text-secondary uppercase font-mono text-[10px]">
            Excluded Topics / Boundaries
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. exes, work, spiders..."
              value={excludedTagInput}
              onChange={(e) => setExcludedTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddExcludedTopic()}
              className="flex-1 bg-ad-bg/80 border border-ad-burgundy/40 rounded-xl px-3 py-1.5 text-xs text-ad-text"
            />
            <Button size="sm" variant="secondary" onClick={handleAddExcludedTopic}>
              Add
            </Button>
          </div>

          {/* Excluded topic tags */}
          <div className="flex flex-wrap gap-1 pt-1">
            {(preferences.excludedTopics || []).map((topic) => (
              <span
                key={topic}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/60 border border-red-800/40 text-[10px] text-red-200"
              >
                <span>{topic}</span>
                <button
                  onClick={() => handleRemoveExcludedTopic(topic)}
                  className="hover:text-white ml-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
            {(preferences.excludedTopics || []).length === 0 && (
              <span className="text-[10px] text-ad-text-secondary/60 italic">
                No excluded topics. Prompts will cover all themes.
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 4. Storage & History */}
      <Card variant="solid" className="p-4 space-y-3 border-ad-burgundy/40">
        <h2 className="font-display text-sm font-bold text-ad-gold uppercase tracking-wider flex items-center gap-1.5">
          <span>💾</span> <span>Storage & Local Vault</span>
        </h2>

        <p className="text-xs text-ad-text-secondary leading-relaxed">
          IndexedDB stores sealed messages, captured media, and prompt history locally on your device.
        </p>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-red-300 border border-ad-burgundy/40"
            onClick={() => setShowClearDataModal(true)}
          >
            Clear Local Cache & Messages
          </Button>
        </div>
      </Card>

      {/* 5. About & Engine Specs */}
      <Card variant="solid" className="p-4 space-y-2 text-xs text-ad-text-secondary border-ad-burgundy/40 font-mono">
        <div className="flex justify-between">
          <span>Product:</span>
          <span className="text-white font-bold">{APP_CONFIG.name}</span>
        </div>
        <div className="flex justify-between">
          <span>Version:</span>
          <span>v{APP_CONFIG.version}</span>
        </div>
        <div className="flex justify-between">
          <span>Content Catalogue:</span>
          <span className="text-ad-gold font-bold">{catalogueSize.toLocaleString()} Generated</span>
        </div>
        <div className="flex justify-between">
          <span>Distribution Mode:</span>
          <span className="capitalize">{APP_CONFIG.distribution} Build</span>
        </div>
        <div className="flex justify-between">
          <span>Realtime Sync:</span>
          <span className="capitalize text-ad-text">{syncStatus.state}</span>
        </div>
        <div className="pt-2 text-[10px] text-ad-text-secondary/70 leading-relaxed font-sans">
          Built exclusively for adults 18+. Text is sealed locally; complete end-to-end key protection is not yet available. Screenshots cannot be prevented.
        </div>
      </Card>

      {/* Confirmation Modals */}
      <Modal
        isOpen={showUnpairModal}
        onClose={() => setShowUnpairModal(false)}
        title="Unpair & Delete Room?"
      >
        <div className="space-y-4 text-xs text-left">
          <p className="text-ad-text-secondary leading-relaxed">
            This immediately revokes both devices and queues permanent deletion of room data and uploaded media. The cleanup job retries storage failures; local credentials are also reset.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setShowUnpairModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={handleConfirmUnpair}
            >
              Unpair Room
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showClearDataModal}
        onClose={() => setShowClearDataModal(false)}
        title="Clear Local Vault Data?"
      >
        <div className="space-y-4 text-xs text-left">
          <p className="text-ad-text-secondary leading-relaxed">
            This will permanently remove all cached chat messages, recorded media, and game history on this phone.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => setShowClearDataModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              className="flex-1"
              onClick={handleConfirmClearData}
            >
              Clear Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
