import { prisma } from '../prisma/client.js';

type Period = '7d' | '30d' | 'all';

function periodToStartDate(period: Period): Date | null {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const analyticsService = {
  async getOverview(userId: string, period: Period) {
    const since = periodToStartDate(period);
    const sinceFilter = since ? { gte: since } : undefined;

    // All URLs owned by this user (not deleted)
    const userUrls = await prisma.url.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, shortCode: true, originalUrl: true, clickCount: true },
    });

    if (userUrls.length === 0) {
      return {
        totalClicks: 0,
        topLinks: [],
        deviceBreakdown: [],
        topReferrers: [],
        clicksOverTime: [],
      };
    }

    const urlIds = userUrls.map((u) => u.id);
    const clickWhere = {
      urlId: { in: urlIds },
      ...(sinceFilter ? { clickedAt: sinceFilter } : {}),
    };

    // Total clicks
    const totalClicks = await prisma.click.count({ where: clickWhere });

    // Top links by click count within period
    const clicksByUrl = await prisma.click.groupBy({
      by: ['urlId'],
      where: clickWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const urlMap = new Map(userUrls.map((u) => [u.id, u]));
    const topLinks = clicksByUrl.map((g) => {
      const url = urlMap.get(g.urlId)!;
      return {
        urlId: g.urlId,
        shortCode: url.shortCode,
        originalUrl: url.originalUrl,
        clicks: g._count.id,
      };
    });

    // Device breakdown
    const deviceGroups = await prisma.click.groupBy({
      by: ['deviceType'],
      where: clickWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const deviceBreakdown = deviceGroups.map((g) => ({
      device: g.deviceType ?? 'unknown',
      clicks: g._count.id,
      percent: totalClicks > 0 ? Math.round((g._count.id / totalClicks) * 100) : 0,
    }));

    // Top referrers
    const referrerGroups = await prisma.click.groupBy({
      by: ['referrer'],
      where: { ...clickWhere, referrer: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topReferrers = referrerGroups.map((g) => ({
      referrer: g.referrer ?? 'Direct',
      clicks: g._count.id,
    }));

    // Clicks over time — bucket by day
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 30;
    const clicksOverTime: { date: string; clicks: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await prisma.click.count({
        where: {
          urlId: { in: urlIds },
          clickedAt: { gte: dayStart, lte: dayEnd },
        },
      });

      clicksOverTime.push({
        date: dayStart.toISOString().slice(0, 10),
        clicks: count,
      });
    }

    return { totalClicks, topLinks, deviceBreakdown, topReferrers, clicksOverTime };
  },
};
