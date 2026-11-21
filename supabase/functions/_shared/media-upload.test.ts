import { MediaPayloadTooLargeError, readBoundedMediaBody, sha256Hex } from './media-upload.ts';

Deno.test('bounded media reader accepts chunked bodies and preserves bytes', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]));
      controller.enqueue(new Uint8Array([3, 4]));
      controller.close();
    },
  });
  const result = await readBoundedMediaBody(body, 4);
  if (result.join(',') !== '1,2,3,4') throw new Error('Chunked upload bytes were not preserved.');
});

Deno.test('bounded media reader cancels a stream as soon as the limit is exceeded', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(4));
    },
    cancel() {
      cancelled = true;
    },
  });
  try {
    await readBoundedMediaBody(body, 3);
    throw new Error('Oversized upload was accepted.');
  } catch (error) {
    if (!(error instanceof MediaPayloadTooLargeError)) throw error;
  }
  if (!cancelled) throw new Error('Oversized upload stream was not cancelled.');
});

Deno.test('SHA-256 digest is stable and content-sensitive', async () => {
  const first = await sha256Hex(new Uint8Array([1, 2, 3]));
  const same = await sha256Hex(new Uint8Array([1, 2, 3]));
  const different = await sha256Hex(new Uint8Array([1, 2, 4]));
  if (first !== same || first === different || first.length !== 64) {
    throw new Error('Upload digest does not bind the exact ciphertext.');
  }
});
