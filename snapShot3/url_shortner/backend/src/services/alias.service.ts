import { Prisma } from '@prisma/client';
import { aliasRepository } from '../repositories/alias.repository.js';
import { urlRepository } from '../repositories/url.repository.js';
import { subscriptionService } from './subscription.service.js';
import { AppError } from '../types/app-error.js';
import { HTTP } from '../constants/http.js';
import { RESERVED_ALIASES } from '../constants/reserved-aliases.js';
import type { CreateAliasInput } from '../types/alias.types.js';


const ALIAS_REGEX = /^[a-z0-9-]+$/;
const MIN_LENGTH = 4;
const MAX_LENGTH = 30;
const REUSE_COOLDOWN_DAYS = 30;

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

async function assertPremiumTier(userId: string): Promise<void> {
  const isPremium = await subscriptionService.checkEntitlement(userId);
  
  if (!isPremium) {
    throw new AppError(HTTP.FORBIDDEN, 'Premium subscription required to create aliases', 'PREMIUM_REQUIRED');
  }
}

export const aliasService = {
  async createAlias(userId: string, input: CreateAliasInput) {
    const aliasStr = input.alias.toLowerCase().trim();
    validateAliasFormat(aliasStr);

    await assertPremiumTier(userId);

    // Verify the URL belongs to the user
    const url = await urlRepository.findById(input.urlId);
    if (!url || url.userId !== userId) {
      throw new AppError(HTTP.FORBIDDEN, 'Target URL not found or unauthorized', 'UNAUTHORIZED_URL');
    }

    try {
      const now = new Date();
      
      const existing = await aliasRepository.findAlias(aliasStr);
      if (existing) {
         // Reusing a properly cooled-down alias
         if (existing.status === 'RELEASED' && existing.reuseAllowed && existing.reuseAfter && existing.reuseAfter < now) {
            return await aliasRepository.updateAlias(aliasStr, {
              currentUrlId: input.urlId,
              status: 'ACTIVE',
              createdByUserId: userId,
              firstUsedAt: now,
              lastUsedAt: now,
              reuseAllowed: false,
              reuseAfter: null,
            });
         }
         throw new AppError(HTTP.CONFLICT, 'Alias is already taken', 'ALIAS_TAKEN');
      }

      // New Alias creation (Race condition protected by Prisma Unique Constraint)
      return await aliasRepository.createAlias({
        alias: aliasStr,
        currentUrlId: input.urlId,
        createdByUserId: userId,
        firstUsedAt: now,
        lastUsedAt: now,
        status: 'ACTIVE',
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new AppError(HTTP.CONFLICT, 'Alias is already taken (Race Condition Prevented)', 'ALIAS_TAKEN');
      }
      throw error;
    }
  },

  async deleteAlias(userId: string, aliasStr: string) {
    const alias = await aliasRepository.findAlias(aliasStr);
    if (!alias) {
      throw new AppError(HTTP.NOT_FOUND, 'Alias not found', 'ALIAS_NOT_FOUND');
    }

    if (alias.createdByUserId !== userId) {
      throw new AppError(HTTP.FORBIDDEN, 'Unauthorized', 'UNAUTHORIZED');
    }

    if (alias.status === 'RELEASED') {
      return alias; // Idempotent
    }

    // Move to RELEASED state and begin cooldown period
    const reuseAfter = new Date();
    reuseAfter.setDate(reuseAfter.getDate() + REUSE_COOLDOWN_DAYS);

    return aliasRepository.updateAlias(aliasStr, {
      status: 'RELEASED',
      currentUrlId: null, // Detach the URL pointer to prevent accidental traffic hijacking
      reuseAllowed: true,
      reuseAfter,
    });
  },

  async getMyAliases(userId: string) {
    return aliasRepository.findAliasesByUser(userId);
  }
};
