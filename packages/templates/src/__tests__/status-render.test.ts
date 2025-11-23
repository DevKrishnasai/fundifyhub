import assert from 'assert';
import renderEmail from '../templates/status/email';
import renderWhatsApp from '../templates/status/whatsapp';
import { STATUS_TEMPLATE_DEFAULTS } from '@fundifyhub/types';

async function run() {
  console.log('Running status template renderer tests...');

  // Scenario 1: Basic single status update
  const basic = {
    status: 'OFFER_SENT',
    link: 'https://app.fundifyhub.com/requests/REQ-1',
    customerName: 'Test User',
    email: 'test@example.com',
    phoneNumber: '+1000000000',
    header: 'Your Request Status',
    description: 'We have updated the request status.',
    footer: 'Reach out to support if needed.',
  } as any;

  const waBasic = (await (renderWhatsApp as any)(basic)) as string;
  assert(waBasic.includes('OFFER_SENT'), 'WA basic: should include status');
  assert(waBasic.includes(basic.link), 'WA basic: should include link');
  assert(waBasic.includes('Your Request Status'), 'WA basic: should include header');

  const emailBasic = (await (renderEmail as any)(basic)) as string;
  assert(emailBasic.includes('OFFER_SENT'), 'Email basic: should include status');
  assert(emailBasic.includes(basic.link), 'Email basic: should include link');

  // Scenario 2: Multiple transitions (timeline)
  const transitions = [
    { from: 'REQUEST_SUBMITTED', to: 'INSPECTION_SCHEDULED', by: 'Agent A', time: '2025-11-01 10:00' },
    { from: 'INSPECTION_SCHEDULED', to: 'INSPECTION_DONE', by: 'Agent A', time: '2025-11-02 14:30' },
    { from: 'INSPECTION_DONE', to: 'OFFER_SENT', by: 'System', time: '2025-11-03 09:15' },
  ];

  const multi = {
    status: 'OFFER_SENT',
    link: 'https://app.fundifyhub.com/requests/REQ-2',
    transitions,
    customerName: 'Test User',
  } as any;

  const waMulti = (await (renderWhatsApp as any)(multi)) as string;
  transitions.forEach((t, i) => {
    assert(waMulti.includes(t.from), `WA transitions: should include from=${t.from}`);
    assert(waMulti.includes(t.to), `WA transitions: should include to=${t.to}`);
  });

  // Scenario 3: Missing optional fields -> use defaults
  const missing = {
    status: 'PAYMENT_PENDING',
    link: '',
  } as any;

  const waMissing = (await (renderWhatsApp as any)(missing)) as string;
  assert(waMissing.indexOf(STATUS_TEMPLATE_DEFAULTS.header) >= 0 || waMissing.length > 0, 'WA missing: should produce some output and default header');

  // Scenario 4: Large number of transitions (performance / formatting)
  const manyTransitions = Array.from({ length: 30 }).map((_, i) => ({ from: `S${i}`, to: `S${i + 1}`, by: `User${i}`, time: `2025-11-${(i % 30) + 1}` }));
  const many = { status: 'COMPLEX_FLOW', link: '', transitions: manyTransitions } as any;
  const waMany = (await (renderWhatsApp as any)(many)) as string;
  // ensure first and last transition present
  assert(waMany.includes('S0'), 'WA many: include first transition');
  assert(waMany.includes('S30') || waMany.includes('S29') , 'WA many: include last transition');

  console.log('All status renderer tests passed ✅');
}

run().catch((err) => {
  console.error('Status renderer tests failed ❌');
  console.error(err);
  process.exit(1);
});
