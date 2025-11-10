const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.session?.token ||
                     req.cookies?.token;
        
        if (!token) {
            return res.status(401).json({ error: 'No authentication token, access denied' });
        }
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        // Add user to request
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '') || 
                     req.session?.token ||
                     req.cookies?.token;
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            req.user = user;
        }
    } catch (error) {
        // Continue without authentication
    }
    next();
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Admin access required' });
    }
};

module.exports = { authMiddleware, optionalAuth, adminOnly };
