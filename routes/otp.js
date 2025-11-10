// OTP Authentication Routes
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const emailService = require('../services/emailService');
const smsService = require('../services/smsService');
const crypto = require('crypto');

// Generate 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Email
router.post('/send-otp-email', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save OTP to user
        user.otp = { code: otp, expiresAt };
        await user.save();

        // Send OTP via email
        const emailSent = await emailService.sendOTP(email, otp, user.username);
        
        if (emailSent) {
            res.json({ 
                success: true, 
                message: 'OTP sent to your email',
                expiresIn: 300 // 5 minutes in seconds
            });
        } else {
            res.status(500).json({ message: 'Failed to send OTP email' });
        }
    } catch (error) {
        console.error('Error sending OTP email:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Send OTP via SMS
router.post('/send-otp-sms', async (req, res) => {
    try {
        const { email, phone } = req.body;

        if (!email && !phone) {
            return res.status(400).json({ message: 'Email or phone is required' });
        }

        const query = email ? { email: email.toLowerCase() } : { phone };
        const user = await User.findOne(query);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.phone) {
            return res.status(400).json({ message: 'No phone number registered for this account' });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save OTP to user
        user.otp = { code: otp, expiresAt };
        await user.save();

        // Send OTP via SMS
        const smsSent = await smsService.sendOTP(user.phone, otp);
        
        if (smsSent) {
            res.json({ 
                success: true, 
                message: `OTP sent to ${user.phone.replace(/\d(?=\d{4})/g, '*')}`,
                expiresIn: 300
            });
        } else {
            res.status(500).json({ message: 'Failed to send OTP SMS' });
        }
    } catch (error) {
        console.error('Error sending OTP SMS:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if OTP exists
        if (!user.otp || !user.otp.code) {
            return res.status(400).json({ message: 'No OTP found. Please request a new one.' });
        }

        // Check if OTP expired
        if (new Date() > user.otp.expiresAt) {
            return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
        }

        // Verify OTP
        if (user.otp.code !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // OTP is valid - clear it and update last login
        user.otp = { code: null, expiresAt: null };
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'super-secret-key-12345',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'OTP verified successfully',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
    try {
        const { email, method } = req.body; // method: 'email' or 'sms'

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate new OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        user.otp = { code: otp, expiresAt };
        await user.save();

        if (method === 'sms' && user.phone) {
            const smsSent = await smsService.sendOTP(user.phone, otp);
            if (smsSent) {
                return res.json({ 
                    success: true, 
                    message: 'OTP resent via SMS',
                    expiresIn: 300
                });
            }
        }

        // Default to email
        const emailSent = await emailService.sendOTP(email, otp, user.username);
        if (emailSent) {
            res.json({ 
                success: true, 
                message: 'OTP resent to your email',
                expiresIn: 300
            });
        } else {
            res.status(500).json({ message: 'Failed to resend OTP' });
        }
    } catch (error) {
        console.error('Error resending OTP:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
