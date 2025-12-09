import axios from 'axios';

// 環境変数からローカル環境かどうかを判定
const IS_LOCAL = process.env.NODE_ENV !== 'production';

// ★ 環境変数がうまく読めない時のために、本番URLをここに直書きします
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1"
    : "http://localhost:8080/api/v1");

/**
 * 画像をアップロードし、保存先のキー(Path)を返す関数
 * @param file アップロードするファイル
 * @param contestId コンテストID
 * @param token 認証トークン (呼び出し元から受け取る)
 */
export async function uploadImage(file: File, contestId: string, token: string): Promise<string> {
  
  if (!token) {
    throw new Error("認証トークンが渡されていません。");
  }
  
  const authHeaders = { Authorization: `Bearer ${token}` };

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
    
    return res.data.url;

  } else {
    // ==========================================
    // 本番環境: S3 Presigned URL を使用
    // ==========================================
    console.log('Uploading to S3 (Prod)...');

    // 1. サーバーからアップロード用URLとキーを取得
    // S3PresignController: GET /api/v1/upload/presigned-url
    try {
      const presignRes = await axios.get(`${API_BASE_URL}/upload/presigned-url`, {
        params: { 
          key: file.name,
          contestId: contestId,
          contentType: file.type
        },
        // ★受け取ったトークンをヘッダーにセット
        headers: authHeaders
      });

      const { uploadUrl, key } = presignRes.data;

      // 2. S3へ直接アップロード (PUT)
      // AWS S3への直接アクセスなので、Authorizationヘッダーは不要
      await axios.put(uploadUrl, file, {
        headers: { 
          'Content-Type': file.type 
        }
      });

      // 3. サーバーが決めたキーを返す
      return key;

    } catch (error) {
      console.error("Upload Error Details:", error);
      throw error;
    }
  }
}