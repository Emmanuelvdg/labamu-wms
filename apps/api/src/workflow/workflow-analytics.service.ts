import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

export interface WorkflowAnalyticsQuery {
    warehouseId?: string;
    period?: '7d' | '30d' | '90d';
    templateId?: string;
}

@Injectable()
export class WorkflowAnalyticsService {
    constructor(private prisma: PrismaService) { }

    private sinceDate(period: string = '30d'): string {
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const d = new Date();
        d.setDate(d.getDate() - days);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
    }

    // ── KPI summary ──────────────────────────────────────────────────────────

    async getKpis(query: WorkflowAnalyticsQuery) {
        const since = this.sinceDate(query.period);
        const warehouseFilter = query.warehouseId ? Prisma.sql`AND warehouseId = ${query.warehouseId}` : Prisma.empty;
        const templateFilter = query.templateId ? Prisma.sql`AND templateId = ${query.templateId}` : Prisma.empty;
        const wiWarehouseFilter = query.warehouseId ? Prisma.sql`AND wi.warehouseId = ${query.warehouseId}` : Prisma.empty;
        const wiTemplateFilter = query.templateId ? Prisma.sql`AND wi.templateId = ${query.templateId}` : Prisma.empty;

        const [statusCounts, cycleTimeRow, slaRow] = await Promise.all([
            this.prisma.$queryRaw<{ status: string; count: number }[]>`
                SELECT status, COUNT(*) as count
                FROM WorkflowInstance
                WHERE startedAt >= ${since}
                  ${warehouseFilter}
                  ${templateFilter}
                GROUP BY status
            `,

            // julianday difference gives fractional days; ×24×60 = minutes
            this.prisma.$queryRaw<{ avgMinutes: number | null }[]>`
                SELECT ROUND(
                    AVG((julianday(completedAt) - julianday(startedAt)) * 24 * 60),
                    1
                ) AS avgMinutes
                FROM WorkflowInstance
                WHERE status      = 'COMPLETED'
                  AND startedAt   >= ${since}
                  AND completedAt IS NOT NULL
                  ${warehouseFilter}
                  ${templateFilter}
            `,

            // SLA breach: task completed after its dueAt deadline
            this.prisma.$queryRaw<{ breachCount: number }[]>`
                SELECT COUNT(*) AS breachCount
                FROM WorkflowTaskInstance wt
                INNER JOIN WorkflowInstance wi ON wt.instanceId = wi.id
                WHERE wt.dueAt        IS NOT NULL
                  AND wt.completedAt  >  wt.dueAt
                  AND wi.startedAt    >= ${since}
                  ${wiWarehouseFilter}
                  ${wiTemplateFilter}
            `,
        ]);

        const counts = Object.fromEntries(statusCounts.map(r => [r.status, Number(r.count)]));
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const completed = counts['COMPLETED'] ?? 0;
        const failed = counts['FAILED'] ?? 0;

        return {
            totalRuns: total,
            completedRuns: completed,
            failedRuns: failed,
            successRate: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
            avgCycleTimeMinutes: cycleTimeRow[0]?.avgMinutes ?? null,
            slaBreachCount: Number(slaRow[0]?.breachCount ?? 0),
        };
    }

    // ── Step execution times ─────────────────────────────────────────────────

    async getStepExecutionTimes(query: WorkflowAnalyticsQuery) {
        const since = this.sinceDate(query.period);
        const wiWarehouseFilter = query.warehouseId ? Prisma.sql`AND wi.warehouseId = ${query.warehouseId}` : Prisma.empty;
        const wiTemplateFilter = query.templateId ? Prisma.sql`AND wi.templateId = ${query.templateId}` : Prisma.empty;

        const rows = await this.prisma.$queryRaw<
            { stepName: string; stepType: string; avgMinutes: number; taskCount: number }[]
        >`
            SELECT
                ws.name    AS stepName,
                ws.type    AS stepType,
                ROUND(
                    AVG((julianday(wt.completedAt) - julianday(wt.startedAt)) * 24 * 60),
                    1
                )          AS avgMinutes,
                COUNT(*)   AS taskCount
            FROM WorkflowTaskInstance wt
            INNER JOIN WorkflowStep    ws ON wt.stepId     = ws.id
            INNER JOIN WorkflowInstance wi ON wt.instanceId = wi.id
            WHERE wt.status      = 'COMPLETED'
              AND wt.startedAt   IS NOT NULL
              AND wt.completedAt IS NOT NULL
              AND wi.startedAt   >= ${since}
              ${wiWarehouseFilter}
              ${wiTemplateFilter}
            GROUP BY ws.id, ws.name, ws.type
            ORDER BY avgMinutes DESC
        `;

        // Flag steps >2× the median as HIGH severity, >1.5× as MEDIUM
        const times = rows.map(r => Number(r.avgMinutes));
        const sorted = [...times].sort((a, b) => a - b);
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

        return rows.map(r => ({
            stepName: r.stepName,
            stepType: r.stepType,
            avgMinutes: Number(r.avgMinutes),
            taskCount: Number(r.taskCount),
            severity: Number(r.avgMinutes) > median * 2 ? 'HIGH'
                : Number(r.avgMinutes) > median * 1.5 ? 'MEDIUM'
                    : null,
        }));
    }

    // ── Daily completion volume ───────────────────────────────────────────────

    async getCompletionVolume(query: WorkflowAnalyticsQuery) {
        const since = this.sinceDate(query.period);
        const warehouseFilter = query.warehouseId ? Prisma.sql`AND warehouseId = ${query.warehouseId}` : Prisma.empty;
        const templateFilter = query.templateId ? Prisma.sql`AND templateId = ${query.templateId}` : Prisma.empty;

        const rows = await this.prisma.$queryRaw<{ date: string; count: number }[]>`
            SELECT
                DATE(completedAt) AS date,
                COUNT(*)           AS count
            FROM WorkflowInstance
            WHERE status      = 'COMPLETED'
              AND completedAt >= ${since}
              ${warehouseFilter}
              ${templateFilter}
            GROUP BY DATE(completedAt)
            ORDER BY date ASC
        `;

        return rows.map(r => ({ date: r.date, count: Number(r.count) }));
    }

    // ── Suggested optimisations ───────────────────────────────────────────────

    getSuggestedOptimisations(stepTimes: any[], kpis: any) {
        const suggestions: { type: 'WARNING' | 'INFO'; title: string; body: string }[] = [];

        for (const step of stepTimes.filter(s => s.severity === 'HIGH')) {
            suggestions.push({
                type: 'WARNING',
                title: `${step.stepName} Step Bottleneck`,
                body: `"${step.stepName}" (${step.stepType}) averages ${step.avgMinutes.toFixed(0)} min — more than 2× the workflow median. Consider adding capacity or splitting this step.`,
            });
        }

        for (const step of stepTimes.filter(s => s.severity === 'MEDIUM')) {
            suggestions.push({
                type: 'INFO',
                title: `Elevated Time in ${step.stepName}`,
                body: `"${step.stepName}" is running 50% above the median step time. Review assignee workload or step configuration.`,
            });
        }

        if (kpis.slaBreachCount > 0 && kpis.totalRuns > 0) {
            const breachPct = ((kpis.slaBreachCount / kpis.totalRuns) * 100).toFixed(1);
            suggestions.push({
                type: 'WARNING',
                title: 'SLA Deadlines Being Missed',
                body: `${kpis.slaBreachCount} task(s) completed past their SLA deadline this period (${breachPct}% of runs). Review step SLA durations or staffing.`,
            });
        }

        if (suggestions.length === 0) {
            suggestions.push({
                type: 'INFO',
                title: 'No Issues Detected',
                body: 'All workflow steps are performing within expected ranges for this period.',
            });
        }

        return suggestions;
    }

    // ── Template list (for selector dropdown) ────────────────────────────────

    async getTemplateList(query: WorkflowAnalyticsQuery) {
        const since = this.sinceDate(query.period);
        const warehouseFilter = query.warehouseId ? Prisma.sql`AND wi.warehouseId = ${query.warehouseId}` : Prisma.empty;

        const rows = await this.prisma.$queryRaw<
            { templateId: string; templateName: string; totalRuns: number; completedRuns: number; avgMinutes: number | null }[]
        >`
            SELECT
                wt2.id          AS templateId,
                wt2.name        AS templateName,
                COUNT(wi.id)    AS totalRuns,
                SUM(CASE WHEN wi.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completedRuns,
                ROUND(
                    AVG(CASE
                        WHEN wi.status = 'COMPLETED' AND wi.completedAt IS NOT NULL
                        THEN (julianday(wi.completedAt) - julianday(wi.startedAt)) * 24 * 60
                    END), 1
                ) AS avgMinutes
            FROM WorkflowInstance wi
            INNER JOIN WorkflowTemplate wt2 ON wi.templateId = wt2.id
            WHERE wi.startedAt >= ${since}
              ${warehouseFilter}
            GROUP BY wt2.id, wt2.name
            ORDER BY totalRuns DESC
        `;

        return rows.map(r => ({
            templateId: r.templateId,
            templateName: r.templateName,
            totalRuns: Number(r.totalRuns),
            completedRuns: Number(r.completedRuns),
            avgMinutes: r.avgMinutes != null ? Number(r.avgMinutes) : null,
        }));
    }

    // ── Per-template drilldown ────────────────────────────────────────────────

    async getTemplateDrilldown(templateId: string, query: WorkflowAnalyticsQuery) {
        const since = this.sinceDate(query.period);
        const wiWarehouseFilter = query.warehouseId ? Prisma.sql`AND wi.warehouseId = ${query.warehouseId}` : Prisma.empty;

        const [template, cycleTimeRows, stepRows, statusRows] = await Promise.all([
            // Template metadata
            this.prisma.workflowTemplate.findUnique({
                where: { id: templateId },
                select: { id: true, name: true, description: true, triggerType: true }
            }),

            // Cycle-time distribution per day
            this.prisma.$queryRaw<{ date: string; avgMinutes: number; runCount: number }[]>`
                SELECT
                    DATE(wi.completedAt)  AS date,
                    ROUND(AVG((julianday(wi.completedAt) - julianday(wi.startedAt)) * 24 * 60), 1) AS avgMinutes,
                    COUNT(*)              AS runCount
                FROM WorkflowInstance wi
                WHERE wi.templateId  = ${templateId}
                  AND wi.status       = 'COMPLETED'
                  AND wi.startedAt    >= ${since}
                  AND wi.completedAt  IS NOT NULL
                  ${wiWarehouseFilter}
                GROUP BY DATE(wi.completedAt)
                ORDER BY date ASC
            `,

            // Step-level breakdown
            this.prisma.$queryRaw<{ stepName: string; stepType: string; avgMinutes: number; minMinutes: number; maxMinutes: number; taskCount: number }[]>`
                SELECT
                    ws.name    AS stepName,
                    ws.type    AS stepType,
                    ROUND(AVG((julianday(wti.completedAt) - julianday(wti.startedAt)) * 24 * 60), 1)  AS avgMinutes,
                    ROUND(MIN((julianday(wti.completedAt) - julianday(wti.startedAt)) * 24 * 60), 1)  AS minMinutes,
                    ROUND(MAX((julianday(wti.completedAt) - julianday(wti.startedAt)) * 24 * 60), 1)  AS maxMinutes,
                    COUNT(*)  AS taskCount
                FROM WorkflowTaskInstance wti
                INNER JOIN WorkflowStep ws ON wti.stepId = ws.id
                INNER JOIN WorkflowInstance wi ON wti.instanceId = wi.id
                WHERE wi.templateId   = ${templateId}
                  AND wti.status      = 'COMPLETED'
                  AND wti.startedAt   IS NOT NULL
                  AND wti.completedAt IS NOT NULL
                  AND wi.startedAt    >= ${since}
                  ${wiWarehouseFilter}
                GROUP BY ws.id, ws.name, ws.type
                ORDER BY avgMinutes DESC
            `,

            // Status breakdown
            this.prisma.$queryRaw<{ status: string; count: number }[]>`
                SELECT status, COUNT(*) AS count
                FROM WorkflowInstance wi
                WHERE wi.templateId = ${templateId}
                  AND wi.startedAt  >= ${since}
                  ${wiWarehouseFilter}
                GROUP BY status
            `,
        ]);

        if (!template) return null;

        const statusMap = Object.fromEntries((statusRows as any[]).map(r => [r.status, Number(r.count)]));
        const totalRuns = Object.values(statusMap).reduce((a: any, b: any) => a + b, 0) as number;
        const completedRuns = statusMap['COMPLETED'] ?? 0;

        // Step severity
        const stepAvgs = (stepRows as any[]).map(r => Number(r.avgMinutes));
        const sorted = [...stepAvgs].sort((a, b) => a - b);
        const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;

        const steps = (stepRows as any[]).map(r => ({
            stepName: r.stepName,
            stepType: r.stepType,
            avgMinutes: Number(r.avgMinutes),
            minMinutes: Number(r.minMinutes),
            maxMinutes: Number(r.maxMinutes),
            taskCount: Number(r.taskCount),
            severity: Number(r.avgMinutes) > median * 2 ? 'HIGH'
                : Number(r.avgMinutes) > median * 1.5 ? 'MEDIUM'
                    : null,
        }));

        return {
            template,
            totalRuns,
            completedRuns,
            successRate: totalRuns > 0 ? Number(((completedRuns / totalRuns) * 100).toFixed(1)) : 0,
            statusBreakdown: statusMap,
            cycleTimeByDay: (cycleTimeRows as any[]).map(r => ({
                date: r.date,
                avgMinutes: Number(r.avgMinutes),
                runCount: Number(r.runCount),
            })),
            steps,
        };
    }

    // ── Combined response — all four datasets in one round-trip ──────────────

    async getAnalytics(query: WorkflowAnalyticsQuery) {
        const [kpis, stepExecutionTimes, completionVolume, templateList] = await Promise.all([
            this.getKpis(query),
            this.getStepExecutionTimes(query),
            this.getCompletionVolume(query),
            this.getTemplateList(query),
        ]);

        const optimisations = this.getSuggestedOptimisations(stepExecutionTimes, kpis);

        return { kpis, stepExecutionTimes, completionVolume, optimisations, templateList };
    }
}
