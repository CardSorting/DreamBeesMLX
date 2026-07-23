import { Timestamp } from "firebase-admin/firestore";

export interface MarketMetrics {
    demand: number;
    velocity: number;
    popularity: number;
    totalTrades: number;
    allTimeHigh: number;
    allTimeLow: number;
    peakHype: number;
    priceDecayHalflife: number;
    marketMood: number;
    tradeDensity: number;
    priceDelta: number;
    lastPattern?: 'pump' | 'dump' | 'stable' | 'rally';
    recentPrices?: number[];
}

export interface ZapDerivative {
    id?: string;
    originalGenerationId: string;
    ownerId: string;
    collectionId?: string;
    imageUrl: string;
    prompt: string;
    name: string;
    symbol: string;
    totalSupply: number;
    circulatingSupply: number;
    currentPrice: number;
    basePrice: number;
    hypeMultiplier: number;
    volatilityFactor: number;
    fractionalOwnership: boolean;
    royaltyFee: number;
    phase: 'bonding' | 'live';
    status?: 'ACTIVE' | 'YELLOW' | 'RED';
    marketCap: number;
    liquidityTotal: number;
    launchConfig: {
        minReputation: number;
        vestingPeriod: number;
        maxPurchaseLimit: number;
    };

    vestingSchedule?: {
        lockupUntil: number;
        releaseRate: number;
    };
    createdAt: Timestamp | any;
    updatedAt?: Timestamp | any;
    metrics: MarketMetrics;
}

export interface ZapTrade {
    id?: string;
    derivativeId: string;
    buyerId: string;
    sellerId: string;
    amount: number;
    price: number;
    priceDelta: number;
    timestamp: Timestamp | any;
    type: 'buy' | 'sell';
    hypeAtTrade: number;
    marketMoodAtTrade: number;
    patternDetected: 'pump' | 'dump' | 'stable' | 'rally';
    botType?: string;
    trigger?: string;
    turbo?: boolean;
    latency?: number;
    signature?: string;
    nonce?: number;
}

export interface LimitOrder {
    id?: string;
    derivativeId: string;
    userId: string;
    amount: number;
    remainingAmount: number;
    price: number;
    type: 'buy' | 'sell';
    status: 'open' | 'filled' | 'cancelled' | 'partial' | 'dormant';
    orderType: 'limit' | 'market' | 'stop_loss' | 'take_profit';
    triggerPrice?: number;
    isMarket?: boolean;
    createdAt: Timestamp | any;
    signature?: string;
    nonce?: number;
}
