import { Prisma } from '@prisma/client';

/** True when a unique constraint (e.g. short_code) was violated. */
export function isPrismaUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
