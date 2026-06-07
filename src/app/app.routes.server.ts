import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // App là SPA một-view duy nhất; "/flow/:id" chỉ là URL hiển thị (gắn lên path bằng Location.go,
    // không qua Angular Router) để đánh dấu quy trình đang mở — không phải route thật sự.
    // Dùng Client thay vì Prerender để server trả về shell ứng dụng cho MỌI đường dẫn
    // (tránh lỗi "Cannot GET /flow/:id" khi reload trang ở URL đó).
    path: '**',
    renderMode: RenderMode.Client
  }
];
