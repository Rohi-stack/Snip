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
import { dailyUsageRepository } from '../repositories/daily-usage.repository.js';
import { aliasRepository } from '../repositories/alias.repository.js';
import { subscriptionService } from './subscription.service.js';
import { RESERVED_ALIASES } from '../constants/reserved-aliases.js';
import { prisma } from '../prisma/client.js';
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

const ALIAS_REGEX = /^[a-z0-9-]+$/;
const MIN_LENGTH = 4;
const MAX_LENGTH = 30;

function validateAliasFormat(alias: string): void {
  if (alias.length < MIN_LENGTH || alias.length > MAX_LENGTH) {
    throw new AppError(HTTP.BAD_REQUEST, `Alias must be between ${MIN_LENGTH} and ${MAX_LENGTH} characters`, 'INVALID_ALIAS_LENGTH');
  }
  if (!ALIAS_REGEX.test(alias)) {
    throw new AppError(HTTP.BAD_REQUEST, 'Alias can only contain lowercase letters, numbers, and hyphens', 'INVALID_ALIAS_FORMAT');
  }
  if (RESERVED_ALIASES.has(alias)) {
    throw new AppError(HTTP.FORBIDDEN, 'This alias is reserved', 'RESERVED_ALIAS');
  }
}

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
  customShortCode?: string,
): CreateUrlResult {
  return {
    id: row.id,
    originalUrl: row.originalUrl,
    shortCode: customShortCode ?? row.shortCode,
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

    // Validate alias if provided
    let aliasStr: string | undefined = undefined;
    let existingAlias: any = null;
    if (input.alias) {
      if (!input.userId) {
        throw new AppError(HTTP.UNAUTHORIZED, 'Premium subscription required to create aliases', 'PREMIUM_REQUIRED');
      }

      // Check premium entitlement
      const isPremium = await subscriptionService.checkEntitlement(input.userId);
      if (!isPremium) {
        throw new AppError(HTTP.FORBIDDEN, 'Premium subscription required to create aliases', 'PREMIUM_REQUIRED');
      }

      aliasStr = input.alias.toLowerCase().trim();
      validateAliasFormat(aliasStr);

      // Verify the alias is not already taken in URL short codes space
      const existingUrl = await urlRepository.findByShortCode(aliasStr);
      if (existingUrl) {
        throw new AppError(HTTP.CONFLICT, 'Alias is already taken', 'ALIAS_TAKEN');
      }

      // Verify the alias is not already taken/active in Alias space
      existingAlias = await aliasRepository.findAlias(aliasStr);
      if (existingAlias) {
        const now = new Date();
        const isReleased = existingAlias.status === 'RELEASED' && existingAlias.reuseAllowed && existingAlias.reuseAfter && existingAlias.reuseAfter < now;
        if (!isReleased) {
          throw new AppError(HTTP.CONFLICT, 'Alias is already taken', 'ALIAS_TAKEN');
        }
      }
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

    // Use a deterministic UTC date for the quota bucket
    const now = new Date();
    const usageDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    // Wrap quota tracking and URL creation in a single transaction
    return prisma.$transaction(async (tx) => {
      const bucket = await dailyUsageRepository.upsertUsageAndReturn({
        userId: input.userId ?? null,
        creatorIp: input.creatorIp,
        usageDate,
      }, tx);

      if (bucket.count > maxUrlsPerDay) {
        throw new AppError(
          HTTP.TOO_MANY_REQUESTS,
          `Daily limit of ${maxUrlsPerDay} URLs exceeded.`,
          'QUOTA_EXCEEDED'
        );
      }

      for (let attempt = 0; attempt < MAX_SHORT_CODE_ATTEMPTS; attempt++) {
        const shortCode = generateShortCode();

        try {
          const persisted = await urlRepository.create({
            ...basePayload,
            shortCode,
          }, tx);

          if (aliasStr) {
            const nowTime = new Date();
            if (existingAlias && existingAlias.status === 'RELEASED') {
              await aliasRepository.updateAlias(aliasStr, {
                currentUrlId: persisted.id,
                status: 'ACTIVE',
                createdByUserId: input.userId!,
                firstUsedAt: nowTime,
                lastUsedAt: nowTime,
                reuseAllowed: false,
                reuseAfter: null,
              }, tx);
            } else {
              await aliasRepository.createAlias({
                alias: aliasStr,
                currentUrlId: persisted.id,
                createdByUserId: input.userId!,
                firstUsedAt: nowTime,
                lastUsedAt: nowTime,
                status: 'ACTIVE',
              }, tx);
            }
          }

          return toCreateUrlResult(persisted, tier, maxUrlsPerDay, aliasStr);
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
    });
  },

  async listUserUrls(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<{ urls: CreateUrlResult[]; total: number; page: number; pageSize: number }> {
    const skip = (page - 1) * pageSize;
    const { rows, total } = await urlRepository.listByUserId(userId, { skip, take: pageSize });

    const tier = resolveTier('registered');
    const { maxUrlsPerDay } = TIER_LIMITS[tier];

    return {
      urls: rows.map((r) => toCreateUrlResult(r, tier, maxUrlsPerDay)),
      total,
      page,
      pageSize,
    };
  },

  async deleteUrl(userId: string, urlId: string): Promise<void> {
    const deleted = await urlRepository.softDelete(urlId, userId);
    if (!deleted) {
      throw new AppError(HTTP.NOT_FOUND, 'URL not found or not owned by user', 'URL_NOT_FOUND');
    }
  },
};
