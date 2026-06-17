// Upload ảnh mẫu chữ ký lên Supabase Storage (bucket "flow-test") thông qua Node server.
// Server giữ service_role key (xem server/.env, server/src/routes/files.ts) — trình duyệt
// KHÔNG bao giờ chạm vào credentials, chỉ gửi nội dung file dạng base64 tới server.
const SERVER_URL = "http://localhost:8080";

export interface UploadedImage {
  path: string;
  publicUrl: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được tệp"));
    reader.onload = () => {
      const result = reader.result as string;
      // "data:<mime>;base64,<payload>" — chỉ cần phần payload
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

// Gửi ảnh mẫu chữ ký lên server → server đẩy vào bucket "flow-test", trả về path + URL public.
export async function uploadSignatureSample(file: File, ownerHint = "signer"): Promise<UploadedImage> {
  const dataBase64 = await fileToBase64(file);

  const res = await fetch(`${SERVER_URL}/api/files/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: `${ownerHint}-${file.name}`,
      mimeType: file.type || "application/octet-stream",
      dataBase64,
      folder: "signatures",
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Tải ảnh lên thất bại (HTTP ${res.status})`);

  return { path: body.path as string, publicUrl: body.publicUrl as string };
}
