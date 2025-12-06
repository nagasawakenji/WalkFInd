'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Props {
  iconUrl?: string | null;
  size?: number;
}

export default function ContestIcon({ iconUrl, size = 80 }: Props) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    console.log('[ContestIcon] iconUrl =', iconUrl);
  }, [iconUrl]);

  const fallbackEmoji = (
    <span
      className="mb-3 group-hover:scale-110 transition-transform"
      style={{ fontSize: size * 0.8 }} // だいたいアイコンと同じくらいの見た目に
    >
      📷
    </span>
  );

  if (!iconUrl || imgError) {
    return fallbackEmoji;
  }

  return (
    <Image
      src={iconUrl}
      alt="contest icon"
      width={size}
      height={size}
      className="mb-3 group-hover:scale-110 transition-transform"
      onError={() => {
        console.error('[ContestIcon] image load error for', iconUrl);
        setImgError(true);
      }}
      unoptimized={true} // S3 の presigned URL 用
    />
  );
}