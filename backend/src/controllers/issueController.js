import Issue from '../models/Issue.js';
import Organization from '../models/Organization.js';

/**
 * Merchant / Shop Staff: Create an issue report for the active store
 * POST /api/issues
 */
export const createIssue = async (req, res, next) => {
  try {
    const { title, category, priority = 'MEDIUM', description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Issue title is required.' });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Issue description is required.' });
    }

    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(400).json({ success: false, error: 'Active shop / organization context is required.' });
    }

    const issue = await Issue.create({
      organizationId: orgId,
      userId: req.user.userId,
      title: title.trim(),
      category: category || 'OTHER',
      priority,
      description: description.trim(),
      status: 'OPEN',
    });

    const populated = await Issue.findById(issue._id)
      .populate('organizationId', 'name type')
      .populate('userId', 'name email avatar');

    return res.status(201).json({
      success: true,
      message: 'Technical issue submitted successfully! Platform support will investigate.',
      issue: populated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Merchant / Shop Staff: Get issues submitted by their shop
 * GET /api/issues/my-store
 */
export const getMyStoreIssues = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    if (!orgId) {
      return res.status(200).json({ success: true, count: 0, issues: [] });
    }

    const issues = await Issue.find({ organizationId: orgId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email avatar')
      .lean();

    return res.status(200).json({
      success: true,
      count: issues.length,
      issues,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin (ialksng@gmail.com): Get all reported issues across all shops
 * GET /api/issues/admin/all
 */
export const getAllIssuesForAdmin = async (req, res, next) => {
  try {
    const { status, priority, search } = req.query;

    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (priority && priority !== 'ALL') {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { description: regex }, { category: regex }];
    }

    const [issues, stats] = await Promise.all([
      Issue.find(query)
        .sort({ createdAt: -1 })
        .populate('organizationId', 'name type')
        .populate('userId', 'name email avatar')
        .lean(),
      Issue.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts = {
      TOTAL: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
    };

    stats.forEach((s) => {
      counts[s._id] = s.count;
      counts.TOTAL += s.count;
    });

    return res.status(200).json({
      success: true,
      count: issues.length,
      counts,
      issues,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin (ialksng@gmail.com): Update issue status and admin resolution notes
 * PATCH /api/issues/admin/:issueId
 */
export const updateIssueStatus = async (req, res, next) => {
  try {
    const { issueId } = req.params;
    const { status, adminNotes } = req.body;

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    if (status) {
      issue.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        issue.resolvedAt = new Date();
      } else {
        issue.resolvedAt = null;
      }
    }

    if (adminNotes !== undefined) {
      issue.adminNotes = adminNotes.trim();
    }

    await issue.save();

    const updated = await Issue.findById(issueId)
      .populate('organizationId', 'name type')
      .populate('userId', 'name email avatar');

    return res.status(200).json({
      success: true,
      message: `Issue updated to ${issue.status}.`,
      issue: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin (ialksng@gmail.com): Delete an issue record
 * DELETE /api/issues/admin/:issueId
 */
export const deleteIssue = async (req, res, next) => {
  try {
    const { issueId } = req.params;

    const issue = await Issue.findByIdAndDelete(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Issue report deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createIssue,
  getMyStoreIssues,
  getAllIssuesForAdmin,
  updateIssueStatus,
  deleteIssue,
};
