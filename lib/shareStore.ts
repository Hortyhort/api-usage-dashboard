import {
  createShareLink,
  getShareLinkByToken,
  getAllShareLinks,
  markShareLinkAccessed,
  revokeShareLink as dbRevokeShareLink,
  isShareLinkRevoked as dbIsShareLinkRevoked,
  cleanupExpiredShareLinks,
  type ShareLink,
} from './db';

export type ShareRecord = {
  token: string;
  createdAt: string;
  expiresAt: string;
  passwordProtected: boolean;
  lastUsedAt?: string;
  revokedAt?: string;
  accessCount?: number;
};

const mapToShareRecord = (link: ShareLink): ShareRecord => ({
  token: link.token,
  createdAt: link.createdAt,
  expiresAt: link.expiresAt,
  passwordProtected: link.passwordProtected,
  lastUsedAt: link.lastAccessedAt ?? undefined,
  revokedAt: link.revokedAt ?? undefined,
  accessCount: link.accessCount,
});

export const recordShareToken = async ({
  token,
  expiresAt,
  passwordProtected,
  createdBy,
}: {
  token: string;
  expiresAt: string;
  passwordProtected: boolean;
  createdBy?: string;
}): Promise<boolean> => {
  try {
    createShareLink({ token, expiresAt, passwordProtected, createdBy });
    return true;
  } catch (error) {
    console.error('Failed to record share token:', error);
    return false;
  }
};

export const markShareTokenUsed = async (token: string): Promise<boolean> => {
  return markShareLinkAccessed(token);
};

export const isShareTokenRevoked = async (token: string): Promise<boolean> => {
  return dbIsShareLinkRevoked(token);
};

export const revokeShareToken = async (token: string): Promise<boolean> => {
  return dbRevokeShareLink(token);
};

export const getShareTokenRecord = async (token: string): Promise<ShareRecord | null> => {
  const link = getShareLinkByToken(token);
  return link ? mapToShareRecord(link) : null;
};

export const getAllShareTokens = async (includeRevoked = false): Promise<ShareRecord[]> => {
  const links = getAllShareLinks(includeRevoked);
  return links.map(mapToShareRecord);
};

export const cleanupExpiredTokens = async (): Promise<number> => {
  return cleanupExpiredShareLinks();
};
