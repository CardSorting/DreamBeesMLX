/**
 * [LAYER: INFRASTRUCTURE]
 */

import React from 'react';
import { IconDownload, IconShare, IconZap } from '@/icons';
import { downloadImage } from '@/lite-utils';

interface ActionToolbarProps {
    generationId: string;
    imageUrl?: string;
    prompt: string;
    modelId?: string;
    generationTime?: number;
}

export default function ActionToolbar({
    generationId,
    imageUrl,
    prompt,
    modelId,
    generationTime
}: ActionToolbarProps) {
    const handleDownload = () => {
        if (imageUrl) {
            downloadImage(imageUrl, `dreambees-${generationId}.png`);
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/generation/${generationId}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'DreamBees Generation',
                    text: prompt,
                    url: shareUrl
                });
            } catch {
                await navigator.clipboard.writeText(shareUrl);
            }
        } else {
            await navigator.clipboard.writeText(shareUrl);
        }
    };

    return (
        <div className="action-toolbar">
            <div className="toolbar-title">
                <IconZap size={22} />
                <h2>Quick Actions</h2>
            </div>

            <div className="toolbar-content">
                <div className="time-display">
                    <IconZap size={16} />
                    <span>Generation: {generationTime ? generationTime : '< 1m'}</span>
                </div>

                <div className="toolbar-divider"></div>

                <div className="action-list">
                    <button
                        className="action-button-full"
                        onClick={handleDownload}
                        disabled={!imageUrl}
                    >
                        <span>Download</span>
                        <IconDownload size={18} />
                    </button>

                    <button
                        className="action-button-full"
                        onClick={handleShare}
                    >
                        <span>Share</span>
                        <IconShare size={18} />
                    </button>
                </div>

                <div className="toolbar-info">
                    {modelId && (
                        <p className="info-text">
                            Created with <strong>{modelId}</strong>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
