'use client';

import { useState, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import Image from 'next/image';
import axios, { AxiosError } from 'axios'; // AxiosError をインポート
import { uploadImage } from '@/lib/upload'; // 本番用（S3）

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
      // 認証トークンの取得（Spring Boot APIレスポンス由来）
      const token = localStorage.getItem("access_token");

      if (!token) {
        // ログイン後に元のページへ戻すためのURLを保存
        const currentPath = window.location.pathname;
        localStorage.setItem("redirect_after_login", currentPath);

        const loginUrl = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;
        if (loginUrl) {
          window.location.href = loginUrl;
        } else {
          router.push('/login');
        }
        return;
      }
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
      const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';

      // 2. ローカル or 本番で分岐
      if (IS_LOCAL) {
        // ✅ ローカル環境：DTO + ファイルを multipart で送信
        const formData = new FormData();

        // DTO を JSON として Blob 化して request パートに詰める
        const requestDto = {
          contestId: Number(contestId),
          // ローカルでは一時的にダミーURLを入れる（バックエンド側で実URLに上書き）
          photoUrl: "local",
          title: title,
          description: description,
        };

        formData.append(
          "request",
          new Blob([JSON.stringify(requestDto)], {
            type: "application/json",
          })
        );

        // ファイル本体
        formData.append("file", file);

        await axios.post(`${API_BASE_URL}/photos`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            // ❗ multipart/form-data の Content-Type は axios に自動設定させる
          },
        });

      } else {
        // ✅ 本番環境：S3 Presigned Upload
        const photoKey = await uploadImage(file, contestId);

        await axios.post(
          `${API_BASE_URL}/photos`,
          {
            contestId: Number(contestId),
            title: title,
            description: description,
            photoUrl: photoKey,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }

      alert('投稿が完了しました！');
      router.push(`/contests/${contestId}/photos`);

    } catch (error) {
      // ★修正: any を使わず、AxiosErrorかどうかをチェックする
      console.error('Submission failed:', error);
      
      let msg = '投稿に失敗しました。再度お試しください。';

      // axiosのエラーかどうか判定し、安全にレスポンスデータにアクセスする
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        msg = error.response.data.message;
      }
      
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">写真を投稿する</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
        
        {/* 画像アップロードエリア */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            作品画像 <span className="text-red-500">*</span>
          </label>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition">
            {previewUrl ? (
              <div className="relative w-full h-64">
                <Image 
                  src={previewUrl} 
                  alt="Preview" 
                  fill 
                  className="object-contain"
                />
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                >
                  ✕ 削除
                </button>
              </div>
            ) : (
              <div className="text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-block px-4 py-2 bg-blue-50 text-blue-600 rounded-md font-medium hover:bg-blue-100"
                >
                  ファイルを選択
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG, GIF (10MB以下)</p>
              </div>
            )}
          </div>
        </div>

        {/* タイトル */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="作品のタイトルを入力"
            maxLength={100}
            required
          />
        </div>

        {/* 説明文 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            説明文 (任意)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-32"
            placeholder="撮影の意図やコメントなど"
            maxLength={500}
          />
        </div>

        {/* エラーメッセージ */}
        {errorMessage && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {errorMessage}
          </div>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-md text-white font-bold text-lg transition duration-200
            ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg'}
          `}
        >
          {isSubmitting ? '送信中...' : '投稿する'}
        </button>
      </form>
    </main>
  );
}