/**
 * PDF Agreement Generator
 * Generates loan agreement PDF with complete terms and EMI schedule
 */

import PDFDocument from 'pdfkit';

interface LoanAgreementData {
  requestNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDistrict: string;
  
  assetType: string;
  assetBrand?: string;
  assetModel?: string;
  
  approvedAmount: number;
  tenureMonths: number;
  interestRate: number;
  emiAmount: number;
  
  emiSchedule?: Array<{
    installment: number;
    paymentDate: string;
    paymentAmount: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
  
  generatedDate: string;
}

/**
 * Generate loan agreement PDF as a buffer
 */
export async function generateLoanAgreementPDF(data: LoanAgreementData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        bufferPages: true
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Helper function for section headers
      const sectionHeader = (title: string) => {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text(title.toUpperCase());
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(2).strokeColor('#2563eb').stroke();
        doc.moveDown(0.5);
        doc.fillColor('#000000');
      };

      // Helper function for info rows
      const infoRow = (label: string, value: string, yPos?: number) => {
        const y = yPos || doc.y;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text(label, 50, y);
        doc.fontSize(10).font('Helvetica').fillColor('#000000').text(value, 200, y);
      };

      // ==================== PAGE 1: COVER & PARTIES ====================
      
      // Header Banner
      doc.rect(0, 0, 595, 100).fillColor('#2563eb').fill();
      doc.fillColor('#ffffff')
         .fontSize(28)
         .font('Helvetica-Bold')
         .text('LOAN AGREEMENT', 50, 30, { align: 'center' });
      doc.fontSize(12)
         .font('Helvetica')
         .text('Secured Asset-Based Financing', { align: 'center' });
      
      doc.fillColor('#000000').moveDown(3);

      // Agreement Information Box
      doc.rect(50, doc.y, 495, 80).fillColor('#f3f4f6').fill();
      doc.fillColor('#000000');
      
      const boxY = doc.y + 15;
      doc.fontSize(11).font('Helvetica-Bold').text('Agreement Number:', 70, boxY);
      doc.fontSize(11).font('Helvetica').text(data.requestNumber, 250, boxY);
      
      doc.fontSize(11).font('Helvetica-Bold').text('Date of Issue:', 70, boxY + 25);
      doc.fontSize(11).font('Helvetica').text(new Date(data.generatedDate).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }), 250, boxY + 25);
      
      doc.fontSize(11).font('Helvetica-Bold').text('Document Type:', 70, boxY + 50);
      doc.fontSize(11).font('Helvetica').text('Asset-Based Loan Agreement', 250, boxY + 50);
      
      doc.moveDown(6);

      // SECTION 1: PARTIES
      sectionHeader('1. Parties to the Agreement');
      doc.fontSize(10).font('Helvetica');

      // Lender Box
      doc.rect(50, doc.y, 230, 100).strokeColor('#e5e7eb').lineWidth(1).stroke();
      const lenderY = doc.y + 10;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2563eb').text('LENDER', 60, lenderY);
      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text('FundifyHub Financial Services Pvt. Ltd.', 60, lenderY + 25);
      doc.fontSize(9).fillColor('#6b7280');
      doc.text('Registered Office: Mumbai, Maharashtra', 60, lenderY + 42);
      doc.text('CIN: U65999MH2024PTC123456', 60, lenderY + 57);
      doc.text('GST: 27AAACC1234D1Z5', 60, lenderY + 72);

      // Borrower Box
      doc.rect(315, lenderY - 10, 230, 100).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2563eb').text('BORROWER', 325, lenderY);
      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text(data.customerName, 325, lenderY + 25, { width: 210 });
      doc.fontSize(9).fillColor('#6b7280');
      doc.text(`Email: ${data.customerEmail}`, 325, lenderY + 42);
      doc.text(`Phone: ${data.customerPhone}`, 325, lenderY + 57);
      doc.text(`District: ${data.customerDistrict}`, 325, lenderY + 72);

      doc.fillColor('#000000').moveDown(8);

      // ==================== PAGE 2: LOAN DETAILS & ASSET ====================
      doc.addPage();

      // SECTION 2: LOAN DETAILS
      sectionHeader('2. Loan Details');

      // Financial Summary Box
      doc.rect(50, doc.y, 495, 140).fillColor('#eff6ff').fill();
      doc.fillColor('#000000');
      
      const finY = doc.y + 15;
      const col1X = 70;
      const col2X = 320;
      
      // Left Column
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text('Principal Amount:', col1X, finY);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563eb').text(`₹${data.approvedAmount.toLocaleString('en-IN')}`, col1X, finY + 20);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text('Interest Rate:', col1X, finY + 55);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563eb').text(`${data.interestRate}% p.a.`, col1X, finY + 75);
      
      // Right Column
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text('Loan Tenure:', col2X, finY);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563eb').text(`${data.tenureMonths} months`, col2X, finY + 20);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text('Monthly EMI:', col2X, finY + 55);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563eb').text(`₹${data.emiAmount.toLocaleString('en-IN')}`, col2X, finY + 75);

      // Total Payable
      const totalPayable = data.emiAmount * data.tenureMonths;
      const totalInterest = totalPayable - data.approvedAmount;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text('Total Amount Payable:', col1X, finY + 110);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#dc2626').text(`₹${totalPayable.toLocaleString('en-IN')}`, col1X + 150, finY + 110);
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text(`(Principal + Interest: ₹${totalInterest.toLocaleString('en-IN')})`, col1X + 300, finY + 113);

      doc.fillColor('#000000').moveDown(11);

      // SECTION 3: ASSET DETAILS
      sectionHeader('3. Pledged Asset Details');
      
      doc.rect(50, doc.y, 495, 80).strokeColor('#e5e7eb').lineWidth(1).stroke();
      const assetY = doc.y + 15;
      
      infoRow('Asset Type:', data.assetType, assetY);
      if (data.assetBrand) infoRow('Brand:', data.assetBrand, assetY + 20);
      if (data.assetModel) infoRow('Model:', data.assetModel, assetY + 40);
      
      doc.fontSize(9).fillColor('#dc2626').font('Helvetica-Bold').text(
        '⚠ This asset is pledged as collateral and cannot be sold or transferred during the loan period.',
        60,
        assetY + 60,
        { width: 475 }
      );

      doc.fillColor('#000000').moveDown(7);

      // ==================== PAGE 3: TERMS & CONDITIONS ====================
      doc.addPage();

      sectionHeader('4. Terms and Conditions');
      doc.fontSize(10).font('Helvetica').fillColor('#000000');

      const terms = [
        {
          title: 'Repayment Obligation',
          content: 'The Borrower agrees to repay the loan in equated monthly installments (EMI) as per the payment schedule attached to this agreement. Payment must be made on or before the due date each month.'
        },
        {
          title: 'Interest Calculation',
          content: `Interest is calculated on a reducing balance basis at ${data.interestRate}% per annum. Each EMI includes both principal and interest components as detailed in the repayment schedule.`
        },
        {
          title: 'Late Payment Penalty',
          content: 'Late payment will attract a penalty charge of 2% per month on the overdue amount. Payments not received within 15 days of the due date will be marked as overdue.'
        },
        {
          title: 'Asset Pledge',
          content: 'The asset described in Section 3 is pledged as collateral against this loan. The Borrower retains ownership but grants the Lender a first-charge security interest until full repayment.'
        },
        {
          title: 'Asset Maintenance',
          content: 'The Borrower must maintain the asset in good working condition throughout the loan tenure. The asset must be kept at the declared address and available for inspection upon request.'
        },
        {
          title: 'Restrictions on Asset',
          content: 'The Borrower cannot sell, transfer, lease, or dispose of the pledged asset without prior written consent from the Lender. Any attempt to do so will be considered a breach of contract.'
        },
        {
          title: 'Default and Repossession',
          content: 'In case of default (non-payment for 90 consecutive days), the Lender reserves the right to repossess the asset and recover outstanding dues through asset liquidation.'
        },
        {
          title: 'Prepayment Option',
          content: 'The Borrower may prepay the loan in full or in part at any time. Prepayment charges of 2% on the prepaid principal amount will be applicable.'
        },
        {
          title: 'Credit Reporting',
          content: 'The Lender may report loan performance data to credit bureaus (CIBIL, Experian, Equifax). Defaults will negatively impact the Borrower\'s credit score.'
        },
        {
          title: 'Insurance',
          content: 'The Borrower is advised to maintain comprehensive insurance coverage on the pledged asset. Insurance details must be shared with the Lender.'
        },
        {
          title: 'Fees and Charges',
          content: 'The Borrower agrees to pay all applicable processing fees, GST, documentation charges, and legal charges as communicated at the time of loan sanction.'
        },
        {
          title: 'Dispute Resolution',
          content: 'Any disputes arising from this agreement shall be resolved through arbitration as per the Arbitration and Conciliation Act, 1996. The jurisdiction shall be Mumbai, Maharashtra.'
        },
        {
          title: 'Governing Law',
          content: 'This agreement is governed by and construed in accordance with the laws of India. All parties submit to the exclusive jurisdiction of Indian courts.'
        }
      ];

      terms.forEach((term, index) => {
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#2563eb').text(`${index + 1}. ${term.title}`);
        doc.fontSize(9).font('Helvetica').fillColor('#374151').text(term.content, { indent: 20, width: 495 });
        doc.moveDown(0.8);
        
        if (doc.y > 700) {
          doc.addPage();
        }
      });

      // ==================== PAGE 4: EMI SCHEDULE ====================
      if (data.emiSchedule && data.emiSchedule.length > 0) {
        doc.addPage();
        sectionHeader('5. EMI Payment Schedule');

        // Summary box
        doc.rect(50, doc.y, 495, 60).fillColor('#f9fafb').fill();
        const summY = doc.y + 10;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151');
        doc.text(`Total Installments: ${data.emiSchedule.length}`, 70, summY);
        doc.text(`First EMI Date: ${new Date(data.emiSchedule[0].paymentDate).toLocaleDateString('en-IN')}`, 70, summY + 20);
        doc.text(`Last EMI Date: ${new Date(data.emiSchedule[data.emiSchedule.length - 1].paymentDate).toLocaleDateString('en-IN')}`, 70, summY + 40);
        
        const totalPay = data.emiSchedule.reduce((sum, emi) => sum + emi.paymentAmount, 0);
        const totalPrin = data.emiSchedule.reduce((sum, emi) => sum + emi.principal, 0);
        const totalInt = data.emiSchedule.reduce((sum, emi) => sum + emi.interest, 0);
        
        doc.text(`Total Principal: ₹${Math.round(totalPrin).toLocaleString('en-IN')}`, 320, summY);
        doc.text(`Total Interest: ₹${Math.round(totalInt).toLocaleString('en-IN')}`, 320, summY + 20);
        doc.text(`Total Payable: ₹${Math.round(totalPay).toLocaleString('en-IN')}`, 320, summY + 40);
        
        doc.fillColor('#000000').moveDown(5);

        // Table Header
        doc.rect(50, doc.y, 495, 25).fillColor('#2563eb').fill();
        const headerY = doc.y + 7;
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
        doc.text('#', 60, headerY, { width: 30 });
        doc.text('Due Date', 95, headerY, { width: 80 });
        doc.text('EMI Amount', 180, headerY, { width: 70, align: 'right' });
        doc.text('Principal', 255, headerY, { width: 70, align: 'right' });
        doc.text('Interest', 330, headerY, { width: 70, align: 'right' });
        doc.text('Balance', 405, headerY, { width: 80, align: 'right' });
        
        doc.moveDown(2);

        // Table Rows
        doc.fontSize(8).font('Helvetica').fillColor('#000000');
        data.emiSchedule.forEach((emi, idx) => {
          const y = doc.y;
          
          // Alternating row colors
          if (idx % 2 === 0) {
            doc.rect(50, y, 495, 18).fillColor('#f9fafb').fill();
          }
          
          doc.fillColor('#000000');
          doc.text(emi.installment.toString(), 60, y + 5, { width: 30 });
          doc.text(new Date(emi.paymentDate).toLocaleDateString('en-IN'), 95, y + 5, { width: 80 });
          doc.text(`₹${Math.round(emi.paymentAmount).toLocaleString('en-IN')}`, 180, y + 5, { width: 70, align: 'right' });
          doc.text(`₹${Math.round(emi.principal).toLocaleString('en-IN')}`, 255, y + 5, { width: 70, align: 'right' });
          doc.text(`₹${Math.round(emi.interest).toLocaleString('en-IN')}`, 330, y + 5, { width: 70, align: 'right' });
          doc.text(`₹${Math.round(emi.balance).toLocaleString('en-IN')}`, 405, y + 5, { width: 80, align: 'right' });
          
          doc.moveDown(1.2);
          
          // Add page break if needed
          if (doc.y > 720) {
            doc.addPage();
            // Repeat header on new page
            doc.rect(50, doc.y, 495, 25).fillColor('#2563eb').fill();
            const newHeaderY = doc.y + 7;
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
            doc.text('#', 60, newHeaderY, { width: 30 });
            doc.text('Due Date', 95, newHeaderY, { width: 80 });
            doc.text('EMI Amount', 180, newHeaderY, { width: 70, align: 'right' });
            doc.text('Principal', 255, newHeaderY, { width: 70, align: 'right' });
            doc.text('Interest', 330, newHeaderY, { width: 70, align: 'right' });
            doc.text('Balance', 405, newHeaderY, { width: 80, align: 'right' });
            doc.moveDown(2);
            doc.fillColor('#000000').font('Helvetica');
          }
        });
      }

      // ==================== FINAL PAGE: SIGNATURES ====================
      doc.addPage();
      sectionHeader('6. Signatures and Acceptance');

      doc.fontSize(10).font('Helvetica').fillColor('#000000');
      doc.text(
        'By signing below, both parties acknowledge that they have read, understood, and agree to be bound by all terms and conditions outlined in this loan agreement.',
        { width: 495, align: 'justify' }
      );
      doc.moveDown(2);

      // Signature boxes
      const sigY = doc.y;
      
      // Borrower signature box
      doc.rect(50, sigY, 230, 150).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2563eb').text('BORROWER', 60, sigY + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text('(Sign within the box below)', 60, sigY + 28);
      
      doc.rect(60, sigY + 45, 210, 60).strokeColor('#d1d5db').lineWidth(1).dash(5, { space: 3 }).stroke();
      doc.fontSize(8).fillColor('#9ca3af').text('Digital signature will appear here', 80, sigY + 70, { width: 170, align: 'center' });
      doc.undash();
      
      doc.fontSize(9).font('Helvetica').fillColor('#000000');
      doc.text(`Name: ${data.customerName}`, 60, sigY + 115);
      doc.text('Date: _______________', 60, sigY + 130);

      // Lender signature box
      doc.rect(315, sigY, 230, 150).strokeColor('#e5e7eb').lineWidth(1).stroke();
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#2563eb').text('LENDER', 325, sigY + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#6b7280').text('(Authorized Signatory)', 325, sigY + 28);
      
      doc.rect(325, sigY + 45, 210, 60).strokeColor('#d1d5db').lineWidth(1).stroke();
      
      doc.fontSize(9).font('Helvetica').fillColor('#000000');
      doc.text('Name: ___________________', 325, sigY + 115);
      doc.text('Designation: Authorized Officer', 325, sigY + 130);
      doc.text('FundifyHub Financial Services', 325, sigY + 145);

      // Witness section
      doc.moveDown(12);
      doc.fontSize(10).font('Helvetica-Bold').text('WITNESSES', { underline: true });
      doc.moveDown(0.5);
      
      const witY = doc.y;
      doc.fontSize(9).font('Helvetica');
      doc.text('Witness 1:', 60, witY);
      doc.text('Name: _____________________', 60, witY + 20);
      doc.text('Signature: __________________', 60, witY + 40);
      
      doc.text('Witness 2:', 320, witY);
      doc.text('Name: _____________________', 320, witY + 20);
      doc.text('Signature: __________________', 320, witY + 40);

      // Footer on last page
      doc.fontSize(8).fillColor('#6b7280').text(
        `Document ID: ${data.requestNumber} | Generated on: ${new Date(data.generatedDate).toLocaleDateString('en-IN')} | Page ${doc.bufferedPageRange().count}`,
        50,
        750,
        { align: 'center', width: 495 }
      );
      
      doc.fontSize(7).text(
        'This is a digitally generated document. For queries, contact support@fundifyhub.com',
        50,
        765,
        { align: 'center', width: 495 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
