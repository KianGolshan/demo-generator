import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encrypt";

export async function getUserApiKey(userId: string): Promise<string | null> {
  const profile = await prisma.userProfile.findUnique({ where: { id: userId } });
  if (!profile?.anthropicApiKey) return null;
  try {
    return decrypt(profile.anthropicApiKey);
  } catch {
    return null;
  }
}

/**
 * Atomically reserves a free generation slot.
 * Returns true if the slot was reserved (user can proceed with app key).
 * Returns false if the user has already used their free generation.
 * Uses a transaction to prevent TOCTOU race conditions.
 */
export async function reserveFreeGeneration(userId: string): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.userProfile.findUnique({
        where: { id: userId },
        select: { freeGenerationsUsed: true },
      });

      const used = profile?.freeGenerationsUsed ?? 0;
      if (used >= 1) throw new Error("FREE_GENERATION_EXHAUSTED");

      await tx.userProfile.upsert({
        where: { id: userId },
        update: { freeGenerationsUsed: { increment: 1 } },
        create: { id: userId, freeGenerationsUsed: 1 },
      });
    });
    return true;
  } catch (err) {
    if (err instanceof Error && err.message === "FREE_GENERATION_EXHAUSTED") return false;
    throw err;
  }
}

export async function saveUserApiKey(userId: string, apiKey: string): Promise<void> {
  const encrypted = encrypt(apiKey);
  await prisma.userProfile.upsert({
    where: { id: userId },
    update: { anthropicApiKey: encrypted },
    create: { id: userId, anthropicApiKey: encrypted },
  });
}

export async function getUserProfile(userId: string) {
  return prisma.userProfile.findUnique({
    where: { id: userId },
    select: { anthropicApiKey: true, freeGenerationsUsed: true },
  });
}
