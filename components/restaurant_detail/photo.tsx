'use client';

import Image from 'next/image';

interface RestaurantImageProps {
  imageName: string; // 예: 'burger.jpg'
  alt?: string;      // 접근성을 위한 대체 텍스트
}

export default function RestaurantImage({ imageName, alt }: RestaurantImageProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg mb-6">
      <Image
        src={`/image/${imageName}`} // public/image 폴더 기준
        alt={alt ?? '레스토랑 이미지'}
        layout="fill"
        objectFit="cover"
        priority
      />
    </div>
  );
}