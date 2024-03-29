/**
 * This Google Apps Script generates an invoice PDF from selected rows in a Google Spreadsheet and saves it to Google Drive.
 * It is designed to be customized with your company and payment information.
 *
 * Instructions:
 * - Replace placeholder values in `companyInfo`, `achRemittanceInfo`, `zelleInfo`, and `checkRemittanceInfo` with your actual information.
 * - Adjust the `exportSelectedRowToPDF` function to match the structure of your spreadsheet.
 * - Customize the invoice layout in the `exportSelectedRowToPDF` function as needed.
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Custom')
    .addItem('Generate Invoice', 'exportSelectedRowToPDF')
    .addToUi();
}

function exportSelectedRowToPDF() {
  const companyInfo = {
    name: "Your Company Name",
    address: "Your Address, City State ZIP",
    website: "www. Your Website .com"
  };

  const achRemittanceInfo = {
    bankName: "Bank",
    accountNumber: "#",
    routingNumber: "#",
    additionalInfo: "Please include the invoice number with your payment."
  };

  const zelleInfo = {
    notice: "Payments via Zelle are accepted.",
    emailAddress: "user@domain.com"
  };

  const checkRemittanceInfo = {
    payableTo: "Your Company Name",
    address: "Your Address, City State ZIP",
    additionalInfo: "Please include the invoice number on your check."
  };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sheet.getActiveRange().getRow();
  if (row <= 1) {
    SpreadsheetApp.getUi().alert('Please select a row other than the header row.');
    return;
  }

  let [jobID, client, project, billingName, billingAddress, 
      service1Listed, service1Fee, service1Quantity, 
      service2Listed, service2Fee, service2Quantity, 
      service3Listed, service3Fee, service3Quantity, 
      service4Listed, service4Fee, service4Quantity, 
      service5Listed, service5Fee, service5Quantity, 
      depositAmountInvoiced, depositReceived, status,
      discountAmount, discountDescription] = 
    sheet.getRange(row, 1, 1, 26).getValues()[0];

  const services = [];
  for (let i = 0; i < 5; i++) {
    let serviceListed = [service1Listed, service2Listed, service3Listed, service4Listed, service5Listed][i] || '';
    let serviceFee = [service1Fee, service2Fee, service3Fee, service4Fee, service5Fee][i] || 0;
    let serviceQuantity = [service1Quantity, service2Quantity, service3Quantity, service4Quantity, service5Quantity][i] || 0;

    serviceFee = parseFloat(serviceFee);
    serviceQuantity = parseInt(serviceQuantity, 10) || (serviceListed.trim() ? 1 : 0);

    if (serviceListed.trim() !== '') {
      services.push({
        listed: serviceListed,
        fee: serviceFee,
        quantity: serviceQuantity,
        total: serviceFee * serviceQuantity
      });
    }
  }

  let subtotal = services.reduce((acc, curr) => acc + curr.total, 0);
  let discount = parseFloat(discountAmount) || 0;
  let deposit = parseFloat(depositAmountInvoiced) || 0;
  let totalDue = subtotal - discount - deposit;

  const today = new Date();
  const dueDate = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));

  const doc = DocumentApp.create(`Invoice-${jobID}`);
  const body = doc.getBody();
  body.setMarginTop(72); // 1 inch
  body.setMarginBottom(72);
  body.setMarginLeft(72);
  body.setMarginRight(72);

  // Document Header
  body.appendParagraph(companyInfo.name)
      .setFontSize(16)
      .setBold(true)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(companyInfo.address)
      .setFontSize(10)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph(`${companyInfo.website}`)
      .setFontSize(10)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph("");

  // Invoice Details
  body.appendParagraph(`Invoice #: ${jobID}`).setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph(`Invoice Date: ${today.toLocaleDateString()}`).setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph(`Due Date: ${dueDate.toLocaleDateString()}`).setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph("");

  // Bill To Section
  body.appendParagraph("BILL TO:").setFontSize(10).setBold(true);
  body.appendParagraph(billingName).setFontSize(10);
  body.appendParagraph(billingAddress).setFontSize(10);
  body.appendParagraph("");

  // Services Table
  const table = body.appendTable();
  const headerRow = table.appendTableRow();
  headerRow.appendTableCell('SERVICE').setBackgroundColor('#f3f3f3').setBold(true).setFontSize(10);
  headerRow.appendTableCell('RATE').setBackgroundColor('#f3f3f3').setBold(true).setFontSize(10);
  headerRow.appendTableCell('QUANTITY').setBackgroundColor('#f3f3f3').setBold(true).setFontSize(10);
  headerRow.appendTableCell('TOTAL').setBackgroundColor('#f3f3f3').setBold(true).setFontSize(10);
  services.forEach(service => {
    const row = table.appendTableRow();
    row.appendTableCell(service.listed).setFontSize(10);
    row.appendTableCell(`$${service.fee.toFixed(2)}`).setFontSize(10);
    row.appendTableCell(`${service.quantity}`).setFontSize(10);
    row.appendTableCell(`$${service.total.toFixed(2)}`).setFontSize(10);
  });

  // Financial Summary
  body.appendParagraph(`Subtotal: $${subtotal.toFixed(2)}`).setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  if (discount > 0) {
    body.appendParagraph(`Discount: -$${discount.toFixed(2)}`).setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
  if (deposit > 0) {
    body.appendParagraph(`Deposit Received: -$${deposit.toFixed(2)}`).setFontSize(10).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  }
  body.appendParagraph(`Total Due: $${totalDue.toFixed(2)}`).setFontSize(10).setBold(true).setAlignment(DocumentApp.HorizontalAlignment.RIGHT);
  body.appendParagraph("");

  // ACH Remittance Info
  body.appendParagraph("ACH Remittance to:").setFontSize(10).setBold(true);
  body.appendParagraph(`Bank Name: ${achRemittanceInfo.bankName}`).setFontSize(10);
  body.appendParagraph(`Account Number: ${achRemittanceInfo.accountNumber}`).setFontSize(10);
  body.appendParagraph(`Routing Number: ${achRemittanceInfo.routingNumber}`).setFontSize(10);
  body.appendParagraph(achRemittanceInfo.additionalInfo).setFontSize(10);
  body.appendParagraph("");

  // Zelle Payment Information
  body.appendParagraph(zelleInfo.notice).setFontSize(10).setBold(true);
  body.appendParagraph(`Email: ${zelleInfo.emailAddress}`).setFontSize(10);
  body.appendParagraph("");

  // Physical Check Remittance Information
  body.appendParagraph("To remit by physical check, please send to:").setBold(true).setFontSize(10);
  body.appendParagraph(checkRemittanceInfo.payableTo).setFontSize(10);
  body.appendParagraph(checkRemittanceInfo.address).setFontSize(10);
  body.appendParagraph(checkRemittanceInfo.additionalInfo).setFontSize(10);

  // PDF Generation and Sharing
  doc.saveAndClose();
  const pdfBlob = doc.getAs('application/pdf');
  const folders = DriveApp.getFoldersByName("Invoices");
  let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("Invoices");
  let version = 1;
  let pdfFileName = `Invoice-${jobID}_V${String(version).padStart(2, '0')}.pdf`;
  while (folder.getFilesByName(pdfFileName).hasNext()) {
    version++;
    pdfFileName = `Invoice-${jobID}_V${String(version).padStart(2, '0')}.pdf`;
  }
  const pdfFile = folder.createFile(pdfBlob).setName(pdfFileName);
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const pdfUrl = pdfFile.getUrl();

  const htmlOutput = HtmlService.createHtmlOutput(`<html><body><p>Invoice PDF generated successfully. Version: ${version}. <a href="${pdfUrl}" target="_blank" rel="noopener noreferrer">Click here to view and download your Invoice PDF</a>.</p></body></html>`)
                                .setWidth(300)
                                .setHeight(100);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Invoice PDF Download');
  DriveApp.getFileById(doc.getId()).setTrashed(true);
}
