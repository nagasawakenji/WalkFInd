// src/types/index.ts

// コンテスト一覧用
export interface ContestResponse {
  contestId: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  thumbnailUrl?: string; // あれば
  status: ContestStatus;
  iconUrl?: string | null; 
}

// コンテスト詳細用
export interface ContestDetailResponse {
  contestId: number;
  name: string;
  theme: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'ENDED' | 'TALLYING';
  // その他、Java側のDTOにあるフィールドを追加
}

// 優勝作品表示用
export interface ContestWinnerDto {
  photoId: number;
  contestId: number;
  finalScore: number;
  title: string;
  photoUrl: string;
  username: string;
  userId: string;
  submissionDate: string;
}

export interface ContestWinnerListResponse {
  winners: ContestWinnerDto[];
  totalWinnerCount: number;
}

// 写真表示用
export interface PhotoDisplayResponse {
  photoId: number;
  title: string;
  username: string;
  totalVotes: number;
  presignedUrl: string; // S3の署名付きURL
  submissionDate: string;
}

export type ContestStatus =
| 'UPCOMING'
| 'IN_PROGRESS'
| 'CLOSED_VOTING'
| 'ANNOUNCED'

// 結果表示用
export interface ContestResultResponse {
  photoId: number;
  contestId: number;
  finalRank: number;
  finalScore: number;
  isWinner: boolean;
  title: string;
  photoUrl: string;
  username: string;
  userId: string;
  submissionDate: string;
}