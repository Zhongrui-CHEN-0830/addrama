import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => ({
        allowedContentTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
        maximumSizeInBytes: 100 * 1024 * 1024, // 100MB
        tokenPayload: JSON.stringify({ pathname }),
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log('[upload] blob url:', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}
