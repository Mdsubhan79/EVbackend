// backend/routes/business.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Business = require('../models/Business');
const multer = require('multer'); 
const cloudinary = require('cloudinary').v2; 

// Configure Cloudinary (you need to sign up for cloudinary and add your credentials)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET, 
}); 

const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage }); 

// Save or update business details
router.post('/details', authMiddleware, upload.single('logo'), async (req, res) => {
  try { 
    let logoUrl = req.body.logo;
    
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'business_logos' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ); 
        uploadStream.end(req.file.buffer);
      });
      logoUrl = result.secure_url;
    }
    
    const businessData = {
      ...req.body,
      userId: req.userId,
      logo: logoUrl,
      updatedAt: Date.now(),
    };
    
    let business = await Business.findOneAndUpdate(
      { userId: req.userId },
      businessData,
      { new: true, upsert: true }
    );
    
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get business details
router.get('/details', authMiddleware, async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.userId });
    if (!business) {
      return res.status(404).json({ message: 'Business details not found' });
    }
    res.json(business);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;