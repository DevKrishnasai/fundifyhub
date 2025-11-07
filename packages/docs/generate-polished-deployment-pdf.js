const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const outPath = path.resolve(__dirname, 'deployment-guide-polished.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 48 });

function header(title) {
  doc.fillColor('#0b2545').fontSize(18).text(title, { align: 'left' });
  doc.moveDown(0.2);
  doc.strokeColor('#e6eef8').lineWidth(1).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
  doc.moveDown(0.6);
}

function sectionTitle(t) {
  doc.moveDown(0.4);
  doc.fillColor('#0b3b63').fontSize(14).text(t);
  doc.moveDown(0.2);
}

function paragraph(txt) {
  doc.fillColor('#111827').fontSize(10).text(txt, { lineGap: 3 });
  doc.moveDown(0.4);
}

function drawTwoColumn(leftTitle, leftBody, rightTitle, rightBody) {
  const startX = doc.x;
  const colGap = 12;
  const colW = (doc.page.width - doc.page.margins.left - doc.page.margins.right - colGap) / 2;

  const y = doc.y;
  doc.fontSize(11).fillColor('#0b2545').text(leftTitle, startX, y, { width: colW });
  doc.fontSize(10).fillColor('#111827').text(leftBody, startX, y + 16, { width: colW });

  const rightX = startX + colW + colGap;
  doc.fontSize(11).fillColor('#0b2545').text(rightTitle, rightX, y, { width: colW });
  doc.fontSize(10).fillColor('#111827').text(rightBody, rightX, y + 16, { width: colW });

  doc.moveDown(6);
}

function drawMockPanel(x, y, w, h, title, rows, highlights = []) {
  doc.roundedRect(x, y, w, h, 6).fill('#ffffff').stroke('#dbeafe');
  doc.fillColor('#0b2545').fontSize(11).text(title, x + 10, y + 8);
  let curY = y + 28;
  doc.fontSize(9).fillColor('#374151');
  for (const r of rows) {
    doc.rect(x + 10, curY - 2, w - 20, 18).stroke('#eef2ff');
    doc.text(r.label, x + 14, curY);
    if (r.value) doc.text(r.value, x + 160, curY);
    curY += 22;
  }
  for (const h of highlights) {
    const hx = x + h.x * w;
    const hy = y + h.y * h;
    const hw = h.w * w;
    const hh = h.h * h;
    doc.save().lineWidth(2).strokeColor(h.color || '#f59e0b').rect(hx, hy, hw, hh).stroke().restore();
  }
}

function costTable(title, rows) {
  sectionTitle(title);
  const tableX = doc.x;
  const col1 = 200;
  const col2 = 120;
  const col3 = 120;
  doc.fontSize(10).fillColor('#0b2545').text('Scenario', tableX, doc.y, { width: col1 });
  doc.text('Monthly cost (low)', tableX + col1 + 10, doc.y, { width: col2 });
  doc.text('Monthly cost (high)', tableX + col1 + col2 + 20, doc.y, { width: col3 });
  doc.moveDown(0.4);
  for (const r of rows) {
    doc.fillColor('#111827').fontSize(10).text(r.scenario, tableX, doc.y, { width: col1 });
    doc.text(r.low, tableX + col1 + 10, doc.y, { width: col2 });
    doc.text(r.high, tableX + col1 + col2 + 20, doc.y, { width: col3 });
    doc.moveDown(0.3);
  }
  doc.moveDown(0.6);
}

// Build PDF
doc.pipe(fs.createWriteStream(outPath));

// Cover
doc.fillColor('#0b2545').fontSize(22).text('FundifyHub — Cost-first AWS Deployment Guide', { align: 'center' });
doc.moveDown(0.6);
doc.fontSize(12).fillColor('#4b5563').text('Multiple approaches, step-by-step console guidance, pros/cons, and cost estimates for 100/500/1000 monthly users', { align: 'center' });
doc.moveDown(1.6);
doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
doc.addPage();

header('Overview');
paragraph('This document provides cost-first deployment approaches for FundifyHub on AWS. It lists four approaches: A) Single EC2 + RDS (lowest cost), B) ECS Fargate + RDS (managed containers), C) Serverless (Lambda + Aurora Serverless), and D) Hybrid (ECS + EC2 worker). Each approach contains pros/cons, a step-by-step console-focused walkthrough, pictorial mock panels highlighting important choices, and rough cost estimates for 100, 500 and 1000 monthly users.');

// Approach A
header('Approach A — Single EC2 + RDS (Lowest ongoing cost)');
sectionTitle('Pros / Cons');
drawTwoColumn('Pros', '- Lowest ongoing cost\n- Simple to manage initially\n- Easy to debug (SSH access)', 'Cons', '- Single point of failure\n- Must manage OS and Redis\n- Manual scaling overhead');

sectionTitle('Step-by-step (AWS Console)');
paragraph('Below are explicit instructions and the exact AWS Console choices to use. Use the RDS console to create the Postgres instance first, then launch an EC2 instance in the same VPC, install Docker, and deploy the services with docker-compose.');

sectionTitle('1) Provision RDS — Create PostgreSQL');
paragraph('AWS Console → RDS → Create database');
paragraph('Choose: Engine=PostgreSQL, DB instance class=db.t4g.small (or db.t3.small), Multi-AZ=No, Storage=gp3 20GB, Public accessibility=No, VPC=select same VPC as EC2.');
drawMockPanel(doc.x, doc.y, 500, 130, 'RDS Console — Key choices', [
  { label: 'Engine', value: 'PostgreSQL' },
  { label: 'DB instance class', value: 'db.t4g.small' },
  { label: 'Multi-AZ', value: 'No (single-AZ)' },
  { label: 'Storage', value: 'gp3, 20 GB' }
]);
doc.moveDown(8);

sectionTitle('2) Provision EC2 — Launch instance');
paragraph('AWS Console → EC2 → Launch instance. Choose AMI: Ubuntu 22.04 LTS or Amazon Linux 2. Instance type: t4g.medium or t3.medium. Configure storage: 20GB gp3. Security group: allow SSH from your IP, allow 80/443 from 0.0.0.0/0, allow 5432 from EC2 to RDS (via SG).');
drawMockPanel(doc.x, doc.y, 500, 160, 'EC2 Launch Wizard — Key choices', [
  { label: 'AMI', value: 'Ubuntu 22.04 LTS' },
  { label: 'Instance type', value: 't4g.medium' },
  { label: 'Key pair', value: 'your-key.pem' },
  { label: 'Storage', value: '20 GB gp3' }
]);
doc.moveDown(8);

sectionTitle('3) Deploy services — Docker & docker-compose');
paragraph('SSH into EC2 and install Docker & Docker Compose. Either build images on the instance or pull from ECR. Use docker-compose to run: redis, frontend, backend, worker, and nginx for TLS termination.');
drawMockPanel(doc.x, doc.y, 500, 140, 'Commands on EC2', [
  { label: 'Install Docker', value: 'sudo apt update && sudo apt install -y docker.io' },
  { label: 'Install docker-compose', value: 'sudo apt install -y docker-compose' },
  { label: 'Run', value: 'docker-compose up -d' }
]);
doc.addPage();

sectionTitle('4) Migrate and seed — Prisma');
paragraph('Run migration and seed commands from the `packages/prisma` folder with DATABASE_URL pointing to RDS.');
drawMockPanel(doc.x, doc.y, 500, 100, 'Prisma commands', [
  { label: 'Migrate', value: 'pnpm --filter @fundifyhub/prisma run db:migrate' },
  { label: 'Seed', value: 'pnpm --filter @fundifyhub/prisma run db:seed' }
]);

sectionTitle('5) Monitor & scale');
paragraph('Create CloudWatch alarms for CPU > 70% and memory (via CloudWatch agent) and SNS notifications. When alarms trigger, consider scaling by separating services or moving to ECS.');

costTable('Estimated monthly cost — Approach A', [
  { scenario: '100 monthly users (~10k requests)', low: '$45', high: '$95' },
  { scenario: '500 monthly users (~50k requests)', low: '$60', high: '$150' },
  { scenario: '1000 monthly users (~100k requests)', low: '$100', high: '$250' }
]);

// Approach B
doc.addPage();
header('Approach B — ECS Fargate + RDS (Managed containers)');
sectionTitle('Pros / Cons');
drawTwoColumn('Pros', '- Managed orchestration, easy CI/CD\n- No EC2 maintenance', 'Cons', '- Higher base cost for always-on tasks\n- Slightly more complex initial setup');
sectionTitle('Steps');
paragraph('1) Build Docker images and push to ECR. 2) Create RDS as in Approach A. 3) Create ECS cluster (Fargate) and Task Definitions for frontend/api and worker. 4) Create ALB and configure listener/target groups. 5) CI/CD: GitHub Actions to push and update services.');
drawMockPanel(doc.x, doc.y, 500, 140, 'ECS / Fargate Key choices', [
  { label: 'Task size', value: '0.5 vCPU, 1 GB (start small)' },
  { label: 'Service', value: 'Frontend/API, Worker separate' },
  { label: 'ALB', value: 'HTTPS via ACM' }
]);

costTable('Estimated monthly cost — Approach B', [
  { scenario: '100 monthly users', low: '$80', high: '$160' },
  { scenario: '500 monthly users', low: '$120', high: '$300' },
  { scenario: '1000 monthly users', low: '$200', high: '$500' }
]);

// Approach C
doc.addPage();
header('Approach C — Serverless (Lambda + Aurora Serverless)');
sectionTitle('Pros / Cons');
drawTwoColumn('Pros', '- Auto-scaling, low ops overhead\n- Pay per use for spiky traffic', 'Cons', '- Can be expensive for steady high traffic\n- Need DB pooling/proxy');
sectionTitle('Steps');
paragraph('1) Convert Next.js and backend to serverless (serverless-next.js) or run as container-based Lambdas. 2) Use Aurora Serverless v2 or RDS Proxy to handle connections. 3) Use SQS for background jobs or lightweight Lambdas triggered by SQS. 4) CI/CD to deploy functions.');
drawMockPanel(doc.x, doc.y, 500, 140, 'Serverless Key choices', [
  { label: 'Function memory', value: '128-512 MB (optimize duration)' },
  { label: 'DB', value: 'Aurora Serverless v2 or RDS + Proxy' },
  { label: 'Queue', value: 'SQS (recommended) or ElastiCache' }
]);

costTable('Estimated monthly cost — Approach C', [
  { scenario: '100 monthly users', low: '$20', high: '$80' },
  { scenario: '500 monthly users', low: '$60', high: '$220' },
  { scenario: '1000 monthly users', low: '$120', high: '$500' }
]);

// Approach D
doc.addPage();
header('Approach D — Hybrid (ECS + EC2 worker)');
paragraph('Run frontend/API on ECS Fargate and run long-running workers on a small EC2 to reduce Fargate costs for long-running processes. Use RDS Multi-AZ for higher availability when ready.');
drawMockPanel(doc.x, doc.y, 500, 140, 'Hybrid Key choices', [
  { label: 'Frontend', value: 'ECS Fargate' },
  { label: 'Worker', value: 'EC2 t4g.small' },
  { label: 'DB', value: 'RDS Multi-AZ (optional)' }
]);
costTable('Estimated monthly cost — Approach D', [
  { scenario: '100 monthly users', low: '$80', high: '$180' },
  { scenario: '500 monthly users', low: '$120', high: '$350' },
  { scenario: '1000 monthly users', low: '$220', high: '$600' }
]);

// Footer and checklist
doc.addPage();
header('Runbook checklist & next steps');
paragraph('- Create IAM roles & limit permissions.');
paragraph('- Configure VPC with private subnets for RDS.');
paragraph('- Store secrets in AWS Secrets Manager or environment files with tight permissions.');
paragraph('- Set CloudWatch alarms (CPU, Memory, Error rates) and SNS for notifications.');
paragraph('- Keep a migration/backfill plan for existing production data before any destructive changes.');

doc.end();

console.log('Polished PDF generated at', outPath);
