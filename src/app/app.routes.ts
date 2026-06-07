import { Routes } from '@angular/router';
import { App } from './app';

// App không dùng <router-outlet> — route ở đây chỉ tồn tại để Angular Router (và do đó
// việc trích xuất route cho SSR trong app.routes.server.ts) biết về các đường dẫn như
// "/flow/:id" (được gắn lên path qua Location.go, không qua Router). Nếu không có route
// khớp, server sẽ trả 404 "Cannot GET ..." khi reload trang ở URL đó.
export const routes: Routes = [{ path: '**', component: App }];
