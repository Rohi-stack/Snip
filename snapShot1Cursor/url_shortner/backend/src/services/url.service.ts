import { UrlStatus } from '@prisma/client';
import { HTTP } from '../constants/http.js';
import {
  DEFAULT_USER_TIER,
  TIER_LIMITS,
  type UserTier,
} from '../constants/url-tier.js';
import {
  mapPrismaErrorToAppError,
  urlRepository,
} from '../repositories/url.repository.js';
import { AppError } from '../types/app-error.js';
import type {
  CreateUrlInput,
  CreateUrlRecordInput,
  CreateUrlResult,
  PersistedUrl,
} from '../types/url.types.js';
import { calculateExpiresAt } from '../utils/calculate-expiry.js';
import { generateShortCode } from '../utils/generate-short-code.js';
import { normalizeUrl } from '../utils/normalize-url.js';
import { isPrismaUniqueConstraintError } from '../utils/prisma-errors.js';
import { isValidHttpUrl } from '../utils/validate-url.js';

const MAX_SHORT_CODE_ATTEMPTS = 5;

function resolveTier(tier?: UserTier): UserTier {
  return tier ?? DEFAULT_USER_TIER;
}

function assertOriginalUrlPresent(value: unknown): asserts value is string {
  if (value === undefined || value === null) {
    throw new AppError(
      HTTP.BAD_REQUEST,
      'originalUrl is required',
      'MISSING_ORIGINAL_URL',
    );
  }
  if (typeof value !== 'string') {
    throw new AppError(
      HTTP.BAD_REQUEST,
      'originalUrl must be a string',
      'INVALID_ORIGINAL_URL_TYPE',
    );
  }
  if (!value.trim()) {
    throw new AppError(
      HTTP.BAD_REQUEST,
      'originalUrl cannot be empty',
      'EMPTY_ORIGINAL_URL',
    );
  }
}

function assertCreatorIp(creatorIp: string): void {
  if (!creatorIp?.trim()) {
    throw new AppError(
      HTTP.BAD_REQUEST,
      'creatorIp is required',
      'MISSING_CREATOR_IP',
    );
  }
}

function toCreateUrlResult(
  row: PersistedUrl,
  tier: UserTier,
  maxUrlsPerDay: number,
): CreateUrlResult {
  return {
    id: row.id,
    originalUrl: row.originalUrl,
    shortCode: row.shortCode,
    expiresAt: row.expiresAt.toISOString(),
    status: row.status,
    tier,
    quotaLimitPerDay: maxUrlsPerDay,
    clickCount: row.clickCount,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * URL creation orchestration — validation, rules, then repository persistence.
 */
export const urlService = {
  async createUrl(input: CreateUrlInput): Promise<CreateUrlResult> {
    assertOriginalUrlPresent(input.originalUrl);
    assertCreatorIp(input.creatorIp);

    const tier = resolveTier(input.tier);
    const normalizedUrl = normalizeUrl(input.originalUrl);

    if (!isValidHttpUrl(normalizedUrl)) {
      throw new AppError(
        HTTP.BAD_REQUEST,
        'originalUrl must be a valid http or https URL',
        'INVALID_URL_FORMAT',
      );
    }

    const expiresAt = calculateExpiresAt(tier);
    const { maxUrlsPerDay } = TIER_LIMITS[tier];

    const basePayload: Omit<CreateUrlRecordInput, 'shortCode'> = {
      userId: input.userId ?? null,
      originalUrl: normalizedUrl,
      expiresAt,
      status: UrlStatus.ACTIVE,
      creatorIp: input.creatorIp,
      creatorUserAgent: input.creatorUserAgent ?? null,
    };

    // TODO: check daily quota (DailyUrlUsage repository)

    for (let attempt = 0; attempt < MAX_SHORT_CODE_ATTEMPTS; attempt++) {
      const shortCode = generateShortCode();

      try {
        const persisted = await urlRepository.create({
          ...basePayload,
          shortCode,
        });

        return toCreateUrlResult(persisted, tier, maxUrlsPerDay);
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          continue;
        }
        throw mapPrismaErrorToAppError(error);
      }
    }

    throw new AppError(
      HTTP.INTERNAL,
      'Could not generate a unique short code',
      'SHORT_CODE_COLLISION',
    );
  },
};
