// src/lib/axios.ts
import axios from 'axios';

// ローカルと本番で切り替えるための環境変数
// .env.local には NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1 を設定
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// レスポンスのデータ部分だけを返すインターセプター（任意）
apiClient.interceptors.response.use((response) => response.data);