import { logger, getS3Client } from "../lib/utils.js";
import { B2_BUCKET } from "../lib/constants.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * Cleanup worker task to delete B2 files and Firestore documents
 */
export const processCleanupTasks = async (req: { data: any }): Promise<void> => {
    const { cleanupType, ...data } = req.data;

    logger.info(`Starting cleanup task: ${cleanupType}`, { data });

    if (cleanupType === 'image') {
        const { imageId, imageUrl, thumbnailUrl } = data;
        const filesToDelete: string[] = [];
        if (imageUrl) { filesToDelete.push(imageUrl); }
        if (thumbnailUrl) { filesToDelete.push(thumbnailUrl); }

        if (filesToDelete.length === 0) { return; }

        try {
            const s3 = await getS3Client();
            const deletePromises = filesToDelete.map(url => {
                const parts = url.split(`${B2_BUCKET}/`);
                if (parts.length < 2) { return Promise.resolve(); }
                const key = parts[1];
                return s3.send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
            });

            await Promise.all(deletePromises);
            logger.info(`Deleted ${filesToDelete.length} B2 files for image ${imageId}`);
        } catch (error: any) {
            logger.error(`Failed to delete B2 files for image ${imageId}`, error);
        }
    }
};
