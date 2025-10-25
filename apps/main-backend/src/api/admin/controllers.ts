/**
 * Admin Controllers
 * Handles HTTP requests and responses for admin operations
 * Business logic is delegated to admin services
 */

import { Request, Response } from 'express';
import { APIResponse } from '../../types';
import {
  getAllServiceConfigs,
  getServiceConfigByName,
  updateServiceConfigByName,
  initializeDefaultServiceConfigs,
} from './services';
import { testServiceConfigByName } from './services';
import { logger } from '../../utils/logger';

/**
 * GET /admin/config
 * Get all service configurations
 */
export async function getAllConfigController(req: Request, res: Response): Promise<void> {
  try {
    const result = await getAllServiceConfigs();
    const statusCode = result.success ? 200 : 500;

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    } as APIResponse);
  } catch (error) {
    logger.error('Error getting service configurations:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service configurations',
    } as APIResponse);
  }
}

/**
 * GET /admin/config/:serviceName
 * Get specific service configuration
 */
export async function getConfigController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;

    const result = await getServiceConfigByName(serviceName);
    const statusCode = result.success ? 200 : result.data ? 404 : 500;

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    } as APIResponse);
  } catch (error) {
    logger.error('Error getting service configuration:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to get service configuration',
    } as APIResponse);
  }
}

/**
 * POST /admin/config/:serviceName
 * Update service configuration (enable/disable)
 */
export async function updateConfigController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    const { isEnabled, config } = req.body;
    const adminUserId = (req as any).user?.id || 'unknown-admin';

    const result = await updateServiceConfigByName(serviceName, isEnabled, config, adminUserId);
    const statusCode = result.success ? 200 : 400;

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    } as APIResponse);
  } catch (error) {
    logger.error('Error updating service configuration:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service configuration',
    } as APIResponse);
  }
}

/**
 * POST /admin/init
 * Initialize default service configurations
 */
export async function initializeConfigController(req: Request, res: Response): Promise<void> {
  try {
    const result = await initializeDefaultServiceConfigs();

    res.json({
      success: result.success,
      message: result.message,
    } as APIResponse);
  } catch (error) {
    logger.error('Error initializing service configurations:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize service configurations',
    } as APIResponse);
  }
}

/**
 * POST /admin/config/:serviceName/test
 * Test a service configuration (validate SMTP or queue a WhatsApp test)
 */
export async function testConfigController(req: Request, res: Response): Promise<void> {
  try {
    const { serviceName } = req.params;
    const payload = req.body || {};
    const adminUserId = (req as any).user?.id || 'unknown-admin';

    const result = await testServiceConfigByName(serviceName, payload, adminUserId);
    const statusCode = result.success ? 200 : 400;

    res.status(statusCode).json({
      success: result.success,
      message: result.message,
      data: result.data,
    } as APIResponse);
  } catch (error) {
    logger.error('Error testing service configuration:', error as Error);
    res.status(500).json({
      success: false,
      message: 'Failed to test service configuration',
    } as APIResponse);
  }
}
