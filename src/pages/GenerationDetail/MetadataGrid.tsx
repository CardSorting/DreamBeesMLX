/**
 * [LAYER: INFRASTRUCTURE]
 */

import React from 'react';
import { IconImage, IconLayers, IconZap, IconUser } from '@/icons';
import type { GenerationDetail } from '@/domain/models/GenerationDetail';
import { getMetadataItems } from '@/pages/GenerationDetail/MetadataFormatter';

interface MetadataGridProps {
    generation: GenerationDetail;
}

interface MetadataItem {
    label: string;
    value: string;
    type: 'id' | 'model' | 'user' | 'time' | 'status' | 'view';
}

export default function MetadataGrid({ generation }: MetadataGridProps) {
    const items: MetadataItem[] = getMetadataItems(generation);

    return (
        <div className="metadata-grid">
            <div className="metadata-header">
                <IconLayers size={20} />
                <h2>Generation Data</h2>
            </div>

            <div className="metadata-content">
                {items.map((item, index) => (
                    <div key={index} className="metadata-item">
                        <div className="metadata-icon">
                            {getMetadataIcon(item.type)}
                        </div>
                        <div>
                            <span className="metadata-label">{item.label}</span>
                            <div className="metadata-value">{item.value}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getMetadataIcon(type: MetadataItem['type']) {
    switch (type) {
        case 'id':
            return <IconImage size={18} />;
        case 'model':
            return <IconLayers size={18} />;
        case 'user':
            return <IconUser size={18} />;
        case 'time':
            return <IconZap size={18} />;
        default:
            return <IconImage size={18} />;
    }
}