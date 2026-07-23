import React, { useEffect, useState } from 'react';
import { getOptimizedImageUrl } from '../lite-utils';
import './PreviewImage.css';

interface PreviewImageProps {
    src: string;
    alt?: string;
    className?: string;
    loading?: 'lazy' | 'eager';
}

/** CDN-optimized image with automatic fallback to raw URL */
export default function PreviewImage({
    src,
    alt = '',
    className = '',
    loading = 'lazy',
}: PreviewImageProps) {
    const [resolved, setResolved] = useState(() => getOptimizedImageUrl(src) || src);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        setResolved(getOptimizedImageUrl(src) || src);
        setIsLoaded(false);
    }, [src]);

    if (!src) return null;

    return (
        <>
            <img
                src={resolved}
                alt={alt}
                className={`${className} preview-fade-img ${isLoaded ? 'loaded' : ''}`}
                loading={loading}
                decoding="async"
                onLoad={() => setIsLoaded(true)}
                onError={() => {
                    if (resolved !== src) setResolved(src);
                }}
            />
        </>
    );
}
