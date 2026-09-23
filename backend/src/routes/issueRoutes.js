import express from 'express';
import { requireAuth, requireOrg, requireSuperAdmin } from '../middlewares/auth.js';
import {
  createIssue,
  getMyStoreIssues,
  getAllIssuesForAdmin,
  updateIssueStatus,
  deleteIssue,
} from '../controllers/issueController.js';

const router = express.Router();

// Merchant / Store Users
router.post('/', requireAuth, requireOrg, createIssue);
router.get('/my-store', requireAuth, requireOrg, getMyStoreIssues);

// Super Admin (ialksng@gmail.com)
router.get('/admin/all', requireAuth, requireSuperAdmin, getAllIssuesForAdmin);
router.patch('/admin/:issueId', requireAuth, requireSuperAdmin, updateIssueStatus);
router.delete('/admin/:issueId', requireAuth, requireSuperAdmin, deleteIssue);

export default router;
