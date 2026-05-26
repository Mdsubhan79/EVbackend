// backend/routes/bills.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Bill = require('../models/Bill');
const Business = require('../models/Business');
const PDFDocument = require('pdfkit');

// Generate invoice number
async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await Bill.countDocuments();
  return `INV/${year}/${String(count + 1).padStart(4, '0')}`;
}

// Create new bill
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.userId });
    if (!business) {
      return res.status(400).json({ message: 'Please complete business details first' });
    }
    
    const invoiceNumber = await generateInvoiceNumber();
    const bill = new Bill({ 
      ...req.body,
      invoiceNumber,
      userId: req.userId,
      businessId: business._id, 
    });
    
    await bill.save();
    res.status(201).json(bill);
  } catch (error) {

  console.log(error);

  res.status(500).json({
    message: error.message,
    error
  });

}
});

// Get all bills for a user
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const bills = await Bill.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single bill
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.userId });
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update bill
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {

  try {

    const deletedBill = await Bill.findByIdAndDelete(req.params.id);

    if (!deletedBill) {
      return res.status(404).json({
        message: 'Bill not found'
      });
    }

    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });

  } catch (error) {

    res.status(500).json({
      message: 'Server Error'
    });

  }

});

// Generate PDF
router.post('/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, userId: req.userId });
    const business = await Business.findOne({ userId: req.userId });
    
    if (!bill || !business) {
      return res.status(404).json({ message: 'Data not found' });
    }
    
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${bill.invoiceNumber}.pdf`);
    
    doc.pipe(res);
    
    // Add logo
    if (business.logo) {
      try {
        const response = await fetch(business.logo);
        const buffer = await response.buffer();
        doc.image(buffer, 50, 45, { width: 100 });
      } catch(e) {}
    }
    
    // Business details
    doc.fontSize(20).text(business.businessName, 160, 50);
    doc.fontSize(10).text(business.tagline || '', 160, 75);
    doc.text(business.address, 50, 120);
    doc.text(`GSTIN: ${business.gstinNumber || 'N/A'}`, 50, 140);
    doc.text(`Phone: ${business.phone}`, 50, 160);
    
    // Invoice details
    doc.text(`Invoice No: ${bill.invoiceNumber}`, 400, 120);
    doc.text(`Date: ${new Date(bill.createdAt).toLocaleDateString()}`, 400, 140);
    
    // Customer details
    doc.fontSize(12).text('Customer Details:', 50, 200);
    doc.fontSize(10);
    doc.text(`Name: ${bill.customerDetails.name}`, 50, 220);
    doc.text(`Phone: ${bill.customerDetails.phoneNumber}`, 50, 235);
    if (bill.customerDetails.address) doc.text(`Address: ${bill.customerDetails.address}`, 50, 250);
    
    // Products table
    let y = 300;
    doc.fontSize(10).text('Product Details', 50, y);
    y += 20;
    
    // Table headers
    doc.text('Item', 50, y);
    doc.text('Description', 200, y);
    doc.text('Qty', 350, y);
    doc.text('Price', 400, y);
    doc.text('GST', 450, y);
    doc.text('Total', 500, y);
    y += 15;
    
    // Table rows
    bill.products.forEach(product => {
      doc.text(product.name, 50, y);
      doc.text(product.description || '-', 200, y, { width: 130 });
      doc.text(product.quantity.toString(), 350, y);
      doc.text(`₹${product.unitPrice}`, 400, y);
      doc.text(`${product.gstAmount || 0}%`, 450, y);
      doc.text(`₹${product.totalPrice}`, 500, y);
      y += 20;
    });
    
    y += 10;
    doc.text(`Subtotal: ₹${bill.subTotal}`, 450, y);
    y += 15;
    doc.text(`GST Total: ₹${bill.gstTotal}`, 450, y);
    y += 15;
    doc.fontSize(12).text(`Grand Total: ₹${bill.grandTotal}`, 450, y);
    
    // Warranty and footer
    y += 40;
    doc.fontSize(9).text(`Motor Warranty: ${bill.specialInstructions.motorWarranty || '12 months'}`, 50, y);
    y += 12;
    doc.text(`Battery Warranty: ${bill.specialInstructions.batteryWarranty || '12 months'}`, 50, y);
    y += 20;
    doc.text('If you have any questions about this invoice, please contact us.', 50, y);
    y += 15;
    doc.text('Thank you for your business!', 50, y);
    
    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;