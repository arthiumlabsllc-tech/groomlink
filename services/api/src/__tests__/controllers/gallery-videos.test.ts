import { mockPrisma } from '../mocks/prisma';

// Mock Logger
jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

// Mock upload service (no real Cloudinary calls)
const mockDeleteVideo = jest.fn().mockResolvedValue(true);
const mockDeleteImage = jest.fn().mockResolvedValue(true);
const mockExtractPublicId = jest.fn((url: string) => `public-id-of-${url}`);
jest.mock('../../services/upload.service', () => ({
  uploadService: {
    deleteVideo: (...args: any[]) => mockDeleteVideo(...args),
    deleteImage: (...args: any[]) => mockDeleteImage(...args),
    extractPublicId: (url: string) => mockExtractPublicId(url),
  },
}));

// Import after mocks
import uploadController from '../../controllers/upload.controller';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides: Record<string, any> = {}): any => ({
  params: { salonId: 'salon-1' },
  body: {},
  files: [],
  user: { id: 'owner-1', role: 'SALON_OWNER' },
  ...overrides,
});

describe('Salon Gallery Videos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadSalonGalleryVideo', () => {
    it('returns 400 when no files are provided', async () => {
      const res = mockRes();
      await uploadController.uploadSalonGalleryVideo(mockReq({ files: [] }), res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it('returns 404 when salon is not found or not owned by user', async () => {
      mockPrisma.salon.findFirst.mockResolvedValue(null);
      const res = mockRes();

      await uploadController.uploadSalonGalleryVideo(
        mockReq({ files: [{ path: 'https://res.cloudinary.com/x/video/upload/v1.mp4' }] }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('appends new video URLs to the salon gallery', async () => {
      mockPrisma.salon.findFirst.mockResolvedValue({ videos: ['v1'] });
      mockPrisma.salon.update.mockResolvedValue({});
      const res = mockRes();

      await uploadController.uploadSalonGalleryVideo(
        mockReq({ files: [{ path: 'v2' }, { path: 'v3' }] }),
        res
      );

      expect(mockPrisma.salon.update).toHaveBeenCalledWith({
        where: { id: 'salon-1' },
        data: { videos: ['v1', 'v2', 'v3'] },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalVideos: 3, videos: ['v2', 'v3'] }),
        })
      );
    });

    it('caps the gallery at 5 videos', async () => {
      mockPrisma.salon.findFirst.mockResolvedValue({ videos: ['v1', 'v2', 'v3'] });
      mockPrisma.salon.update.mockResolvedValue({});
      const res = mockRes();

      await uploadController.uploadSalonGalleryVideo(
        mockReq({ files: [{ path: 'v4' }, { path: 'v5' }, { path: 'v6' }] }),
        res
      );

      expect(mockPrisma.salon.update).toHaveBeenCalledWith({
        where: { id: 'salon-1' },
        data: { videos: ['v1', 'v2', 'v3', 'v4', 'v5'] },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalVideos: 5 }),
        })
      );
    });
  });

  describe('deleteGalleryVideo', () => {
    it('returns 400 when videoUrl is missing', async () => {
      const res = mockRes();
      await uploadController.deleteGalleryVideo(mockReq({ body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when salon is not found or not owned by user', async () => {
      mockPrisma.salon.findFirst.mockResolvedValue(null);
      const res = mockRes();

      await uploadController.deleteGalleryVideo(
        mockReq({ body: { videoUrl: 'v1' } }),
        res
      );

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('removes the video and destroys it on Cloudinary with video resource type', async () => {
      mockPrisma.salon.findFirst.mockResolvedValue({ videos: ['v1', 'v2'] });
      mockPrisma.salon.update.mockResolvedValue({});
      const res = mockRes();

      await uploadController.deleteGalleryVideo(
        mockReq({ body: { videoUrl: 'v1' } }),
        res
      );

      expect(mockPrisma.salon.update).toHaveBeenCalledWith({
        where: { id: 'salon-1' },
        data: { videos: ['v2'] },
      });
      expect(mockExtractPublicId).toHaveBeenCalledWith('v1');
      expect(mockDeleteVideo).toHaveBeenCalledWith('public-id-of-v1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ remainingVideos: 1 }),
        })
      );
    });
  });

  describe('uploadSalonGallery (image cap)', () => {
    it('caps the gallery at 20 images', async () => {
      const existing = Array.from({ length: 19 }, (_, i) => `img${i}`);
      mockPrisma.salon.findFirst.mockResolvedValue({ images: existing });
      mockPrisma.salon.update.mockResolvedValue({});
      const res = mockRes();

      await uploadController.uploadSalonGallery(
        mockReq({ files: [{ path: 'imgA' }, { path: 'imgB' }, { path: 'imgC' }] }),
        res
      );

      const updateCall = mockPrisma.salon.update.mock.calls[0][0];
      expect(updateCall.data.images).toHaveLength(20);
      expect(updateCall.data.images[19]).toBe('imgA');
    });
  });
});
