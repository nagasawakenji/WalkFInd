import axios from 'axios';

// 環境変数が読めない場合でも、本番ビルドならAWSのURLを強制的に使うように修正
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1'
    : 'http://localhost:8080/api/v1');

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// レスポンスのデータ部分だけを返すインターセプター
// これがあるため、呼び出し側は response.data ではなく response をそのまま使えます
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // エラーハンドリング（任意）
    return Promise.reject(error);
  }
);