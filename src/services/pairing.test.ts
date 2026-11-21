import { describe, it, expect } from 'vitest';
import {
  createInvitationCode,
  createRoomCode,
  createRoomId,
  encodeInvite,
  decodeInvite,
  inviteStatus,
  inviteLink,
  inviteTokenFromDeepLink,
  InvitePayload,
} from './pairing';

describe('Pairing & Invitations Service', () => {
  it('generates high-entropy readable room codes', () => {
    const code = createRoomCode(6);
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  it('generates unique UUID room ids', () => {
    const id1 = createRoomId();
    const id2 = createRoomId();
    expect(id1).not.toBe(id2);
  });

  it('creates high-entropy single-use invitation codes separately from room codes', () => {
    const first = createInvitationCode();
    const second = createInvitationCode();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
  });

  it('correctly encodes and decodes time-limited invitation tokens', () => {
    const mockPayload: InvitePayload = {
      v: 2,
      code: createInvitationCode(),
      roomCode: 'ABCD89',
      exp: Date.now() + 3600 * 1000,
    };

    const token = encodeInvite(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    const decoded = decodeInvite(token);
    expect(decoded).toEqual(mockPayload);
    expect(token).not.toContain('mockKeyData123');
  });

  it('identifies expired invitations correctly', () => {
    const expiredPayload: InvitePayload = {
      v: 2,
      code: createInvitationCode(),
      roomCode: 'ABCD89',
      exp: Date.now() - 1000, // in the past
    };

    expect(inviteStatus(expiredPayload)).toBe('expired');

    const validPayload: InvitePayload = {
      v: 2,
      code: createInvitationCode(),
      roomCode: 'ABCD89',
      exp: Date.now() + 60000, // in the future
    };

    expect(inviteStatus(validPayload)).toBe('valid');
  });

  it('rejects malformed invitation tokens', () => {
    expect(() => decodeInvite('not-an-invite')).toThrow();
  });

  it('rejects legacy invitations that contained exported room keys', () => {
    const legacy = btoa(JSON.stringify({
      v: 1,
      code: 'ABCD89',
      exp: Date.now() + 60_000,
      key: { kty: 'oct', k: 'secret' },
      host: 'Alex',
    }));
    expect(() => decodeInvite(legacy)).toThrow();
  });

  it('strips unexpected key fields before encoding an invitation', () => {
    const payload = Object.assign(
      {
        v: 2 as const,
        code: createInvitationCode(),
        roomCode: 'ABCD89',
        exp: Date.now() + 60_000,
      },
      { key: { kty: 'oct', k: 'secret' } },
    );
    const encoded = encodeInvite(payload);
    expect(decodeInvite(encoded)).not.toHaveProperty('key');
    expect(encoded).not.toContain('secret');
  });

  it('creates links that resolve on web and through the Android custom scheme', () => {
    expect(inviteLink('opaque-token', false, 'https://afterdark.example'))
      .toBe('https://afterdark.example/join#opaque-token');
    expect(inviteLink('opaque-token', true, 'http://localhost'))
      .toBe('afterdark://join#opaque-token');
  });

  it('extracts invite tokens only from the registered Android deep-link route', () => {
    expect(inviteTokenFromDeepLink('afterdark://join#opaque-token')).toBe('opaque-token');
    expect(inviteTokenFromDeepLink('https://afterdark.example/join#opaque-token')).toBeNull();
    expect(inviteTokenFromDeepLink('not a url')).toBeNull();
  });
});
