import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chatWithMongoData } from './mongoChatService';

// Mock the environment variable
vi.mock('./mongoClient', () => ({
  getMongoClient: vi.fn(() => ({
    getDatabase: vi.fn(() => ({
      collection: vi.fn(() => ({
        find: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([]))
        }))
      }))
    }))
  }))
}));

// Mock fetch for OpenAI API calls
global.fetch = vi.fn();

describe('mongoChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock environment variable
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-key');
  });

  it('should handle empty search results gracefully', async () => {
    // Mock empty search results
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      })
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'No relevant data found.' } }]
      })
    });

    const result = await chatWithMongoData({
      query: 'test query',
      searchType: 'both',
      limit: 5
    });

    expect(result).toBe('No relevant data found.');
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

    await expect(chatWithMongoData({
      query: 'test query',
      searchType: 'jobs',
      limit: 5
    })).rejects.toThrow('API Error');
  });

  it('should handle different search types', async () => {
    // Mock successful API responses
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [{ embedding: [0.1, 0.2, 0.3] }]
      })
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Found relevant jobs.' } }]
      })
    });

    const result = await chatWithMongoData({
      query: 'software engineer',
      searchType: 'jobs',
      limit: 3
    });

    expect(result).toBe('Found relevant jobs.');
  });
}); 