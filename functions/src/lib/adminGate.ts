import { timingSafeEqual } from "node:crypto";
import { getAuth } from "firebase-admin/auth";

export type AdminAuthResult = {
    authorized: boolean;
    principal: string;
    reason?: string;
};

const safeEquals = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

/**
 * Authorize admin-only HTTP endpoints.
 * Accepts ADMIN_GENERATION_KEY header or Firebase Bearer token with admin role.
 */
export async function authorizeAdminRequest(
    req: { get?: (name: string) => string | undefined },
    envKeyName: "ADMIN_GENERATION_KEY" | "ADMIN_DIAGNOSTIC_KEY" = "ADMIN_GENERATION_KEY"
): Promise<AdminAuthResult> {
    const configuredKey = process.env[envKeyName];
    const suppliedKey = req.get?.("x-admin-generation-key") || req.get?.("x-admin-diagnostic-key");

    if (configuredKey && suppliedKey && safeEquals(String(suppliedKey), configuredKey)) {
        return { authorized: true, principal: envKeyName === "ADMIN_GENERATION_KEY" ? "admin-generation-key" : "diagnostic-key" };
    }

    const authorization = req.get?.("authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (tokenMatch) {
        try {
            const decoded = await getAuth().verifyIdToken(tokenMatch[1], true);
            const role = (decoded as { role?: string; admin?: boolean }).role || (decoded as { admin?: boolean }).admin;
            if (role === "admin" || role === true) {
                return { authorized: true, principal: decoded.uid || "firebase-admin-token" };
            }
            return { authorized: false, principal: decoded.uid || "firebase-token", reason: "missing-admin-claim" };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { authorized: false, principal: "bearer-token", reason: message.slice(0, 240) };
        }
    }

    if (!configuredKey) {
        return { authorized: false, principal: "anonymous", reason: `${envKeyName}_NOT_CONFIGURED` };
    }
    return { authorized: false, principal: "anonymous", reason: "missing-credentials" };
}
