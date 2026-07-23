import { Timestamp } from "firebase-admin/firestore";
import { CallableRequest } from "firebase-functions/v2/https";

export interface UserProfile {
    uid: string;
    username?: string;
    displayName?: string;
    isPro?: boolean;
    birthday?: string;
    createdAt?: Timestamp;
    tokens?: number;
    subId?: string;
    [key: string]: any;
}

export interface GenerationJob {
    id: string;
    userId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    type?: string;
    modelId?: string;
    prompt?: string;
    imageUrl?: string;
    resultImageId?: string;
    createdAt: Timestamp | Date | string;
    error?: string;
    hidden?: boolean;
    [key: string]: any;
}

export interface RequestWithAuth<T = any> extends CallableRequest<T> {
    auth: NonNullable<CallableRequest<T>["auth"]>;
}

export interface ApiHandlerResponse {
    success?: boolean;
    error?: string;
    [key: string]: any;
}
