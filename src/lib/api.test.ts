import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError, api, request, setAuthHeaders } from './api';

/**
 * A Response body can only be read once, so each call gets a fresh one —
 * otherwise a test that fetches twice fails on "Body has already been read".
 */
function jsonFetch(body: unknown, status = 200) {
  return vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
}

function rawFetch(body: BodyInit | null, status = 200) {
  return vi.fn<typeof fetch>(async () => new Response(body, { status }));
}

/** Narrows the recorded fetch init so assertions can read headers and body. */
function callInit(mock: ReturnType<typeof jsonFetch>, index = 0) {
  const init = mock.mock.calls[index]?.[1];
  if (!init) throw new Error(`fetch was not called ${index + 1} time(s)`);
  return init as RequestInit & { headers: Record<string, string>; body: string };
}

describe('request', () => {
  beforeEach(() => {
    setAuthHeaders({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses a JSON body on success', async () => {
    vi.stubGlobal('fetch', jsonFetch({ status: 'ok' }));
    await expect(request('/health')).resolves.toEqual({ status: 'ok' });
  });

  it('surfaces the Thai error message the server sends', async () => {
    vi.stubGlobal('fetch', jsonFetch({ error: 'ไม่พบรายการ' }, 404));

    await expect(request('/conversations/missing')).rejects.toThrow(ApiError);
    await expect(request('/conversations/missing')).rejects.toThrow('ไม่พบรายการ');
  });

  it('falls back to a status message when the body has no error field', async () => {
    vi.stubGlobal('fetch', jsonFetch({}, 500));
    await expect(request('/boom')).rejects.toThrow('คำขอไม่สำเร็จ (รหัส 500)');
  });

  it('reads the code, retry hint and request id out of the error envelope', async () => {
    vi.stubGlobal(
      'fetch',
      jsonFetch(
        {
          error: {
            code: 'ACOUSTIC_SERVICE_UNAVAILABLE',
            message: 'ยังไม่มีโมเดลวิเคราะห์เสียงเคาะ',
            retryable: false,
            requestId: 'req_abc123',
          },
        },
        503,
      ),
    );

    // A caller deciding whether to offer "ลองใหม่" needs `retryable`, not the
    // status: 503 is normally worth retrying, and this one never will be.
    const error = (await request('/audio/knock-analysis').catch((err) => err)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('ยังไม่มีโมเดลวิเคราะห์เสียงเคาะ');
    expect(error.code).toBe('ACOUSTIC_SERVICE_UNAVAILABLE');
    expect(error.retryable).toBe(false);
    expect(error.requestId).toBe('req_abc123');
  });

  it('still reads a bare { error: string } body from an older server', async () => {
    // A response held by a service worker installed before the envelope
    // landed still has the old shape.
    vi.stubGlobal('fetch', jsonFetch({ error: 'ไม่พบรายการ' }, 404));

    const error = (await request('/conversations/missing').catch((err) => err)) as ApiError;
    expect(error.message).toBe('ไม่พบรายการ');
    expect(error.code).toBe('REQUEST_FAILED');
    expect(error.retryable).toBe(false);
  });

  it('infers retryability from the status when the body does not say', async () => {
    vi.stubGlobal('fetch', jsonFetch({ error: 'เซิร์ฟเวอร์ไม่พร้อม' }, 502));
    await expect(request('/health')).rejects.toMatchObject({ retryable: true });
  });

  it('falls back to the X-Request-Id header when the body is not JSON', async () => {
    // A 500 from a proxy arrives as HTML, so the only id available is the
    // header - and that is exactly the failure worth reporting.
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        async () => new Response('<html>502</html>', { status: 500, headers: { 'X-Request-Id': 'req_header' } }),
      ),
    );

    const error = (await request('/boom').catch((err) => err)) as ApiError;
    expect(error.requestId).toBe('req_header');
    expect(error.code).toBe('REQUEST_FAILED');
  });

  it('reports a network failure separately from an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(request('/health')).rejects.toThrow(NetworkError);
  });

  it('returns undefined for 204 No Content', async () => {
    vi.stubGlobal('fetch', rawFetch(null, 204));
    await expect(request('/users/me/conversations')).resolves.toBeUndefined();
  });

  it('tolerates a success response with a non-JSON body', async () => {
    vi.stubGlobal('fetch', rawFetch('ok', 200));
    await expect(request('/health')).resolves.toBeNull();
  });

  it('attaches auth headers once they are set', async () => {
    const fetchMock = jsonFetch({});
    vi.stubGlobal('fetch', fetchMock);

    setAuthHeaders({ Authorization: 'Bearer token-1', 'x-user-id': 'usr-9' });
    await request('/conversations');

    const headers = callInit(fetchMock).headers;
    expect(headers.Authorization).toBe('Bearer token-1');
    expect(headers['x-user-id']).toBe('usr-9');
  });

  it('omits the JSON content type on bodyless requests', async () => {
    const fetchMock = jsonFetch({});
    vi.stubGlobal('fetch', fetchMock);

    await request('/conversations');
    expect(callInit(fetchMock, 0).headers['Content-Type']).toBeUndefined();

    await request('/conversations', { method: 'POST', body: { title: 'x' } });
    expect(callInit(fetchMock, 1).headers['Content-Type']).toBe('application/json');
  });
});

describe('api endpoints', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('encodes conversation ids that contain unsafe characters', async () => {
    const fetchMock = jsonFetch([]);
    vi.stubGlobal('fetch', fetchMock);

    await api.listMessages('conv/with slash');
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('conv%2Fwith%20slash');
  });

  it('posts the knock-analysis mode through to the server', async () => {
    const fetchMock = jsonFetch({ id: 'm1' });
    vi.stubGlobal('fetch', fetchMock);

    await api.sendMessage('conv-1', { content: 'เคาะ 3 ครั้ง', mode: 'knock-analysis' });

    const body = JSON.parse(callInit(fetchMock).body);
    expect(body).toMatchObject({ content: 'เคาะ 3 ครั้ง', mode: 'knock-analysis' });
  });

  it('sends only digits when requesting an OTP', async () => {
    const fetchMock = jsonFetch({ success: true });
    vi.stubGlobal('fetch', fetchMock);

    await api.sendOtp('0845928190');
    expect(JSON.parse(callInit(fetchMock).body)).toEqual({ phone: '0845928190' });
  });

  it('posts login payload with identifier and password', async () => {
    const fetchMock = jsonFetch({ success: true, user: { id: 'usr-1', name: 'เกษตรกร' }, token: 'jwt-xyz' });
    vi.stubGlobal('fetch', fetchMock);

    const res = await api.login({ identifier: '081-234-5678', password: 'secretpassword' });
    expect(res.success).toBe(true);
    expect(JSON.parse(callInit(fetchMock).body)).toEqual({ identifier: '081-234-5678', password: 'secretpassword' });
  });

  it('posts register payload with farmer profile fields', async () => {
    const fetchMock = jsonFetch({ success: true, user: { id: 'usr-2', name: 'สมศักดิ์' }, token: 'jwt-abc' });
    vi.stubGlobal('fetch', fetchMock);

    const res = await api.register({ name: 'สมศักดิ์', phone: '089-999-9999', province: 'สุพรรณบุรี' });
    expect(res.success).toBe(true);
    expect(JSON.parse(callInit(fetchMock).body)).toEqual({
      name: 'สมศักดิ์',
      phone: '089-999-9999',
      province: 'สุพรรณบุรี',
    });
  });

  it('fetches current user profile from /auth/me', async () => {
    const fetchMock = jsonFetch({ success: true, user: { id: 'usr-1', name: 'เกษตรกร' } });
    vi.stubGlobal('fetch', fetchMock);

    const res = await api.me();
    expect(res.success).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/auth/me');
  });
});
