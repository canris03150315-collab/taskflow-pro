"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();

// GET /api/performance/reviews?period=YYYY-MM&userId=xxx
router.get('/reviews', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const { period, userId } = req.query;

        let query = 'SELECT * FROM performance_reviews WHERE 1=1';
        const params = [];

        if (period) {
            query += ' AND period = ?';
            params.push(period);
        }
        if (userId) {
            query += ' AND target_user_id = ?';
            params.push(userId);
        }

        query += ' ORDER BY updated_at DESC';

        const reviews = await db.all(query, params);

        // Map DB column names to frontend camelCase
        const mapped = (reviews || []).map(r => ({
            id: r.id,
            targetUserId: r.target_user_id,
            period: r.period,
            reviewerId: r.reviewer_id,
            updatedAt: r.updated_at,
            metrics: {
                taskCompletionRate: r.task_completion_rate || 0,
                sopCompletionRate: r.sop_completion_rate || 0,
                attendanceRate: r.attendance_rate || 0
            },
            ratingWorkAttitude: r.rating_work_attitude || 0,
            ratingProfessionalism: r.rating_professionalism || 0,
            ratingTeamwork: r.rating_teamwork || 0,
            managerComment: r.manager_comment || '',
            totalScore: r.total_score || 0,
            grade: r.grade || 'C',
            status: r.status || 'DRAFT'
        }));

        res.json(mapped);
    } catch (error) {
        console.error('[Performance] Get reviews error:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

// POST /api/performance/reviews - Save/update a review
router.post('/reviews', auth_1.authenticateToken, async (req, res) => {
    try {
        const db = req.db;
        const currentUser = req.user;
        const review = req.body;

        // L7 fix: Validate score ranges (0-100 for rates, 0-10 for ratings)
        const metrics = review.metrics || {};
        const rateFields = [metrics.taskCompletionRate, metrics.sopCompletionRate, metrics.attendanceRate];
        const ratingFields = [review.ratingWorkAttitude, review.ratingProfessionalism, review.ratingTeamwork];
        const totalScore = review.totalScore;

        for (const v of rateFields) {
            if (v !== undefined && v !== null && (v < 0 || v > 100)) {
                return res.status(400).json({ error: '完成率必須在 0-100 之間' });
            }
        }
        for (const v of ratingFields) {
            if (v !== undefined && v !== null && (v < 0 || v > 10)) {
                return res.status(400).json({ error: '評分項目必須在 0-10 之間' });
            }
        }
        if (totalScore !== undefined && totalScore !== null && (totalScore < 0 || totalScore > 100)) {
            return res.status(400).json({ error: '總分必須在 0-100 之間' });
        }

        const now = new Date().toISOString();

        if (review.id) {
            // Update existing
            const existing = await db.get('SELECT * FROM performance_reviews WHERE id = ?', [review.id]);
            if (existing) {
                await db.run(
                    `UPDATE performance_reviews SET
                        target_user_id = ?, period = ?, reviewer_id = ?, updated_at = ?,
                        task_completion_rate = ?, sop_completion_rate = ?, attendance_rate = ?,
                        rating_work_attitude = ?, rating_professionalism = ?, rating_teamwork = ?,
                        manager_comment = ?, total_score = ?, grade = ?, status = ?
                    WHERE id = ?`,
                    [
                        review.targetUserId, review.period, currentUser.id, now,
                        review.metrics?.taskCompletionRate || 0,
                        review.metrics?.sopCompletionRate || 0,
                        review.metrics?.attendanceRate || 0,
                        review.ratingWorkAttitude || 0, review.ratingProfessionalism || 0, review.ratingTeamwork || 0,
                        review.managerComment || '', review.totalScore || 0, review.grade || 'C', review.status || 'DRAFT',
                        review.id
                    ]
                );
                const updated = await db.get('SELECT * FROM performance_reviews WHERE id = ?', [review.id]);
                return res.json({
                    id: updated.id,
                    targetUserId: updated.target_user_id,
                    period: updated.period,
                    reviewerId: updated.reviewer_id,
                    updatedAt: updated.updated_at,
                    metrics: {
                        taskCompletionRate: updated.task_completion_rate || 0,
                        sopCompletionRate: updated.sop_completion_rate || 0,
                        attendanceRate: updated.attendance_rate || 0
                    },
                    ratingWorkAttitude: updated.rating_work_attitude || 0,
                    ratingProfessionalism: updated.rating_professionalism || 0,
                    ratingTeamwork: updated.rating_teamwork || 0,
                    managerComment: updated.manager_comment || '',
                    totalScore: updated.total_score || 0,
                    grade: updated.grade || 'C',
                    status: updated.status || 'DRAFT'
                });
            }
        }

        // Create new
        const id = `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await db.run(
            `INSERT INTO performance_reviews (
                id, target_user_id, period, reviewer_id, updated_at,
                task_completion_rate, sop_completion_rate, attendance_rate,
                rating_work_attitude, rating_professionalism, rating_teamwork,
                manager_comment, total_score, grade, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, review.targetUserId, review.period, currentUser.id, now,
                review.metrics?.taskCompletionRate || 0,
                review.metrics?.sopCompletionRate || 0,
                review.metrics?.attendanceRate || 0,
                review.ratingWorkAttitude || 0, review.ratingProfessionalism || 0, review.ratingTeamwork || 0,
                review.managerComment || '', review.totalScore || 0, review.grade || 'C', review.status || 'DRAFT'
            ]
        );

        const created = await db.get('SELECT * FROM performance_reviews WHERE id = ?', [id]);
        res.json({
            id: created.id,
            targetUserId: created.target_user_id,
            period: created.period,
            reviewerId: created.reviewer_id,
            updatedAt: created.updated_at,
            metrics: {
                taskCompletionRate: created.task_completion_rate || 0,
                sopCompletionRate: created.sop_completion_rate || 0,
                attendanceRate: created.attendance_rate || 0
            },
            ratingWorkAttitude: created.rating_work_attitude || 0,
            ratingProfessionalism: created.rating_professionalism || 0,
            ratingTeamwork: created.rating_teamwork || 0,
            managerComment: created.manager_comment || '',
            totalScore: created.total_score || 0,
            grade: created.grade || 'C',
            status: created.status || 'DRAFT'
        });
    } catch (error) {
        console.error('[Performance] Save review error:', error);
        res.status(500).json({ error: '伺服器內部錯誤' });
    }
});

exports.performanceRoutes = router;
