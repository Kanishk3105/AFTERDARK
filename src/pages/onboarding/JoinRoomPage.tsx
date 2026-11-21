import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/stores/app.store';
import { decodeInvite, inviteStatus } from '@/services/pairing';
import { joinRemoteRoom } from '@/services/sync';
import { registerStoredPushToken } from '@/services/notifications';

export const JoinRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const setPlayerName = useAppStore((s) => s.setPlayerName);
  const setPartnerName = useAppStore((s) => s.setPartnerName);
  const ensureDeviceId = useAppStore((s) => s.ensureDeviceId);
  const setRoomId = useAppStore((s) => s.setRoomId);
  const setInvite = useAppStore((s) => s.setInvite);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const token = window.location.hash.replace(/^#/, '');
  const payload = useMemo(() => {
    try {
      return token ? decodeInvite(token) : null;
    } catch {
      return null;
    }
  }, [token]);

  const [nickname, setNickname] = useState('');
  const [partnerNickname, setPartnerNickname] = useState('');
  const [joining, setJoining] = useState(false);

  const join = async () => {
    if (!payload) return;
    if (!nickname.trim()) {
      showToast('Enter your nickname', 'warning');
      return;
    }
    if (inviteStatus(payload) === 'expired') {
      showToast('This invitation has expired', 'error');
      return;
    }

    setJoining(true);
    try {
      const remoteRoomId = await joinRemoteRoom(payload.code);
      if (!remoteRoomId) {
        throw new Error('Remote pairing is not configured for this installation.');
      }
      setRoomId(remoteRoomId, payload.roomCode);
      void registerStoredPushToken().catch((error: unknown) => {
        console.error('Push token registration after room join failed', error);
      });
      setInvite(payload.roomCode, new Date(payload.exp).toISOString());
      ensureDeviceId();
      setPlayerName(nickname.trim());
      setPartnerName((partnerNickname.trim() || 'Partner') + ' (Host)');
      completeOnboarding();
      showToast('Private room joined', 'success');
      navigate('/home');
    } catch (error) {
      console.error('Invitation join failed', error);
      showToast(error instanceof Error ? error.message : 'This invitation could not be opened', 'error');
    } finally {
      setJoining(false);
    }
  };

  if (!payload) {
    return (
      <div className="min-h-screen p-6 max-w-md mx-auto flex items-center">
        <Card variant="glass" className="w-full p-6 text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h1 className="font-display text-xl font-bold">Invalid invitation</h1>
          <p className="text-xs text-ad-text-secondary">The pairing link is malformed or was not issued by an AFTERDARK room.</p>
          <Button fullWidth variant="secondary" onClick={() => navigate('/')}>Return</Button>
        </Card>
      </div>
    );
  }

  if (inviteStatus(payload) === 'expired') {
    return (
      <div className="min-h-screen p-6 max-w-md mx-auto flex items-center">
        <Card variant="glass" className="w-full p-6 text-center space-y-4">
          <div className="text-4xl">⌛</div>
          <h1 className="font-display text-xl font-bold">Invitation expired</h1>
          <p className="text-xs text-ad-text-secondary">Ask your partner to create a new room invitation.</p>
          <Button fullWidth variant="secondary" onClick={() => navigate('/')}>Return</Button>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6 max-w-md mx-auto flex flex-col justify-center space-y-5"
    >
      <div className="text-center space-y-2">
        <div className="text-4xl">🌹</div>
        <h1 className="font-display text-2xl font-bold">Join a private room</h1>
        <p className="text-xs text-ad-text-secondary">The server checks invitation expiry and single-use status when you pair.</p>
      </div>

      <Card variant="glass" className="p-5 space-y-4">
        <Input
          label="Your Nickname"
          placeholder="What should we call you?"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          autoFocus
        />
        <Input
          label="Partner Nickname"
          value={partnerNickname}
          onChange={(e) => setPartnerNickname(e.target.value)}
        />
        <div className="text-[10px] text-ad-text-secondary font-mono">ROOM CODE · {payload.roomCode}</div>
      </Card>

      <Button fullWidth size="lg" loading={joining} onClick={join}>
        Accept & Enter Room
      </Button>
    </motion.div>
  );
};
