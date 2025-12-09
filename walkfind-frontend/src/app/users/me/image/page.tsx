'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import axios, { AxiosError } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import Link from 'next/link';

// ★ 環境変数または NODE_ENV でローカル判定
const IS_LOCAL = process.env.NODE_ENV !== 'production';

// APIのベースURL設定
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (IS_LOCAL
    ? "http://localhost:8080/api/v1"
    : "https://b591pb4p16.execute-api.ap-northeast-1.amazonaws.com/prod/api/v1");

// Presigned URLのレスポンス型定義 (本番用)
interface PresignedUrlResponse {
  photoUrl: string;
  key: string;
}

export default function EditProfileImagePage() {
  const [profileImageKey, setProfileImageKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // トークン取得
  const getToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      if (session.tokens?.idToken) {
        return session.tokens.idToken.toString();
      }
    } catch (e) {
      console.warn('fetchAuthSession failed, checking localStorage');
    }
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('access_token');
    }
    return null;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    const token = await getToken();
    if (!token) {
      setErrorMessage('ログイン情報が取得できませんでした。まずログインしてください。');
      setLoading(false);
      return;
    }

    try {
      if (!file && !profileImageKey) {
        setErrorMessage('プロフィール画像を選択するか、キーを入力してください。');
        setLoading(false);
        return;
      }

      console.log(`[ProfileUpdate] Mode: ${IS_LOCAL ? 'Local (Direct Update)' : 'Production (S3 Presigned)'}`);

      // =========================================================
      // 分岐 A: ローカル環境 (ワンショット更新)
      // =========================================================
      if (IS_LOCAL) {
        // ローカル環境用コントローラー(/api/v1/profile) に合わせる
        if (file) {
          const formData = new FormData();
          formData.append('file', file);

          await axios.put(
            `${API_BASE_URL}/profile/profile-image`, 
            formData,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        } else {
           if (profileImageKey) {
             console.warn("ローカル環境でのキー直接指定更新は現在サポートされていません");
           }
        }
        
      } 
      // =========================================================
      // 分岐 B: 本番環境 (S3 Presigned URL + DB Patch)
      // =========================================================
      else {
        let targetKey = profileImageKey;

        // 1. ファイルがある場合はS3へアップロード
        if (file) {
          const uniqueFileName = `profile-images/${Date.now()}_${file.name}`;
          
          // Presigned URL取得
          const presignRes = await axios.get<PresignedUrlResponse>(
            `${API_BASE_URL}/upload/presigned-url`,
            {
              params: {
                key: uniqueFileName,
                contentType: file.type || 'application/octet-stream'
              },
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const { photoUrl: uploadUrl, key: generatedKey } = presignRes.data;

          // S3へPUT
          await axios.put(uploadUrl, file, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
          });
          targetKey = generatedKey;
        }

        // 2. DB更新 (PATCH)
        await axios.patch(
          `${API_BASE_URL}/me/profile/image`, 
          { profileImageUrl: targetKey },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }

      setSuccessMessage('プロフィール画像を更新しました。');
      setFile(null);
      setPreviewUrl(null);
      setProfileImageKey('');

    } catch (err) {
      const axiosError = err as AxiosError;
      if (axiosError.response) {
        console.error('Update error response:', axiosError.response);
        setErrorMessage(`更新に失敗しました: ${axiosError.response.status}`);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('予期せぬエラーが発生しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <span className="font-bold text-lg tracking-tight">WalkFind</span>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="bg-white rounded border border-gray-300 p-6 md:p-8">
          <h1 className="text-xl md:text-2xl font-bold mb-4 border-b border-gray-200 pb-3">
            プロフィール画像の変更
            {IS_LOCAL && <span className="ml-2 text-xs text-blue-600 border border-blue-600 px-1 rounded">LOCAL</span>}
          </h1>

          <p className="text-sm text-gray-600 mb-4">
            画像をアップロードしてプロフィール画像を変更します。
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="profileImageFile">
                  画像ファイルを選択
                </label>
                <input
                  id="profileImageFile"
                  type="file"
                  accept="image/*"
                  disabled={loading}
                  className="block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  onChange={handleFileChange}
                />
              </div>

              {previewUrl && (
                <div className="mt-2 flex items-center gap-4 p-4 bg-gray-50 rounded border border-gray-200">
                  <div className="w-24 h-24 rounded-full overflow-hidden border border-gray-300 bg-white flex items-center justify-center shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="プレビュー" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">新しいアイコン</p>
                    <p className="text-xs text-gray-500 mt-1">「保存する」ボタンを押すと反映されます。</p>
                  </div>
                </div>
              )}

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">または S3キーを直接指定</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              <div>
                <input
                  id="profileImageKey"
                  type="text"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm placeholder-gray-400"
                  value={profileImageKey}
                  onChange={(e) => setProfileImageKey(e.target.value)}
                  placeholder="例: profile-images/my-photo.jpg (任意)"
                  disabled={loading || !!file} 
                />
              </div>
            </div>

            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">
                ✅ {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <Link href="/users/me" className="text-sm text-gray-600 hover:text-black hover:underline">
                キャンセル
              </Link>
              <button
                type="submit"
                disabled={loading}
                className={`inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold rounded text-white transition-colors
                  ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-sm'}
                `}
              >
                {loading ? '処理中...' : '保存する'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}