import axios from 'axios';

/**
 * 画像をアップロードして、保存先のキー(パス)を返す関数
 */
export async function uploadImage(file: File, contestId: string): Promise<string> {
  
  // 環境変数で分岐
  const isLocal = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

  if (isLocal) {
    // === ローカル環境のロジック (1発送信) ===
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contestId', contestId);

    // LocalUploadController へ送信
    const res = await axios.post('/api/v1/local-upload', formData);
    return res.data.url; // "contest-1/uuid.jpg" が返る

  } else {
    // === 本番環境のロジック (S3 Presigned URL) ===
    // 1. URLとキーを取得 (S3PresignController)
    const presignRes = await axios.get('/api/v1/upload/presigned-url', {
      params: { contestId, key: file.name, contentType: file.type }
    });
    const { uploadUrl, key } = presignRes.data;

    // 2. S3へ直接アップロード
    await axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type }
    });

    return key; // サーバーが決めた "contest-1/uuid.jpg" を返す
  }
}