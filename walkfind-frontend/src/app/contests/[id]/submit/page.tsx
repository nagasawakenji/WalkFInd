'use client';

import { useState, type ChangeEvent, type FormEvent, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import axios, { isAxiosError } from 'axios';
import { api } from '@/lib/api';

// 環境変数
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SubmitPhotoPage({ params }: PageProps) {
  const resolvedParams = use(params);  
  const contestId = resolvedParams.id; 
  const router = useRouter();

  // フォームの状態管理
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // 送信中の状態
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ファイル選択時の処理
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // ファイルサイズチェック (例: 10MB以下)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setErrorMessage('ファイルサイズは10MB以下にしてください。');
      return;
    }

    setFile(selectedFile);
    setErrorMessage('');

    // プレビュー表示
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
  };

  // 投稿ボタンクリック時の処理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      setErrorMessage('画像とタイトルは必須です。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      console.log(`[SubmitPhoto] Mode: ${IS_LOCAL ? 'Local' : 'Production'}`);

      if (IS_LOCAL) {
        // ローカル環境: FormDataで直接送信
        const formData = new FormData();
        const requestDto = {
          contestId: Number(contestId),
          photoUrl: 'local',
          title,
          description,
        };

        formData.append(
          'request',
          new Blob([JSON.stringify(requestDto)], {
            type: 'application/json',
          })
        );
        formData.append('file', file);

        // Cookie認証（HttpOnly）で送る。Content-Type はAxiosが自動で設定。
        await api.post('/photos', formData);
      } else {
        // 本番環境 (AWS): S3 Presigned URL 方式
        const mimeType = file.type || 'application/octet-stream';
        const key = `contest-photos/${contestId}/${Date.now()}_${file.name}`;

        // 1) 署名付きアップロードURLを取得（Cookie認証）
        const presignRes = await api.get<{ photoUrl: string; key: string }>('/upload/presigned-url', {
          params: {
            key,
            contentType: mimeType,
          },
        });

        const { photoUrl: uploadUrl, key: finalS3Key } = presignRes.data;

        // 2) S3へ直接PUT（S3のURLは別ドメインなので api ではなく axios を使う）
        await axios.put(uploadUrl, file, {
          headers: {
            'Content-Type': mimeType,
          },
        });

        // 3) メタデータをDBに登録（Cookie認証）
        await api.post('/photos', {
          contestId: Number(contestId),
          title,
          description,
          photoUrl: finalS3Key,
        });
      }

      alert('投稿が完了しました！');
      router.push(`/contests/${contestId}/photos`);

    } catch (error: unknown) {
      console.error('Submission failed:', error);

      // 未ログイン/期限切れ
      if (isAxiosError(error) && error.response?.status === 401) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : `/contests/${contestId}/submit`;
        try {
          localStorage.setItem('redirect_after_login', currentPath);
        } catch {
          // ignore
        }
        router.replace('/login');
        return;
      }

      let msg = '投稿に失敗しました。再度お試しください。';

      if (isAxiosError(error)) {
        const data = error.response?.data as unknown;
        if (data && typeof data === 'object' && 'message' in data) {
          const maybeMessage = (data as { message?: unknown }).message;
          if (typeof maybeMessage === 'string' && maybeMessage.length > 0) {
            msg = maybeMessage;
          }
        }
      }

      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] font-sans text-[#333]">
      {/* 共通ナビゲーションバー */}
      <nav className="bg-black text-white h-12 flex items-center px-4 lg:px-8 mb-8 shadow-sm">
        <Link href="/" className="font-bold text-lg tracking-tight hover:text-gray-300">
          WalkFind
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <Link href={`/contests/${contestId}`} className="text-sm text-gray-300 hover:text-white">
          Contest Details
        </Link>
        <span className="mx-2 text-gray-500">/</span>
        <span className="text-sm text-white">Submission</span>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="bg-white border border-gray-300 rounded-sm p-6 md:p-8">
          <h1 className="text-2xl font-bold mb-6 border-b border-gray-200 pb-4 flex items-center gap-2">
            <span className="text-2xl">📤</span> Submit Photo
          </h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 画像アップロードエリア */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Image File <span className="text-red-600 ml-1 text-xs">[Required]</span>
              </label>
              
              <div className={`border-2 border-dashed rounded-sm p-4 text-center transition-colors ${previewUrl ? 'border-gray-300 bg-white' : 'border-gray-400 bg-gray-50 hover:bg-gray-100'}`}>
                {previewUrl ? (
                  <div className="relative w-full max-w-md mx-auto aspect-[4/3] bg-gray-100 border border-gray-200">
                    <Image 
                      src={previewUrl} 
                      alt="Preview" 
                      fill 
                      className="object-contain"
                    />
                    <div className="absolute top-0 right-0 p-2">
                      <button
                        type="button"
                        onClick={() => { setFile(null); setPreviewUrl(null); }}
                        className="bg-black text-white text-xs px-3 py-1 rounded-sm hover:bg-gray-800 shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex flex-col items-center"
                    >
                      <span className="text-4xl text-gray-400 mb-2">📂</span>
                      <span className="text-blue-700 font-bold hover:underline">Select a file</span>
                      <span className="text-xs text-gray-500 mt-2 font-mono">JPG, PNG, GIF (Max 10MB)</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* タイトル */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  Title <span className="text-red-600 ml-1 text-xs">[Required]</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                  placeholder="Enter title"
                  maxLength={100}
                  required
                />
              </div>

              {/* 説明文 */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none h-32 transition-colors font-mono text-sm"
                  placeholder="Enter description (optional)"
                  maxLength={500}
                />
              </div>
            </div>

            {/* エラーメッセージ */}
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm text-sm font-medium flex items-center gap-2">
                <span>⚠️</span> {errorMessage}
              </div>
            )}

            {/* 送信ボタンエリア */}
            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  px-8 py-3 rounded-sm font-bold text-white transition-all duration-200
                  ${isSubmitting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow'
                  }
                `}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Submitting...
                  </span>
                ) : (
                  'Submit Entry'
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </main>
  );
}