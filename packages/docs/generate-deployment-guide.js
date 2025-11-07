const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Output path
const outPath = path.resolve(__dirname, 'deployment-guide-polished.pdf');

// Create doc
const doc = new PDFDocument({ size: 'A4', margin: 48 });
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

// Theme helpers
const colors = {
  primary: '#0B2545',
  heading: '#0B3B63',
  text: '#111827',
  subtle: '#6B7280',
  accent: '#2563EB',
  border: '#E5E7EB',
  note: '#F59E0B',
};

function h1(title) {
  doc.fillColor(colors.primary).fontSize(20).text(title, { align: 'left' });
  doc.moveDown(0.2);
  doc.strokeColor(colors.border).lineWidth(1).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
  doc.moveDown(0.6);
}

function h2(title) {
  doc.fillColor(colors.heading).fontSize(14).text(title);
  doc.moveDown(0.3);
}

function p(text) {
  doc.fillColor(colors.text).fontSize(10).text(text, { lineGap: 3 });
  doc.moveDown(0.4);
}

function bullet(items) {
  doc.fillColor(colors.text).fontSize(10);
  items.forEach((i) => {
    doc.text(`• ${i}`, { lineGap: 2 });
  });
  doc.moveDown(0.4);
}

function callout(kind, text) {
  const y = doc.y;
  const x = doc.x;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.save();
  const bg = kind === 'note' ? '#FFF7ED' : '#EEF2FF';
  const br = kind === 'note' ? colors.note : colors.accent;
  doc.roundedRect(x, y, width, 44, 6).fillAndStroke(bg, br);
  doc.fillColor(colors.text).fontSize(10).text(text, x + 10, y + 12, { width: width - 20 });
  doc.restore();
  doc.moveDown(1.2);
}

// Simple flowchart drawing utilities (text-only shapes)
function flowBox(x, y, w, h, text, opts = {}) {
  const { fill = '#FFFFFF', stroke = colors.accent } = opts;
  doc.save();
  doc.roundedRect(x, y, w, h, 6).fillAndStroke(fill, stroke);
  doc.fillColor(colors.text).fontSize(10).text(text, x + 10, y + 10, { width: w - 20, align: 'center' });
  doc.restore();
}

function flowDiamond(x, y, w, h, text) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  doc.save();
  doc.moveTo(cx, y).lineTo(x + w, cy).lineTo(cx, y + h).lineTo(x, cy).closePath().stroke(colors.accent);
  doc.fillColor(colors.text).fontSize(10).text(text, x + 10, y + 10, { width: w - 20, align: 'center' });
  doc.restore();
}

function arrow(x1, y1, x2, y2) {
  doc.save();
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke(colors.accent);
  // arrow head
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 6;
  doc.moveTo(x2, y2)
     .lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6))
     .moveTo(x2, y2)
     .lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6))
     .stroke(colors.accent);
  doc.restore();
}

function costTable(title, rows, assumptions) {
  h2(title);
  const startY = doc.y;
  const x = doc.x;
  const colScenario = 200;
  const colLow = 120;
  const colHigh = 120;
  doc.fillColor(colors.heading).fontSize(10).text('Scenario', x, startY, { width: colScenario });
  doc.text('Monthly (low)', x + colScenario + 10, startY, { width: colLow });
  doc.text('Monthly (high)', x + colScenario + colLow + 20, startY, { width: colHigh });
  doc.moveDown(0.4);
  rows.forEach((r) => {
    doc.fillColor(colors.text).text(r.scenario, x, doc.y, { width: colScenario });
    doc.text(r.low, x + colScenario + 10, doc.y, { width: colLow });
    doc.text(r.high, x + colScenario + colLow + 20, doc.y, { width: colHigh });
    doc.moveDown(0.2);
  });
  if (assumptions && assumptions.length) {
    doc.moveDown(0.3);
    doc.fillColor(colors.subtle).fontSize(9).text('Assumptions:', x, doc.y);
    assumptions.forEach((a) => doc.text(`- ${a}`));
    doc.moveDown(0.4);
  }
}

// Cover page
h1('FundifyHub — Cost-first AWS Deployment Guide (Text Only)');
doc.fillColor(colors.subtle).fontSize(11).text('Approaches, pros/cons, step-by-step instructions, cost ranges, and a decision flowchart.');
doc.moveDown(1);
doc.fontSize(9).text(`Generated: ${new Date().toLocaleString()}`);

doc.addPage();

h1('Overview');
p('This guide proposes four deployment approaches with a cost-first mindset. Each section includes tradeoffs, a concrete setup checklist, and rough monthly cost ranges for 100/500/1000 monthly users.');

// Approach A
h1('Approach A — Single EC2 + RDS');
h2('When to pick');
bullet([
  'You want the lowest steady monthly cost and straightforward ops.',
  'Traffic is moderate and uptime requirements are reasonable (single-AZ).',
]);

h2('Pros');
bullet([
  'Lowest ongoing cost for always-on workloads.',
  'Simple debugging (SSH).',
  'No container orchestration complexity.',
]);

h2('Cons');
bullet([
  'Single point of failure if single-AZ.',
  'You maintain OS, Docker, and patching.',
  'Manual scaling (add another instance or migrate later).',
]);

h2('Step-by-step');
bullet([
  'Create RDS: PostgreSQL, db.t4g.small (or t3.small), gp3 20GB, single-AZ, private subnet.',
  'Launch EC2: Ubuntu 22.04 LTS, t4g.medium (or t3.medium), 20GB gp3, SG rules for 80/443 from world, 5432 from EC2 → RDS.',
  'Install Docker & Compose. Pull/build images or run docker-compose for frontend, backend, worker, nginx, redis.',
  'Set environment variables (DATABASE_URL to RDS; secrets via .env or AWS Secrets Manager).',
  'Run Prisma migrations and seed against RDS.',
  'Set up TLS (ACM + nginx) and CloudWatch metrics/alarms.',
]);

costTable('Estimated monthly cost — Approach A', [
  { scenario: '100 users (~10k req)', low: '$45', high: '$95' },
  { scenario: '500 users (~50k req)', low: '$60', high: '$150' },
  { scenario: '1000 users (~100k req)', low: '$100', high: '$250' },
], [
  'EC2 t3/t4g.medium + EBS gp3; RDS db.t3/t4g.small single-AZ; minimal data transfer.',
  'Redis on EC2 or ElastiCache (t4g.micro) when needed.',
]);

// Approach B
h1('Approach B — ECS Fargate + RDS');
h2('When to pick');
bullet([
  'You prefer managed container orchestration and easier CI/CD.',
  'Willing to pay a bit more for reduced ops effort.',
]);

h2('Pros');
bullet([
  'No EC2 to patch; tasks scale horizontally.',
  'Good ALB integration and blue/green deployments.',
]);

h2('Cons');
bullet([
  'Higher base cost for always-on services.',
  'Task sizing requires tuning to control spend.',
]);

h2('Step-by-step');
bullet([
  'Build/push images to ECR; create RDS as in Approach A.',
  'Create ECS cluster (Fargate). Define Task Definitions (frontend/api, worker).',
  'Create ALB + target groups + listeners (HTTPS via ACM).',
  'Configure service autoscaling and environment secrets.',
  'Wire CI/CD (GitHub Actions) to push images and update services.',
]);

costTable('Estimated monthly cost — Approach B', [
  { scenario: '100 users', low: '$80', high: '$160' },
  { scenario: '500 users', low: '$120', high: '$300' },
  { scenario: '1000 users', low: '$200', high: '$500' },
], [
  '2–3 small Fargate tasks + RDS single-AZ + ALB + data transfer.',
]);

// Approach C
h1('Approach C — Serverless (Lambda + Aurora Serverless or RDS Proxy)');
h2('When to pick');
bullet([
  'Workload is spiky or low-average; strong need for auto-scaling.',
  'You want minimal operations at the expense of tuning cold starts and DB connections.',
]);

h2('Pros');
bullet([
  'Scales to zero for low traffic (lower idle cost).',
  'Very low ops overhead.',
]);

h2('Cons');
bullet([
  'Can get pricey for steady traffic; careful with concurrency and DB connections.',
  'More moving parts (functions, API Gateway/ALB, DB pooling).',
]);

h2('Step-by-step');
bullet([
  'Package Next.js backend as serverless handlers or container-based Lambdas.',
  'Use Aurora Serverless v2 or RDS + RDS Proxy. Limit connections and pool aggressively.',
  'Use SQS for background jobs or separate small Lambdas triggered by SQS.',
  'Set infra with IaC (SAM/CDK) and deploy via CI/CD.',
]);

costTable('Estimated monthly cost — Approach C', [
  { scenario: '100 users', low: '$20', high: '$80' },
  { scenario: '500 users', low: '$60', high: '$220' },
  { scenario: '1000 users', low: '$120', high: '$500' },
], [
  'Lambda invocations + Aurora Srvls v2 (or RDS Proxy) + API Gateway/ALB.',
]);

// Approach D
h1('Approach D — Hybrid (ECS for web/API, EC2 for workers)');
h2('When to pick');
bullet([
  'Web/API fits containers well but workers are long-lived/cheaper on EC2.',
]);

h2('Pros');
bullet([
  'Reduce Fargate cost for long-running workers.',
  'Keep managed orchestration for web/API.',
]);

h2('Cons');
bullet([
  'Two operational surfaces (ECS + EC2).',
]);

h2('Step-by-step');
bullet([
  'Run frontend/API on ECS Fargate behind an ALB.',
  'Run worker on small EC2 (t4g.small); connect to the same RDS.',
  'Share VPC + security groups; centralize logs (CloudWatch).',
]);

costTable('Estimated monthly cost — Approach D', [
  { scenario: '100 users', low: '$80', high: '$180' },
  { scenario: '500 users', low: '$120', high: '$350' },
  { scenario: '1000 users', low: '$220', high: '$600' },
], [
  'ALB + 1–2 Fargate tasks + 1 EC2 worker + RDS.',
]);

// Decision flowchart page (vector shapes only)
doc.addPage();
h1('Which approach should I choose? (Flowchart)');

const left = 60; const top = 120; const bw = 180; const bh = 36; const gapY = 44;
flowBox(left, top, bw, bh, 'Budget is tight and traffic is steady?');
flowDiamond(left, top + gapY, bw, bh, 'Need lowest steady monthly cost?');
arrow(left + bw/2, top + bh, left + bw/2, top + gapY); // down arrow
flowBox(left, top + gapY*2, bw, bh, 'Pick Approach A:\nSingle EC2 + RDS', { fill: '#F0F9FF' });

const midX = 320;
flowDiamond(midX, top, bw, bh, 'Prefer managed containers?');
arrow(left + bw, top + bh/2, midX, top + bh/2); // arrow from first box to mid
flowBox(midX, top + gapY, bw, bh, 'Pick Approach B:\nECS Fargate + RDS', { fill: '#F0F9FF' });

const rightX = 480;
flowDiamond(rightX, top, bw, bh, 'Traffic spiky / low-average?');
arrow(midX + bw, top + bh/2, rightX, top + bh/2);
flowBox(rightX, top + gapY, bw, bh, 'Pick Approach C:\nServerless', { fill: '#F0F9FF' });

// Hybrid branch under mid
flowDiamond(midX, top + gapY*2, bw, bh, 'Long-running workers cheaper on EC2?');
arrow(midX + bw/2, top + gapY + bh, midX + bw/2, top + gapY*2);
flowBox(midX, top + gapY*3, bw, bh, 'Pick Approach D:\nHybrid', { fill: '#F0F9FF' });

callout('note', 'Tip: Start with Approach A for cost, move to B or D as traffic and team grow; choose C for spiky workloads with minimal ops.');

// Runbook checklist
h1('Runbook checklist');
bullet([
  'IAM: minimal roles/policies, rotate keys, use instance/task roles.',
  'Networking: RDS in private subnets; restrict SG to least privilege.',
  'Secrets: use AWS Secrets Manager or SSM; avoid committing .env.',
  'Observability: CloudWatch logs/metrics/alarms, SNS notifications.',
  'Backups: RDS automated backups; snapshot before destructive changes.',
]);

// Finalize

doc.end();

stream.on('finish', () => {
  console.log('Text-only deployment PDF generated at', outPath);
});
