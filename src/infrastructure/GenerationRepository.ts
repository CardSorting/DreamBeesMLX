import { GenerationDetail } from '../domain/models/GenerationDetail';

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

export class GenerationRepository {
  public static async getGenerationById(id: string): Promise<GenerationDetail | null> {
    const repo = new GenerationRepository();
    return repo.getById(id);
  }

  public async getById(id: string): Promise<GenerationDetail> {
    if (window.electronAPI?.lite) {
      try {
        const generations = await window.electronAPI.lite.getGenerations(500);
        const match = generations.find((g: any) => g.id === id);
        if (match) {
          return {
            id: match.id,
            prompt: match.prompt || '',
            imageUrl: match.imageUrl || '',
            modelId: match.modelId || 'flux2-klein-4b',
            createdAt: match.createdAt || Date.now(),
          } as GenerationDetail;
        }
      } catch (err) {
        console.error('Local SQLite fetch error:', err);
      }
    }
    throw new Error(`Generation not found: ${id}`);
  }

  public async getAllGenerations(): Promise<GenerationDetail[]> {
    if (window.electronAPI?.lite) {
      try {
        const generations = await window.electronAPI.lite.getGenerations(500);
        return generations.map((g: any) => ({
          id: g.id,
          prompt: g.prompt || '',
          imageUrl: g.imageUrl || '',
          modelId: g.modelId || 'flux2-klein-4b',
          createdAt: g.createdAt || Date.now(),
        })) as GenerationDetail[];
      } catch (err) {
        console.error('Local SQLite fetch error:', err);
      }
    }
    return [];
  }
}
