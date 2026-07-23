/**
 * [LAYER: INFRASTRUCTURE]
 */

import React, { useEffect, useState } from 'react';
import { IconDownload, IconShare, IconZap, IconText } from '@/icons';
import { downloadImage, formatDuration, getOptimizedImageUrl } from '@/lite-utils';
import { toCssAspectRatio } from '@/lib/aspectRatios';
import type { GenerationDetail } from '@/domain/models/GenerationDetail';

interface ImmersiveHeroProps {
    generation: GenerationDetail;
    onCopyPrompt: () => void;
    onDownload: () => void;
    onShare: () => void;
}

export default function ImmersiveHero({
    generation,
    onCopyPrompt,
    onDownload,
    onShare
}: ImmersiveHeroProps) {
    const preview = generation.previewUrl as string | undefined;
    const primary = generation.imageUrl;
    const lowRes = getOptimizedImageUrl(preview || primary) || preview || primary;
    const highRes = getOptimizedImageUrl(primary) || primary;
    const aspectRatio = toCssAspectRatio(generation.parameters?.size);

    const [imgSrc, setImgSrc] = useState(lowRes);
    const [isHighResLoaded, setIsHighResLoaded] = useState(false);

    useEffect(() => {
        const currentPreview = generation.previewUrl as string | undefined;
        const currentPrimary = generation.imageUrl;
        const currentLowRes = getOptimizedImageUrl(currentPreview || currentPrimary) || currentPreview || currentPrimary;
        const currentHighRes = getOptimizedImageUrl(currentPrimary) || currentPrimary;

        setImgSrc(currentLowRes);
        setIsHighResLoaded(false);

        let img: HTMLImageElement | null = null;

        if (currentLowRes === currentHighRes) {
            setIsHighResLoaded(true);
            return;
        }

        img = new Image();
        img.src = currentHighRes;
        img.onload = () => {
            if (img) {
                img.onload = null;
                img.onerror = null;
            }
            setImgSrc(currentHighRes);
            setIsHighResLoaded(true);
        };
        img.onerror = () => {
            if (img) {
                img.onload = null;
                img.onerror = null;
            }
            setImgSrc(currentPrimary);
            setIsHighResLoaded(true);
        };

        return () => {
            if (img) {
                img.onload = null;
                img.onerror = null;
            }
        };
    }, [generation.imageUrl, generation.previewUrl]);

    return (
        <div className="immersive-hero">
            {/* Image container with generation time badge */}
            <div className="hero-image-container" style={{ aspectRatio }}>
                <div className="generation-time-badge">
                    <IconZap size={12} />
                    <span>{formatDuration(generation.generationTime || 0)}</span>
                </div>
                <img
                    src={imgSrc}
                    alt={generation.prompt}
                    className={`hero-image progressive-img ${isHighResLoaded ? 'loaded' : 'loading-blur'}`}
                    decoding="async"
                    onError={() => {
                        const fallback = generation.imageUrl;
                        if (imgSrc !== fallback) {
                            setImgSrc(fallback);
                            setIsHighResLoaded(true);
                        }
                    }}
                />
            </div>

            {/* Action buttons grid */}
            <div className="hero-actions">
                <button
                    onClick={onCopyPrompt}
                    className="action-button large"
                >
                    <IconText size={20} />
                    Copy Prompt
                </button>

                <button
                    onClick={onDownload}
                    className="action-button large includes"
                >
                    <IconDownload size={20} />
                    Download Image
                </button>

                <button
                    onClick={onShare}
                    className="action-button"
                >
                    <IconShare size={20} />
                    Share
                </button>
            </div>
        </div>
    );
}
