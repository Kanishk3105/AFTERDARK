import { describe, it, expect } from 'vitest';
import {
  createRoomCode,
  createRoomId,
  encodeInvite,
  decodeInvite,
  inviteStatus,
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

  it('correctly encodes and decodes time-limited invitation tokens', () => {
    const mockPayload: InvitePayload = {
      v: 1,
      code: 'ABCD89',
      exp: Date.now() + 3600 * 1000,
      key: { kty: 'oct', k: 'mockKeyData123' },
      host: 'Alex',
    };

    const token = encodeInvite(mockPayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);

    const decoded = decodeInvite(token);
    expect(decoded.v).toBe(1);
    expect(decoded.code).toBe('ABCD89');
    expect(decoded.host).toBe('Alex');
    expect(decoded.key).toEqual(mockPayload.key);
  });

  it('identifies expired invitations correctly', () => {
    const expiredPayload: InvitePayload = {
      v: 1,
      code: 'ABCD89',
      exp: Date.now() - 1000, // in the past
      key: { kty: 'oct', k: 'mock' },
      host: 'Alex',
    };

    expect(inviteStatus(expiredPayload)).toBe('expired');

    const validPayload: InvitePayload = {
      v: 1,
      code: 'ABCD89',
      exp: Date.now() + 60000, // in the future
      key: { kty: 'oct', k: 'mock' },
      host: 'Alex',
    };

    expect(inviteStatus(validPayload)).toBe('valid');
  });

  it('rejects malformed invitation tokens', () => {
    expect(() => decodeInvite('not-an-invite')).toThrow();
  });
});
