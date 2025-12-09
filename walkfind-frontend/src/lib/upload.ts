import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

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

      const { photoUrl: uploadUrl, key } = presignRes.data;

      if (!uploadUrl) {
         throw new Error("アップロードURL (photoUrl) の取得に失敗しました");
      }

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

/**
 * ユーザーのプロフィール画像をアップロードし、更新されたプロフィール画像URLを返す関数
 * UserProfileController#updateProfileImage (PUT /api/v1/profile/profile-image) を呼び出します。
 */
export async function uploadProfileImage(file: File): Promise<string> {
  let token: string | null = null;

  // 1. まず Amplify のセッションから取得を試みる
  try {
    const session = await fetchAuthSession();
    console.log('fetchAuthSession result (uploadProfileImage):', session);

    // accessToken / idToken のどちらかがあれば使う
    token =
      session.tokens?.accessToken?.toString() ??
      session.tokens?.idToken?.toString() ??
      null;
  } catch (e) {
    console.warn('fetchAuthSession failed in uploadProfileImage:', e);
  }

  // 2. それでもダメなら localStorage に保存してあるトークンを使う
  if (!token && typeof window !== 'undefined') {
    const storedAccess = window.localStorage.getItem('access_token');
    const storedId = window.localStorage.getItem('id_token');
    console.log(
      '[uploadProfileImage] fallback tokens from localStorage:',
      !!storedAccess,
      !!storedId,
    );
    token = storedAccess ?? storedId;
  }

  // 3. どこにもトークンが無ければエラー
  if (!token) {
    console.error('[uploadProfileImage] 認証トークンが取得できませんでした。');
    throw new Error(
      '認証情報が見つからないため、プロフィール画像を更新できません。まずログインしてください。',
    );
  }

  const formData = new FormData();
  formData.append('file', file);

  // 4. Authorization ヘッダ付きで PUT
  const res = await axios.put(
    `${API_BASE_URL}/profile/profile-image`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  // UpdatingUserProfileResponse の profileImageUrl を返す想定
  return res.data.profileImageUrl as string;
}
