import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, type NavigateFunction } from 'react-router-dom';
import { useLite } from '../contexts/LiteContext';
import './ModelFeed.css';
import { getOptimizedImageUrl, getModelMetadata, type AIModel } from '../lite-utils';
import { IconImage, IconMagic, IconSparkles, IconUser, IconZap } from '../icons';

type CategoryId = 'all' | 'beginner' | 'realistic' | 'illustration' | 'creative';

interface ModelProfile {
    category: CategoryId;
    categoryLabel: string;
    bestFor: string;
    plainTag: string;
    isRecommended: boolean;
}

const categoryOptions: Array<{ id: CategoryId; label: string }> = [
    { id: 'all', label: 'All Styles' },
    { id: 'beginner', label: 'Beginner Friendly' },
    { id: 'realistic', label: 'Realistic' },
    { id: 'illustration', label: 'Illustration' },
    { id: 'creative', label: 'Creative' }
];

function getModelProfile(model: AIModel): ModelProfile {
    const meta = getModelMetadata(model);
    const text = `${model.name} ${model.description}`.toLowerCase();
    const isRealistic = ['real', 'photo', 'portrait', 'product', 'cinematic'].some(word => text.includes(word));
    const isIllustration = ['anime', 'illustr', 'cartoon', 'paint', 'draw', 'sketch', 'manga', 'wai'].some(word => text.includes(word));
    const isCreative = !isRealistic && !isIllustration;

    if (meta.isFlagship || text.includes('beginner') || text.includes('easy')) {
        return {
            category: 'beginner',
            categoryLabel: 'Beginner friendly',
            bestFor: meta.isFlagship ? 'A strong default for detailed prompts and polished results.' : meta.insight,
            plainTag: 'Recommended',
            isRecommended: true
        };
    }

    if (isRealistic) {
        return {
            category: 'realistic',
            categoryLabel: 'Realistic',
            bestFor: 'Photo-like images, portraits, products, lighting, and crisp detail.',
            plainTag: 'Photo style',
            isRecommended: false
        };
    }

    if (isIllustration) {
        return {
            category: 'illustration',
            categoryLabel: 'Illustration',
            bestFor: 'Drawn, anime, painted, character, and storybook-style images.',
            plainTag: 'Art style',
            isRecommended: false
        };
    }

    return {
        category: isCreative ? 'creative' : 'all',
        categoryLabel: 'Creative',
        bestFor: meta.insight || 'Stylized images, unusual concepts, and creative exploration.',
        plainTag: 'Creative',
        isRecommended: false
    };
}

function selectModel(model: AIModel, currentUser: unknown, setSelectedModel: (model: AIModel) => void, navigate: NavigateFunction) {
    localStorage.setItem('lite_selected_model', model.id);
    if (!currentUser) {
        navigate('/auth');
        return;
    }
    setSelectedModel(model);
    navigate('/generate');
}

export default function ModelFeed() {
    const { availableModels, setSelectedModel, selectedModel, currentUser, modelsError } = useLite();
    const navigate = useNavigate();
    const [activeCategory, setActiveCategory] = useState<CategoryId>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 150);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const cleanModels = useMemo(() => {
        return availableModels.filter(model => {
            const name = model.name.toLowerCase();
            return !name.includes('test') && !name.includes('draft') && !model.id.includes('hallucinated');
        });
    }, [availableModels]);

    const recommendedModel = useMemo(() => {
        return selectedModel || cleanModels.find(model => getModelProfile(model).isRecommended) || cleanModels[0] || null;
    }, [cleanModels, selectedModel]);

    const visibleModels = useMemo(() => {
        const query = debouncedQuery.trim().toLowerCase();
        return cleanModels.filter(model => {
            const profile = getModelProfile(model);
            const matchesCategory = activeCategory === 'all' || profile.category === activeCategory || (activeCategory === 'beginner' && profile.isRecommended);
            const matchesSearch = !query || `${model.name} ${model.description} ${profile.categoryLabel} ${profile.bestFor}`.toLowerCase().includes(query);
            return matchesCategory && matchesSearch;
        });
    }, [activeCategory, cleanModels, debouncedQuery]);

    const selectedProfile = selectedModel ? getModelProfile(selectedModel) : null;

    return (
        <div className="model-picker-page fade-in">
            <div className="model-picker-mesh" aria-hidden="true">
                <div className="mesh-orb orb-one" />
                <div className="mesh-orb orb-two" />
                <div className="mesh-orb orb-three" />
            </div>

            <header className="model-picker-topbar" aria-label="Model selection header">
                <div>
                    <nav className="breadcrumbs" aria-label="Breadcrumb">
                        <span>Explore</span>
                        <span>/</span>
                        <span>Styles</span>
                    </nav>
                    <h1>Choose a style</h1>
                    <p>
                        {selectedModel 
                            ? `Active style: ${selectedModel.name}. Choose another style below.` 
                            : 'Select a visual direction for your next creation.'}
                    </p>
                </div>

                <div className="topbar-actions" aria-label="Model search and status">
                    {selectedModel && (
                        <div className="active-style-pill" aria-label={`Active style: ${selectedModel.name}`}>
                            <IconSparkles size={12} />
                            <span>{selectedModel.name}</span>
                        </div>
                    )}
                    <label className="search-box" htmlFor="model-search">
                        <input
                            id="model-search"
                            value={searchQuery}
                            onChange={event => setSearchQuery(event.target.value)}
                            placeholder="Search styles..."
                            type="search"
                        />
                        <span className="styles-count">{visibleModels.length} styles</span>
                    </label>
                </div>
            </header>

            <section className="browse-panel" aria-labelledby="browse-heading">

                <div className="category-tabs" role="tablist" aria-label="Filter image styles">
                    {categoryOptions.map(option => (
                        <button
                            type="button"
                            key={option.id}
                            role="tab"
                            aria-selected={activeCategory === option.id}
                            className={activeCategory === option.id ? 'active' : ''}
                            onClick={() => setActiveCategory(option.id)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {availableModels.length === 0 && modelsError ? (
                    <EmptyState
                        title="Styles failed to load"
                        body={`DreamBees couldn’t load styles yet. ${modelsError}`}
                        actionLabel="Try again"
                        onAction={() => window.location.reload()}
                    />
                ) : availableModels.length === 0 ? (
                    <EmptyState
                        title="Preparing styles"
                        body="DreamBees is loading your available styles. They will appear here automatically."
                    />
                ) : visibleModels.length === 0 ? (
                    <EmptyState
                        title="No styles match that search"
                        body="Try a simpler word like photo, anime, product, portrait, or clear the filters."
                        actionLabel="Clear search and filters"
                        onAction={() => {
                            setSearchQuery('');
                            setActiveCategory('all');
                        }}
                    />
                ) : (
                    <div className="models-grid">
                        {visibleModels.map((model, idx) => (
                            <ModelCard
                                key={model.id}
                                model={model}
                                idx={idx}
                                selectedModel={selectedModel}
                                currentUser={currentUser}
                                setSelectedModel={setSelectedModel}
                                navigate={navigate}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
    return (
        <div className="empty-state">
            <div>
                <div className="empty-state-icon"><IconMagic size={34} /></div>
                <h3>{title}</h3>
                <p>{body}</p>
                {actionLabel && onAction && <button type="button" onClick={onAction}>{actionLabel}</button>}
            </div>
        </div>
    );
}

const getBaseZapCost = (modelId: string): string => {
    if (modelId === 'flux-2-klein-9b') return 'Free';
    if (['wai-illustrious', 'nova-3d-cg-xl'].includes(modelId)) return '1.0 Zap';
    if (modelId === 'anima') return '0.25 Zap';
    return '0.5 Zap';
};

function ModelCard({
    model,
    idx,
    selectedModel,
    setSelectedModel,
    currentUser,
    navigate
}: {
    model: AIModel;
    idx: number;
    selectedModel: AIModel | null;
    setSelectedModel: (model: AIModel) => void;
    currentUser: unknown;
    navigate: NavigateFunction;
}) {
    const profile = useMemo(() => getModelProfile(model), [model]);
    const isSelected = selectedModel?.id === model.id;
    const handleSelect = () => selectModel(model, currentUser, setSelectedModel, navigate);
    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleSelect();
        }
    };

    return (
        <article
            className={`style-card glass-immersive ${isSelected ? 'selected' : ''} ${model.id === 'flux-2-klein-9b' ? 'highlighted-free-offer' : ''}`}
            onClick={handleSelect}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => import('./Generator')}
            role="button"
            tabIndex={0}
            aria-label={`Use ${model.name} style`}
        >
            <div className="style-visual">
                <img 
                    src={getOptimizedImageUrl(model.image) || ''} 
                    alt={`${model.name} preview`} 
                    loading={idx < 4 ? 'eager' : 'lazy'}
                    fetchPriority={idx < 2 ? 'high' : 'auto'}
                    decoding="async" 
                />
                <div className="style-badges">
                    {isSelected ? (
                        <span className="badge selected-badge"><IconMagic size={10} fill="currentColor" /> Selected</span>
                    ) : (
                        <span className={`badge cost-badge ${model.id === 'flux-2-klein-9b' ? 'free-badge' : ''}`}>
                            <IconZap size={10} /> {getBaseZapCost(model.id)}
                        </span>
                    )}
                    {profile.isRecommended && <span className="badge recommended-badge">Recommended</span>}
                </div>
            </div>

            <div className="style-content">
                <div>
                    <span className="style-eyebrow">{profile.plainTag}</span>
                    <h3>{model.name}</h3>
                    {model.id === 'flux-2-klein-9b' && (
                        <div className="free-refresh-notice">
                            ⚡ Free 5-hour refill offer
                        </div>
                    )}
                </div>
                <p className="style-description">{model.description}</p>
                <div className="style-best-for">
                    <IconSparkles size={13} />
                    <span><strong>Best for:</strong> {profile.bestFor}</span>
                </div>
                <button
                    type="button"
                    className="use-style-btn"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleSelect();
                    }}
                >
                    {isSelected ? 'Continue with this style' : 'Use this style'}
                </button>
            </div>
        </article>
    );
}
