import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/stores/app.store';
import { decodeInvite, inviteStatus } from '@/services/pairing';
import { importRoomKey } from '@/security/crypto';
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
  const [partnerNickname, setPartnerNickname] = useState(payload?.host || '');
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
      await importRoomKey(payload.key);
      const remoteRoomId = await joinRemoteRoom(payload.code);
      setRoomId(remoteRoomId ?? `room-${payload.code}`, payload.code);
      void registerStoredPushToken().catch((error: unknown) => {
        console.error('Push token registration after room join failed', error);
      });
      setInvite(payload.code, new Date(payload.exp).toISOString());
      ensureDeviceId();
      setPlayerName(nickname.trim());
      setPartnerName((partnerNickname.trim() || payload.host) + ' (Host)');
      completeOnboarding();
      showToast('Private room joined', 'success');
      navigate('/home');
    } catch (error) {
      console.error('Invitation join failed', error);
      showToast('This invitation could not be opened', 'error');
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
        <h1 className="font-display text-2xl font-bold">Join {payload.host}'s Room</h1>
        <p className="text-xs text-ad-text-secondary">The invitation is well-formed and unexpired. The server validates it when remote pairing is configured.</p>
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
        <div className="text-[10px] text-ad-text-secondary font-mono">ROOM CODE · {payload.code}</div>
      </Card>

      <Button fullWidth size="lg" loading={joining} onClick={join}>
        Accept & Enter Room
      </Button>
    </motion.div>
  );
};
