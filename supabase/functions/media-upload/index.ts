import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  MediaPayloadTooLargeError,
  readBoundedMediaBody,
  sha256Hex,
  toArrayBuffer,
} from '../_shared/media-upload.ts';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-media-id, x-room-id, x-expiry-policy, x-content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};
const maxEncryptedMediaBytes = 50 * 1024 * 1024;
const mediaMagic = [0x41, 0x44, 0x31, 0x00];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const expiryPolicies = new Set(['view-once', '5s', '10s', '30s', 'keep']);
const mediaTypePattern = /^(image|video|audio)\/[a-z0-9.+-]{1,64}$/i;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authorization = request.headers.get('authorization');
  const mediaId = request.headers.get('x-media-id');
  const roomId = request.headers.get('x-room-id');
  const expiry = request.headers.get('x-expiry-policy');
  const contentType = request.headers.get('x-content-type');
  if (!authorization || !mediaId || !roomId || !expiry || !contentType) {
    return new Response('Required upload metadata is missing', { status: 400, headers: corsHeaders });
  }
  if (
    !uuidPattern.test(mediaId)
    || !uuidPattern.test(roomId)
    || !expiryPolicies.has(expiry)
    || !mediaTypePattern.test(contentType)
  ) {
    return new Response('Invalid media metadata', { status: 400, headers: corsHeaders });
  }

  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      return new Response('Invalid media length', { status: 400, headers: corsHeaders });
    }
    if (length > maxEncryptedMediaBytes) {
      return new Response('Media exceeds the 50 MiB limit', { status: 413, headers: corsHeaders });
    }
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return new Response('Media service is not configured', { status: 503, headers: corsHeaders });
  }

  const userClient = createClient(url, anonKey, { global: { headers: { authorization } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  let bytes: Uint8Array;
  try {
    bytes = await readBoundedMediaBody(request.body, maxEncryptedMediaBytes);
  } catch (error) {
    if (error instanceof MediaPayloadTooLargeError) {
      return new Response('Media exceeds the 50 MiB limit', { status: 413, headers: corsHeaders });
    }
    console.error('Encrypted media request body could not be read', error);
    return new Response('Media upload body is incomplete', { status: 400, headers: corsHeaders });
  }

  if (declaredLength !== null && Number(declaredLength) !== bytes.byteLength) {
    return new Response('Media length does not match the declared content length', {
      status: 400,
      headers: corsHeaders,
    });
  }
  if (bytes.length < 32) {
    return new Response('Encrypted media is incomplete', { status: 400, headers: corsHeaders });
  }
  if (!mediaMagic.every((byte, index) => bytes[index] === byte)) {
    return new Response('Media must use the AFTERDARK encrypted container', { status: 400, headers: corsHeaders });
  }

  const payloadHash = await sha256Hex(bytes);
  const { data: path, error: recordError } = await userClient.rpc('create_media_record', {
    target_media: mediaId,
    target_room: roomId,
    target_expiry_policy: expiry,
    target_content_type: contentType,
  });
  if (recordError || typeof path !== 'string') {
    console.error('Encrypted media metadata was rejected', recordError?.message);
    return new Response('Media metadata was rejected', { status: 403, headers: corsHeaders });
  }

  const { data: registration, error: registrationError } = await userClient.rpc('register_media_upload', {
    target_media: mediaId,
    target_sha256: payloadHash,
    target_bytes: bytes.byteLength,
  });
  const uploadRecord = Array.isArray(registration) ? registration[0] : null;
  if (
    registrationError
    || !uploadRecord
    || uploadRecord.storage_path !== path
    || typeof uploadRecord.already_uploaded !== 'boolean'
  ) {
    console.error('Encrypted media upload registration failed', registrationError?.message);
    const conflict = registrationError?.message.includes('media_upload_conflict');
    return new Response(
      conflict ? 'Media identifier is already bound to different encrypted content' : 'Media upload was rejected',
      { status: conflict ? 409 : 403, headers: corsHeaders },
    );
  }

  const serviceClient = createClient(url, serviceKey);
  const storage = serviceClient.storage.from('afterdark-private-media');
  const { error: uploadError } = await storage.upload(
    path,
    new Blob([toArrayBuffer(bytes)]),
    { contentType: 'application/octet-stream', upsert: false },
  );
  if (uploadError) {
    if (uploadError.statusCode !== '409') {
      console.error('Encrypted media upload failed', uploadError.message);
      return new Response('Media upload failed', { status: 503, headers: corsHeaders });
    }

    const { data: existingObject, error: downloadError } = await storage.download(path);
    if (downloadError || !existingObject) {
      console.error('Existing encrypted media object could not be verified', downloadError?.message);
      return new Response('Media upload retry could not be verified', { status: 503, headers: corsHeaders });
    }

    try {
      const existingBytes = await readBoundedMediaBody(existingObject.stream(), maxEncryptedMediaBytes);
      if (
        existingBytes.byteLength !== bytes.byteLength
        || await sha256Hex(existingBytes) !== payloadHash
      ) {
        return new Response('Media identifier is already bound to different encrypted content', {
          status: 409,
          headers: corsHeaders,
        });
      }
    } catch (error) {
      console.error('Existing encrypted media object failed verification', error);
      return new Response('Existing media object could not be verified', { status: 409, headers: corsHeaders });
    }
  }

  const { error: completionError } = await serviceClient.rpc('complete_media_upload', {
    target_media: mediaId,
    target_sha256: payloadHash,
    target_bytes: bytes.byteLength,
  });
  if (completionError) {
    console.error('Encrypted media upload completion failed', completionError.message);
    return new Response('Media upload completion failed and can be retried', {
      status: 503,
      headers: corsHeaders,
    });
  }

  return Response.json({ uploaded: true }, { headers: corsHeaders });
});
