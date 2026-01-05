'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios'; 
import { ContestDetailResponse } from '@/types';

// ------------------------------------------
// Types
// ------------------------------------------
type SimilarityStatus = 'READY' | 'NOT_READY';

interface PhotoDisplayResponse {
  photoId: number;
  title: string;
  username: string;
  userId: string;
  totalVotes: number;
  photoUrl: string;
  similarityStatus?: SimilarityStatus | null;
  status?: SimilarityStatus | null;
}

interface PhotoListResponse {
  photoResponses: PhotoDisplayResponse[];
  totalCount: number;
}

interface UserMeResponse {
  userId: string;
}

// ------------------------------------------
// Constants & API Setup
// ------------------------------------------
const IS_LOCAL = process.env.NEXT_PUBLIC_IS_LOCAL === 'true';
const COGNITO_LOGIN_URL = process.env.NEXT_PUBLIC_COGNITO_LOGIN_URL;
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

export default function ContestUnifiedClient({ 
  contest, 
  contestId 
}: { 
  contest: ContestDetailResponse; 
  contestId: string; 
}) {
  // --- State: Photos ---
  const [photos, setPhotos] = useState<PhotoDisplayResponse[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const size = 18;
  
  // --- State: User & Actions ---
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<number | null>(null);
  
  // --- State: Submit Modal ---
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitTitle, setSubmitTitle] = useState('');
  const [submitDescription, setSubmitDescription] = useState('');
  const [submitPreview, setSubmitPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isContestOpen = contest.status === "IN_PROGRESS";

  // ------------------------------------------
  // Effects
  // ------------------------------------------
  
  // 1. Fetch Photos
  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const res = await api.get<PhotoListResponse>(`/contests/${contestId}/photos`, {
        params: { page, size },
      });
      setPhotos(res.data.photoResponses);
      setTotalCount(res.data.totalCount);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestId, page]);

  // 2. Fetch User
  useEffect(() => {
    api.get<UserMeResponse>('/users/me')
       .then(res => setCurrentUserId(res.data.userId))
       .catch(() => setCurrentUserId(null));
  }, []);

  // ------------------------------------------
  // Handlers
  // ------------------------------------------

  // Open submit modal (Redirect if not logged in)
  const handleOpenSubmit = () => {
    if (!currentUserId) {
        if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname + window.location.search;
            window.localStorage.setItem('redirect_after_login', currentPath);
            
            if (COGNITO_LOGIN_URL) {
                window.location.href = COGNITO_LOGIN_URL;
            } else {
                window.location.href = '/login';
            }
        }
        return;
    }
    setIsSubmitOpen(true);
  };

  // Vote
  const handleVote = async (photoId: number) => {
    if (votingId) return;
    setVotingId(photoId);
    try {
      await api.post('/votes', { contestId: Number(contestId), photoId });
      setPhotos(prev => prev.map(p => p.photoId === photoId ? { ...p, totalVotes: p.totalVotes + 1 } : p));
      alert('投票しました！');
    } catch (err: unknown) {
       if (axios.isAxiosError(err) && err.response?.status === 409) {
        alert('既に投票済みです。');
       } else if (axios.isAxiosError(err) && err.response?.status === 401) {
        alert('ログインが必要です。');
       }
       else alert('投票に失敗しました。');
    } finally {
      setVotingId(null);
    }
  };

  // Submit Logic
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズは10MB以下にしてください。');
        return;
      }
      setSubmitFile(file);
      setSubmitPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitFile || !submitTitle) return;

    setIsSubmitting(true);

    try {
      console.log(`[Submit] Mode: ${IS_LOCAL ? 'Local' : 'Production'}`);

      if (IS_LOCAL) {
        const formData = new FormData();
        const requestDto = {
          contestId: Number(contestId),
          photoUrl: 'local',
          title: submitTitle,
          description: submitDescription,
        };

        formData.append(
          'request',
          new Blob([JSON.stringify(requestDto)], {
            type: 'application/json',
          })
        );
        formData.append('file', submitFile);

        await api.post('/photos', formData);

      } else {
        const mimeType = submitFile.type || 'application/octet-stream';
        const key = `contest-photos/${contestId}/${Date.now()}_${submitFile.name}`;

        const presignRes = await api.get<{ photoUrl: string; key: string }>('/upload/presigned-url', {
          params: {
            key,
            contentType: mimeType,
          },
        });

        const { photoUrl: uploadUrl, key: finalS3Key } = presignRes.data;

        await axios.put(uploadUrl, submitFile, {
          headers: {
            'Content-Type': mimeType,
          },
        });

        await api.post('/photos', {
          contestId: Number(contestId),
          title: submitTitle,
          description: submitDescription,
          photoUrl: finalS3Key,
        });
      }
      
      alert('投稿が完了しました！');
      setIsSubmitOpen(false);
      setSubmitFile(null);
      setSubmitTitle('');
      setSubmitDescription('');
      setSubmitPreview(null);
      setPage(0);
      fetchPhotos();

    } catch (error) {
      console.error(error);
      alert('投稿に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------------------------------
  // Render
  // ------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 pb-20">
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 transition-all">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Link href="/" className="font-bold text-xl tracking-tight text-black hover:text-gray-600 transition-colors">WalkFind</Link>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-medium text-black truncate max-w-[150px]">{contest.name}</span>
           </div>
           
           {isContestOpen && (
               <button
                 onClick={handleOpenSubmit}
                 className="bg-black text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition shadow-sm flex items-center gap-2"
               >
                 <span>+</span> <span className="hidden sm:inline">写真を投稿する</span>
               </button>
           )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 pt-24">
        
        {/* --- Hero Section --- */}
        <div className="py-10 md:py-14 text-center border-b border-gray-200 mb-10">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 ${
                isContestOpen ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
                <span className={`w-2 h-2 rounded-full ${isContestOpen ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}></span>
                {contest.status}
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">{contest.name}</h1>
            <p className="text-gray-500 max-w-xl mx-auto mb-6 text-sm md:text-base leading-relaxed">
                {contest.description}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 text-xs font-mono text-gray-500">
               <div className="px-3 py-1 bg-white border border-gray-200 rounded-sm">
                  Theme: <b className="text-black">{contest.theme}</b>
               </div>
               <div className="px-3 py-1 bg-white border border-gray-200 rounded-sm">
                  Total: <b className="text-black">{totalCount}</b> photos
               </div>
               <div className="px-3 py-1 bg-white border border-gray-200 rounded-sm">
                  End: <b className="text-black">{new Date(contest.endDate).toLocaleDateString()}</b>
               </div>
            </div>
        </div>

        {/* --- Photo Grid Section --- */}
        {loading ? (
           <div className="py-20 text-center">
             <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-black"></div>
           </div>
        ) : photos.length === 0 ? (
           <div className="py-20 text-center bg-white border border-dashed border-gray-300 rounded-xl">
             <p className="text-gray-500 mb-4">まだ何も見つかってないです。最初に見つけましょう!!</p>
             {isContestOpen && (
                <button onClick={handleOpenSubmit} className="text-blue-600 font-bold hover:underline">
                    あなたの写真を投稿する &rarr;
                </button>
             )}
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {photos.map((photo) => (
              <div key={photo.photoId} className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                {/* Image */}
                <div className="relative aspect-[4/3] bg-gray-100">
                   <Image
                      src={photo.photoUrl}
                      alt={photo.title}
                      fill
                      className="object-cover"
                      unoptimized
                   />
                   {/* Overlay Actions */}
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                       {/* Similarity Link */}
                       {(photo.similarityStatus === 'READY' || photo.status === 'READY') && currentUserId === photo.userId && (
                          <Link 
                            href={`/contests/${contestId}/photos/${photo.photoId}/similarity`}
                            className="bg-white/90 text-black px-4 py-2 rounded-full text-xs font-bold hover:bg-white hover:scale-105 transition"
                          >
                             🧭 Analysis
                          </Link>
                       )}
                   </div>
                </div>

                {/* Footer */}
                <div className="p-4">
                   <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 line-clamp-1">{photo.title}</h3>
                      <div className="flex items-center gap-1 text-xs font-mono bg-gray-50 px-2 py-1 rounded">
                         <span className="text-yellow-500">★</span> {photo.totalVotes}
                      </div>
                   </div>
                   
                   <div className="flex justify-between items-center mt-3">
                      
                      {/* ★ Link to User Profile */}
                      <Link 
                        href={`/users/${photo.userId}`}
                        className="text-xs text-gray-500 truncate max-w-[120px] hover:text-black hover:underline transition-colors"
                      >
                         by {photo.username}
                      </Link>
                      
                      {/* Vote Button */}
                      <button
                        onClick={() => handleVote(photo.photoId)}
                        disabled={!!votingId}
                        className={`
                           px-4 py-1.5 rounded-full text-xs font-bold transition-all border
                           ${votingId === photo.photoId
                             ? 'bg-gray-100 text-gray-400 border-transparent'
                             : 'bg-black text-white border-black hover:bg-gray-800 hover:shadow-lg active:scale-95'
                           }
                        `}
                      >
                         {votingId === photo.photoId ? 'Sending...' : 'Vote'}
                      </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {Math.ceil(totalCount / size) > 1 && (
            <div className="flex justify-center gap-2 mt-12">
               {Array.from({ length: Math.ceil(totalCount / size) }).map((_, i) => (
                   <button
                     key={i}
                     onClick={() => setPage(i)}
                     className={`w-8 h-8 rounded-full text-xs font-mono transition-colors ${
                        page === i ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                     }`}
                   >
                     {i + 1}
                   </button>
               ))}
            </div>
        )}
      </main>

      {/* --- Submit Modal --- */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0 z-10">
                 <h2 className="font-bold text-lg">写真を投稿する</h2>
                 <button onClick={() => setIsSubmitOpen(false)} className="text-gray-400 hover:text-black">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                 <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">Photo <span className="text-red-500">*</span></label>
                    <div 
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                            submitPreview ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                        }`}
                    >
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {submitPreview ? (
                            <div className="relative h-40 w-full">
                                <Image src={submitPreview} alt="Preview" fill className="object-contain" />
                            </div>
                        ) : (
                            <div className="text-gray-500">
                                <span className="text-2xl block mb-2">📸</span>
                                <span className="text-xs font-bold">Click to upload</span>
                            </div>
                        )}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">Title <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        value={submitTitle}
                        onChange={(e) => setSubmitTitle(e.target.value)}
                        placeholder="Enter a nice title..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition"
                        maxLength={50}
                        required
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">Description</label>
                    <textarea 
                        value={submitDescription}
                        onChange={(e) => setSubmitDescription(e.target.value)}
                        placeholder="Description (Optional)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition resize-none h-24"
                        maxLength={500}
                    />
                 </div>

                 <div className="pt-2">
                    <button 
                        type="submit" 
                        disabled={isSubmitting || !submitFile || !submitTitle}
                        className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                        {isSubmitting ? 'Uploading...' : 'Post Photo'}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Mobile FAB */}
      {isContestOpen && (
          <button
            onClick={handleOpenSubmit}
            className="md:hidden fixed bottom-6 right-6 z-40 bg-black text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-105 transition-transform"
          >
            +
          </button>
      )}

    </div>
  );
}