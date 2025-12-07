import { Router, type Router as ExpressRouter } from 'express';
import {
  getAllServicesController,
  enableServiceController,
  disableServiceController,
  disconnectServiceController,
  configureServiceController,
  testServiceController,
} from '../controllers/admin-service.controller';

const router: ExpressRouter = Router();

/**
 * @openapi
 * /api/v1/admin/service:
 *   get:
 *     tags:
 *       - Admin - Service Config
 *     summary: Get all service configurations
 *     description: Returns all service configurations, auto-creates missing ones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of service configurations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serviceName:
 *                         type: string
 *                         enum: [EMAIL, WHATSAPP, SMS, RAZORPAY]
 *                       isEnabled:
 *                         type: boolean
 *                       isConnected:
 *                         type: boolean
 *                       config:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 */
router.get('/', getAllServicesController);

/**
 * @openapi
 * /api/v1/admin/service/{serviceName}/enable:
 *   post:
 *     tags:
 *       - Admin - Service Config
 *     summary: Enable a service
 *     description: Enable a configured external service
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [EMAIL, WHATSAPP, SMS, RAZORPAY]
 *         description: Service name
 *     responses:
 *       200:
 *         description: Service enabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Service not configured
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service not found
 */
router.post('/:serviceName/enable', enableServiceController);

/**
 * @openapi
 * /api/v1/admin/service/{serviceName}/disable:
 *   post:
 *     tags:
 *       - Admin - Service Config
 *     summary: Disable a service
 *     description: Disable an enabled external service
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [EMAIL, WHATSAPP, SMS, RAZORPAY]
 *         description: Service name
 *     responses:
 *       200:
 *         description: Service disabled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service not found
 */
router.post('/:serviceName/disable', disableServiceController);

/**
 * @openapi
 * /api/v1/admin/service/{serviceName}/disconnect:
 *   post:
 *     tags:
 *       - Admin - Service Config
 *     summary: Disconnect and cleanup a service
 *     description: Disconnect a service and clear its configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [EMAIL, WHATSAPP, SMS, RAZORPAY]
 *         description: Service name
 *     responses:
 *       200:
 *         description: Service disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service not found
 */
router.post('/:serviceName/disconnect', disconnectServiceController);

/**
 * @openapi
 * /api/v1/admin/service/{serviceName}/configure:
 *   post:
 *     tags:
 *       - Admin - Service Config
 *     summary: Configure a service
 *     description: Update service configuration (e.g., SMTP settings for email)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [EMAIL, WHATSAPP, SMS, RAZORPAY]
 *         description: Service name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Service-specific configuration
 *             example:
 *               smtp:
 *                 host: smtp.example.com
 *                 port: 587
 *                 user: user@example.com
 *                 pass: password
 *               from: noreply@example.com
 *     responses:
 *       200:
 *         description: Service configured successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid configuration
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service not found
 */
router.post('/:serviceName/configure', configureServiceController);

/**
 * @openapi
 * /api/v1/admin/service/{serviceName}/test:
 *   post:
 *     tags:
 *       - Admin - Service Config
 *     summary: Test a service
 *     description: Send a test message to verify service configuration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: serviceName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [EMAIL, WHATSAPP, SMS, RAZORPAY]
 *         description: Service name
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recipient:
 *                 type: string
 *                 description: Email or phone number to send test message
 *     responses:
 *       200:
 *         description: Test message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Service not configured or invalid recipient
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Service not found
 */
router.post('/:serviceName/test', testServiceController);

export default router;