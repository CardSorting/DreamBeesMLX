/**
 * [LAYER: INFRASTRUCTURE]
 */

import React, { useState } from 'react';
import { IconText, IconDownload, IconChevronRight } from '@/icons';
import type { GenerationDetail } from '@/domain/models/GenerationDetail';
import { formatParameters } from '@/pages/GenerationDetail/MetadataFormatter';

interface PromptRevealProps {
    prompt: string;
    parameters: string;
    onClickCopy: () => void;
    copied: boolean;
}

export default function PromptReveal({
    prompt,
    parameters,
    onClickCopy,
    copied
}: PromptRevealProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClickCopy();
    };

    return (
        <div className="prompt-reveal">
            {/* Prompt section */}
            <div
                className="prompt-section"
                onClick={toggleExpand}
            >
                <div className="prompt-header">
                    <IconText size={18} />
                    <span className="prompt-label">Prompt</span>
                    <span className={copied ? 'copy-badge' : ''}>
                        {copied ? 'Copied!' : ''}
                    </span>
                </div>

                <div className="prompt-content">
                    <p className="prompt-text" title={prompt}>
                        {isExpanded ? prompt : `${prompt.slice(0, 200)}${prompt.length > 200 ? '...' : ''}`}
                    </p>
                    {prompt.length > 200 && (
                        <button className="expand-toggle">
                            {isExpanded ? 'Show less' : 'Show more'}
                            <IconChevronRight
                                size={16}
                                rotation={isExpanded ? 180 : 0}
                            />
                        </button>
                    )}
                </div>

                <IconDownload
                    size={20}
                    className="copy-icon"
                    onClick={handleCopy}
                />
            </div>

            {/* Parameters section */}
            <div className="parameters-section">
                <div className="parameters-header">
                    <IconText size={18} />
                    <span className="prompt-label">Parameters</span>
                </div>

                <div className="parameters-content">
                    <p className="parameters-text">
                        {parameters || 'No parameters specified'}
                    </p>
                </div>
            </div>
        </div>
    );
}