/**
 * Template Sender Test Script
 * 
 * This script demonstrates how to use the enqueue client to send
 * STATUS and REQUEST_SUBMITTED templates via email and WhatsApp.
 * 
 * Usage:
 *   npx ts-node packages/utils/src/__tests__/send-templates.ts
 * 
 * Make sure your .env file has Redis credentials:
 *   REDIS_HOST=localhost
 *   REDIS_PORT=6379
 */

import dotenv from 'dotenv';
import path from 'path';
import createEnqueueClient from '../enqueue';
import {
  TEMPLATE_NAMES,
  StatusPayloadType,
  RequestSubmittedPayloadType,
  SERVICE_NAMES,
} from '@fundifyhub/types';

// Load environment from root .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

/**
 * Send STATUS template via email and WhatsApp
 */
async function sendStatusNotification() {
  console.log('\n📧 Sending STATUS Template...\n');

  try {
    const enqueue = createEnqueueClient({ host: REDIS_HOST, port: REDIS_PORT });

    // Payload for STATUS template
    const statusPayload: StatusPayloadType = {
      status: 'INSPECTION_SCHEDULED',
      link: 'https://app.fundifyhub.com/requests/REQ-2025-001',
      customerName: 'Ramesh Kumar',
      requestId: 'REQ-2025-001',
      companyName: 'FundifyHub',
      supportUrl: 'https://support.fundifyhub.com',
      email: '2103a51322@sru.edu.in',
      phoneNumber: '+918688179195',
      header: 'Your Request Status Update',
      description: 'Your request has been updated. Please check the status below.',
      footer: 'If you have any questions, please contact support.',
    };

    // Send via both email and WhatsApp
    const results = await enqueue.addAJob(TEMPLATE_NAMES.STATUS, statusPayload, {
      services: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
      priority: 2,
      attempts: 2,
      delay: 0,
    });

    console.log('✅ STATUS Template Jobs Queued:');
    results.forEach((result, idx) => {
      if (result.error) {
        console.log(`   [${idx}] ❌ Error: ${result.error}`);
      } else {
        console.log(`   [${idx}] ✓ Job ID: ${result.jobId}`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to send STATUS template:', error);
  }
}

/**
 * Send REQUEST_SUBMITTED template via email and WhatsApp
 */
async function sendRequestSubmittedNotification() {
  console.log('\n📧 Sending REQUEST_SUBMITTED Template...\n');

  try {
    const enqueue = createEnqueueClient({ host: REDIS_HOST, port: REDIS_PORT });

    // Payload for REQUEST_SUBMITTED template
    const requestPayload: RequestSubmittedPayloadType = {
      requestId: 'REQ-2025-002',
      customerName: 'Priya Singh',
      assetName: 'Honda Activa',
      amount: 50000,
      district: 'Mumbai',
      submittedAt: new Date().toISOString(),
      companyName: 'FundifyHub',
      dashboardUrl: 'https://app.fundifyhub.com/dashboard/REQ-2025-002',
      supportUrl: 'https://support.fundifyhub.com',
      email: '2103a51322@sru.edu.in',
      phoneNumber: '+918688179195',
    };

    // Send via both email and WhatsApp
    const results = await enqueue.addAJob(TEMPLATE_NAMES.REQUEST_SUBMITTED, requestPayload, {
      services: [SERVICE_NAMES.EMAIL, SERVICE_NAMES.WHATSAPP],
      priority: 2,
      attempts: 2,
      delay: 0,
    });

    console.log('✅ REQUEST_SUBMITTED Template Jobs Queued:');
    results.forEach((result, idx) => {
      if (result.error) {
        console.log(`   [${idx}] ❌ Error: ${result.error}`);
      } else {
        console.log(`   [${idx}] ✓ Job ID: ${result.jobId}`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to send REQUEST_SUBMITTED template:', error);
  }
}

/**
 * Send STATUS template - Email only
 */
async function sendStatusEmailOnly() {
  console.log('\n📧 Sending STATUS Template (Email Only)...\n');

  try {
    const enqueue = createEnqueueClient({ host: REDIS_HOST, port: REDIS_PORT });

    const statusPayload: StatusPayloadType = {
      status: 'OFFER_SENT',
      link: 'https://app.fundifyhub.com/requests/REQ-2025-003',
      customerName: 'Vikram Patel',
      requestId: 'REQ-2025-003',
      companyName: 'FundifyHub',
      email: '2103a51322@sru.edu.in',
      phoneNumber: '+918688179195',
    };

    const results = await enqueue.addAJob(TEMPLATE_NAMES.STATUS, statusPayload, {
      services: [SERVICE_NAMES.EMAIL],
      priority: 1,
      attempts: 3,
    });

    console.log('✅ STATUS (Email Only) Jobs Queued:');
    results.forEach((result, idx) => {
      if (result.error) {
        console.log(`   [${idx}] ❌ Error: ${result.error}`);
      } else {
        console.log(`   [${idx}] ✓ Job ID: ${result.jobId}`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to send STATUS (Email):', error);
  }
}

/**
 * Send REQUEST_SUBMITTED template - WhatsApp only
 */
async function sendRequestSubmittedWhatsAppOnly() {
  console.log('\n📱 Sending REQUEST_SUBMITTED Template (WhatsApp Only)...\n');

  try {
    const enqueue = createEnqueueClient({ host: REDIS_HOST, port: REDIS_PORT });

    const requestPayload: RequestSubmittedPayloadType = {
      requestId: 'REQ-2025-004',
      customerName: 'Anjali Sharma',
      assetName: 'MacBook Pro',
      amount: 120000,
      district: 'Bangalore',
      submittedAt: new Date().toISOString(),
      companyName: 'FundifyHub',
      dashboardUrl: 'https://app.fundifyhub.com/dashboard/REQ-2025-004',
      phoneNumber: '+918688179195',
    };

    const results = await enqueue.addAJob(TEMPLATE_NAMES.REQUEST_SUBMITTED, requestPayload, {
      services: [SERVICE_NAMES.WHATSAPP],
      priority: 2,
      attempts: 2,
    });

    console.log('✅ REQUEST_SUBMITTED (WhatsApp Only) Jobs Queued:');
    results.forEach((result, idx) => {
      if (result.error) {
        console.log(`   [${idx}] ❌ Error: ${result.error}`);
      } else {
        console.log(`   [${idx}] ✓ Job ID: ${result.jobId}`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to send REQUEST_SUBMITTED (WhatsApp):', error);
  }
}

/**
 * Main runner - sends all template examples
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║         FundifyHub Template Sender Test Script              ║');
  console.log('║     Queues email and WhatsApp messages via BullMQ           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  console.log(`\n🔌 Redis Connection: redis://${REDIS_HOST}:${REDIS_PORT}\n`);

  try {
    // Send examples of each template
    await sendStatusNotification();
    await sendRequestSubmittedNotification();
    await sendStatusEmailOnly();
    await sendRequestSubmittedWhatsAppOnly();

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║           ✅ All templates queued successfully!             ║');
    console.log('║                                                            ║');
    console.log('║ The job-worker will process these jobs from the queues.   ║');
    console.log('║ Check the worker logs to see email and WhatsApp output.   ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Error running template sender:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
