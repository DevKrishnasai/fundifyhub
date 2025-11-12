import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { getAgentsByDistrictController } from './controllers';
import { requireRoles } from '../../../utils/rbac';
import { ROLES } from '@fundifyhub/types';

const router: ExpressRouter = Router();

// GET /admin/agents?district=DistrictName
// Only SUPER_ADMIN and DISTRICT_ADMIN may list agents
router.get('/', requireRoles([ROLES.SUPER_ADMIN, ROLES.DISTRICT_ADMIN]), getAgentsByDistrictController);

export default router;
