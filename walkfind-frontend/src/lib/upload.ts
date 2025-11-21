import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// 環境変数からローカル環境かどうかを判定
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

// APIのベースURL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';

/**
 * 画像をアップロードし、保存先のキー(Path)を返す関数
 * 環境に応じて LocalUploadController または S3 Presigned URL を使い分けます。
 */
export async function uploadImage(file: File, contestId: string): Promise<string> {
  
  // 認証トークンの取得 (ローカルでも本番でも、API認証が必要な場合に備えて取得)
  const session = await fetchAuthSession();
  const token = session.tokens?.accessToken?.toString();
  
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  if (IS_LOCAL) {
    // ==========================================
    // ローカル環境: Spring Bootへ直接アップロード
    // ==========================================
    console.log('Uploading to Local Environment...');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contestId', contestId);

    const res = await axios.post(`${API_BASE_URL}/local-upload`, formData, {
      headers: {
        ...authHeaders,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    // サーバーが保存したパス (例: "contest-1/uuid.jpg") を返す
    return res.data.url;

  } else {
    // ==========================================
    // 本番環境: S3 Presigned URL を使用
    // ==========================================
    console.log('Uploading to S3 (Prod)...');

    // 1. サーバーからアップロード用URLとキーを取得
    // S3PresignController: GET /api/v1/upload/presigned-url
    const presignRes = await axios.get(`${API_BASE_URL}/upload/presigned-url`, {
      params: { 
        key: file.name, // 元のファイル名
        contestId: contestId,
        contentType: file.type
      },
      headers: authHeaders
    });

    const { uploadUrl, key } = presignRes.data;

    // 2. S3へ直接アップロード (PUT)
    // ここはAWSへのアクセスなので、Springの認証ヘッダーは不要。Content-Typeは必須。
    await axios.put(uploadUrl, file, {
      headers: { 
        'Content-Type': file.type 
      }
    });

    // 3. サーバーが決めたキー (例: "photo.jpg-UUID") を返す
    return key;
  }
}