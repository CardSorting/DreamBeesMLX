import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getOptimizedImageUrl, optimizeImageUrl, observeElement } from '../lite-utils';
import { historyThumbUrl, canonicalGenerationRouteId } from '../lib/generationFlow';

interface PictureThumbProps {
    item: {
        id: string;
        prompt?: string;
        imageUrl: string;
        thumbnailUrl?: string;
        previewUrl?: string;
        lqip?: string;
        [key: string]: unknown;
    };
    className?: string;
    showCaption?: boolean;
}

export default function PictureThumb({ item, className = 'picture-card', showCaption = true }: PictureThumbProps) {
    const rawThumb = historyThumbUrl(item);
    
    const getFinalThumb = (url: string) => {
        const optimized = getOptimizedImageUrl(url) || url || '';
        if (optimized && optimized.startsWith('http')) {
            return optimizeImageUrl(optimized, 'thumbnail');
        }
        return optimized;
    };

    const [src, setSrc] = useState(() => getFinalThumb(rawThumb));
    const [isInView, setIsInView] = useState(false);
    const [containerEl, setContainerEl] = useState<HTMLAnchorElement | null>(null);

    useEffect(() => {
        const next = historyThumbUrl(item);
        setSrc(getFinalThumb(next));
    }, [item.imageUrl, item.thumbnailUrl, item.previewUrl, item.lqip]);

    useEffect(() => {
        if (!containerEl) return;

        return observeElement(containerEl, (isIntersecting) => {
            setIsInView(isIntersecting);
        }, '300px');
    }, [containerEl]);

    const handleMouseEnter = () => {
        // Prefetch JS code for the detail view immediately (lightweight)
        void import('../pages/GenerationDetail');
    };

    if (!item.imageUrl) return null;

    const routeId = canonicalGenerationRouteId(item);

    return (
        <Link
            ref={setContainerEl}
            to={`/generation/${routeId}`}
            state={{ generation: item }}
            className={className}
            onMouseEnter={handleMouseEnter}
        >
            {isInView ? (
                <>
                    <img
                        src={src}
                        alt={item.prompt || 'Your picture'}
                        loading="lazy"
                        decoding="async"
                        onError={() => {
                            const fallback = item.imageUrl;
                            if (src !== fallback) setSrc(fallback);
                        }}
                    />
                    {showCaption && item.prompt ? <span>{item.prompt}</span> : null}
                </>
            ) : (
                <>
                    <div className="picture-card-skeleton-media" aria-hidden="true" />
                    {showCaption && item.prompt ? (
                        <span className="picture-card-skeleton-text" aria-hidden="true">
                            <span className="skeleton-text-bar" />
                        </span>
                    ) : null}
                </>
            )}
        </Link>
    );
}
