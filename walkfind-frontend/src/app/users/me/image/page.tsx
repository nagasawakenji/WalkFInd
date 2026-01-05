'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import axios, { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

// 環境変数（文字列なので boolean 化）
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

// Presigned URLのレスポンス型定義 (本番用)
interface PresignedUrlResponse {
  photoUrl: string;
  key: string;
}

export default function EditProfileImagePage() {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const router = useRouter();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setFile(selectedFile);
    if (selectedFile) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
      // ファイル選択時にメッセージをリセット
      setErrorMessage('');
      setSuccessMessage('');
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (!file) {
        setErrorMessage('画像ファイルを選択してください。');
        setLoading(false);
        return;
      }

      console.log(`[ProfileUpdate] Mode: ${IS_LOCAL ? 'Local (Direct Update)' : 'Production (S3 Presigned)'}`);

      // =========================================================
      // 分岐 A: ローカル環境 (ワンショット更新)
      // =========================================================
      if (IS_LOCAL) {
        const formData = new FormData();
        formData.append('file', file);
        await api.put('/profile/profile-image', formData);
      } 
      // =========================================================
      // 分岐 B: 本番環境 (S3 Presigned URL + DB Patch)
      // =========================================================
      else {
        // 1. Presigned URL取得
        // ユニークなファイル名を生成 (profile-images/timestamp_filename)
        const uniqueFileName = `profile-images/${Date.now()}_${file.name}`;
        
        const presignRes = await api.get<PresignedUrlResponse>('/upload/presigned-url', {
            params: {
            key: uniqueFileName,
            contentType: file.type || 'application/octet-stream',
            },
        });

        const { photoUrl: uploadUrl, key: generatedKey } = presignRes.data;

        // 2. S3へPUT (axiosを使用、認証ヘッダなし)
        await axios.put(uploadUrl, file, {
            headers: {
            'Content-Type': file.type || 'application/octet-stream',
            },
        });

        // 3. DB更新 (PATCH)
        await api.patch('/me/profile/image', { profileImageUrl: generatedKey });
      }

      setSuccessMessage('プロフィール画像を更新しました。');
      // プレビュー等はそのまま残す（更新された実感のため）か、リセットするかはお好みで。
      // ここでは成功を示すためファイル選択状態は維持します。

    } catch (err: unknown) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        console.error('Update error response:', err.response);

        if (status === 401) {
          // 未ログイン/期限切れ
          localStorage.setItem('redirect_after_login', '/users/me/image');
          router.replace('/login');
          return;
        }

        setErrorMessage(`更新に失敗しました: ${status ?? 'unknown'}`);
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
    <main className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      
      {/* Fixed Navbar (H-16) */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">
                  WalkFind
                </Link>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-black">Change Avatar</span>
            </div>
        </div>
      </nav>

      <div className="pt-24 max-w-2xl mx-auto px-4">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2 flex items-center gap-2">
                    Change Avatar
                    {IS_LOCAL && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">LOCAL</span>}
                </h1>
                <p className="text-gray-500 text-sm">
                   画像をアップロードしてプロフィール画像を変更します。
                </p>
            </div>
            
            <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-full hover:bg-gray-100 transition-colors shadow-sm"
            >
                キャンセル
            </button>
        </div>

        {/* フォームカード */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* プレビューエリア */}
            <div className="flex flex-col items-center justify-center space-y-4">
                <div className={`
                    relative w-40 h-40 rounded-full overflow-hidden border-4 
                    ${previewUrl ? 'border-black shadow-md' : 'border-gray-100 bg-gray-50'}
                `}>
                    {previewUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                            src={previewUrl} 
                            alt="Preview" 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full text-gray-300">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    )}
                </div>
                <p className="text-xs text-gray-400">
                    {previewUrl ? '新しい画像のプレビュー' : '画像が選択されていません'}
                </p>
            </div>

            {/* ファイル選択 */}
            <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                    画像ファイルを選択
                </label>
                <input
                    id="profileImageFile"
                    type="file"
                    accept="image/*"
                    disabled={loading}
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2.5 file:px-4
                        file:rounded-full file:border-0
                        file:text-xs file:font-bold
                        file:bg-black file:text-white
                        hover:file:bg-gray-800
                        cursor-pointer
                        border border-gray-200 rounded-xl bg-gray-50
                    "
                />
            </div>

            {/* メッセージエリア */}
            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span>✅</span> {successMessage}
              </div>
            )}

            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span>⚠️</span> {errorMessage}
              </div>
            )}

            {/* アクションボタン */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <Link
                href="/users/me"
                className="px-6 py-3 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                マイページへ戻る
              </Link>

              <button
                type="submit"
                disabled={loading || !file}
                className={`
                    px-8 py-3 rounded-full text-sm font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5
                    ${(loading || !file)
                        ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                        : 'bg-black hover:bg-gray-800 hover:shadow-xl'
                    }
                `}
              >
                {loading ? 'Uploading...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}