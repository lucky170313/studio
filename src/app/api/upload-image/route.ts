
import { NextRequest, NextResponse } from 'next/server';
import ImageKit from 'imagekit';

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT!,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file found in the request' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(fileBuffer);

    const uploadResponse = await imagekit.upload({
      file: buffer,
      fileName: fileName || file.name,
      folder: '/drop-aqua-track-uploads',
      useUniqueFileName: true,
    });

    return NextResponse.json({ success: true, url: uploadResponse.url });
  } catch (error: any) {
    console.error('[IMAGE_UPLOAD_ERROR]', error);
    return NextResponse.json({ success: false, message: error.message || 'Image upload failed' }, { status: 500 });
  }
}
