import { Router } from 'express';
import { supabase } from '../db/supabase.js';

export const filesRouter = Router();

const SIGNATURE_BUCKET = 'flow-test';
const MAX_BYTES = 5 * 1024 * 1024; // khớp với giới hạn express.json({ limit: '5mb' })

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

interface UploadBody {
  fileName?: string;
  mimeType?: string;
  dataBase64?: string;
  folder?: string;
}

// POST /api/files/upload — nhận ảnh dạng base64 từ trình duyệt và đẩy lên Supabase
// Storage bằng service_role key (chỉ giữ ở server — KHÔNG bao giờ lộ ra client).
// Browser không cần biết bucket/credentials, chỉ gọi endpoint này.
filesRouter.post('/upload', async (req, res) => {
  const { fileName, mimeType, dataBase64, folder } = req.body as UploadBody;

  if (!fileName || !mimeType || !dataBase64) {
    return res.status(400).json({ error: 'Thiếu fileName, mimeType hoặc dataBase64' });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(dataBase64, 'base64');
  } catch {
    return res.status(400).json({ error: 'dataBase64 không hợp lệ' });
  }

  if (buffer.byteLength > MAX_BYTES) {
    return res.status(413).json({ error: `Tệp vượt quá giới hạn ${MAX_BYTES / (1024 * 1024)}MB` });
  }

  const safeFolder = (folder ? sanitizeFileName(folder) : 'uploads').replace(/^_+|_+$/g, '') || 'uploads';
  const path = `${safeFolder}/${Date.now()}-${sanitizeFileName(fileName)}`;

  const { error: uploadError } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (uploadError) {
    return res.status(500).json({ error: `Tải lên Supabase Storage thất bại: ${uploadError.message}` });
  }

  const { data: publicUrlData } = supabase.storage.from(SIGNATURE_BUCKET).getPublicUrl(path);

  res.json({
    bucket: SIGNATURE_BUCKET,
    path,
    publicUrl: publicUrlData.publicUrl,
  });
});
