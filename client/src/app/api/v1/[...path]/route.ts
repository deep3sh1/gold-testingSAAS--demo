import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ||
  'https://lab-saas-server.vercel.app'
).replace(/\/+$/, '');

async function proxy(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = (params?.path || []).join('/');
  const search = request.nextUrl.search || '';
  const targetUrl = `${BACKEND_URL}/api/v1/${path}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k !== 'host' && k !== 'connection' && k !== 'content-length') {
      headers.set(key, value);
    }
  });
  headers.set('origin', 'https://lab-saas-client.vercel.app');

  let body: ArrayBuffer | undefined = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      body = await request.arrayBuffer();
    } catch {
      // Body empty or already consumed
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k !== 'content-encoding' && k !== 'content-length' && k !== 'transfer-encoding') {
        responseHeaders.set(key, value);
      }
    });

    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');

    const resData = await res.arrayBuffer();
    return new NextResponse(resData, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[API Proxy Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'PROXY_ERROR', message: error?.message || 'Failed to reach backend server' },
      },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const OPTIONS = proxy;
