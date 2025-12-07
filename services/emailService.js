const nodemailer = require('nodemailer');
const Alert = require('../models/Alert');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
        this.initializeTransporter();
    }
    
    initializeTransporter() {
        try {
            if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
                console.log('⚠️  Email credentials not configured. Email alerts disabled.');
                this.initialized = false;
                return;
            }
            
            // Check if nodemailer is properly loaded
            if (typeof nodemailer.createTransport !== 'function') {
                console.log('⚠️  Nodemailer not properly loaded. Email alerts disabled.');
                this.initialized = false;
                return;
            }
            
            this.transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
            
            this.initialized = true;
            console.log('✅ Email service initialized successfully');
        } catch (error) {
            console.error('⚠️  Failed to initialize email service:', error.message);
            this.initialized = false;
        }
    }
    
    async sendAlert(alert, recipients) {
        if (!this.initialized) {
            console.log('Email service not initialized');
            return false;
        }
        
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: recipients.join(','),
                subject: `IntelliSlide Alert: ${alert.type.toUpperCase()} - ${alert.severity.toUpperCase()}`,
                html: this.generateAlertHTML(alert)
            };
            
            await this.transporter.sendMail(mailOptions);
            
            // Mark alert as email sent
            if (alert._id) {
                await Alert.findByIdAndUpdate(alert._id, { emailSent: true });
            }
            
            console.log(`Alert email sent to: ${recipients.join(', ')}`);
            return true;
        } catch (error) {
            console.error('Failed to send alert email:', error);
            return false;
        }
    }
    
    generateAlertHTML(alert) {
        const severityColors = {
            info: '#3b82f6',
            warning: '#f59e0b',
            critical: '#ef4444'
        };
        
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: ${severityColors[alert.severity]}; color: white; padding: 20px; border-radius: 10px 10px 0 0; }
                    .content { background: #f8fafc; padding: 20px; border-radius: 0 0 10px 10px; }
                    .alert-box { background: white; padding: 15px; border-left: 4px solid ${severityColors[alert.severity]}; margin: 10px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🚨 IntelliSlide Alert</h2>
                        <p>Severity: ${alert.severity.toUpperCase()}</p>
                    </div>
                    <div class="content">
                        <div class="alert-box">
                            <h3>${alert.type.toUpperCase()} Alert</h3>
                            <p><strong>Message:</strong> ${alert.message}</p>
                            ${alert.value ? `<p><strong>Current Value:</strong> ${alert.value}</p>` : ''}
                            ${alert.threshold ? `<p><strong>Threshold:</strong> ${alert.threshold}</p>` : ''}
                            <p><strong>Device:</strong> ${alert.deviceId}</p>
                            <p><strong>Time:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
                        </div>
                        <p>Please check your IntelliSlide dashboard for more details.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from IntelliSlide</p>
                        <p>Do not reply to this email</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    
    async sendOTP(email, otp, username) {
        if (!this.initialized) {
            console.log('Email service not initialized');
            return false;
        }
        
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: email,
                subject: 'Your IntelliSlide Verification Code',
                html: this.generateOTPHTML(otp, username)
            };
            
            await this.transporter.sendMail(mailOptions);
            console.log(`OTP email sent to: ${email}`);
            return true;
        } catch (error) {
            console.error('Failed to send OTP email:', error);
            return false;
        }
    }
    
    generateOTPHTML(otp, username) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .otp-box { background: white; padding: 30px; text-align: center; border-radius: 10px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .otp-code { font-size: 36px; font-weight: bold; color: #6366f1; letter-spacing: 8px; margin: 20px 0; }
                    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>🔐 Verification Code</h2>
                        <p>IntelliSlide</p>
                    </div>
                    <div class="content">
                        <p>Hello ${username},</p>
                        <p>Your verification code for IntelliSlide is:</p>
                        <div class="otp-box">
                            <div class="otp-code">${otp}</div>
                            <p style="color: #666; font-size: 14px;">Enter this code to complete your login</p>
                        </div>
                        <div class="warning">
                            <p><strong>⚠️ Security Notice:</strong></p>
                            <ul>
                                <li>This code will expire in <strong>5 minutes</strong></li>
                                <li>Do not share this code with anyone</li>
                                <li>If you didn't request this code, please ignore this email</li>
                            </ul>
                        </div>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from IntelliSlide</p>
                        <p>Do not reply to this email</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
    
    async sendDailySummary(recipients, stats) {
        if (!this.initialized) return false;
        
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: recipients.join(','),
                subject: 'IntelliSlide - Daily Summary',
                html: this.generateSummaryHTML(stats)
            };
            
            await this.transporter.sendMail(mailOptions);
            console.log('Daily summary email sent');
            return true;
        } catch (error) {
            console.error('Failed to send summary email:', error);
            return false;
        }
    }
    
    generateSummaryHTML(stats) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
                    .stats { background: #f8fafc; padding: 20px; }
                    .stat-row { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #6366f1; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>📊 Daily Summary Report</h2>
                        <p>${new Date().toLocaleDateString()}</p>
                    </div>
                    <div class="stats">
                        <div class="stat-row">
                            <h3>🌡️ Temperature</h3>
                            <p>Average: ${stats.temperature?.avg?.toFixed(2)}°C</p>
                            <p>Min: ${stats.temperature?.min?.toFixed(2)}°C | Max: ${stats.temperature?.max?.toFixed(2)}°C</p>
                        </div>
                        <div class="stat-row">
                            <h3>💧 Humidity</h3>
                            <p>Average: ${stats.humidity?.avg?.toFixed(2)}%</p>
                            <p>Min: ${stats.humidity?.min?.toFixed(2)}% | Max: ${stats.humidity?.max?.toFixed(2)}%</p>
                        </div>
                        <div class="stat-row">
                            <h3>🌡️ Pressure</h3>
                            <p>Average: ${stats.pressure?.avg?.toFixed(1)} hPa</p>
                            <p>Min: ${stats.pressure?.min?.toFixed(1)} hPa | Max: ${stats.pressure?.max?.toFixed(1)} hPa</p>
                        </div>
                        <div class="stat-row">
                            <h3>📈 Data Points</h3>
                            <p>Total readings today: ${stats.dataPoints || 0}</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Landslide Warning - Admin Alert
    async sendLandslideAdminWarning(alertData, adminEmails) {
        if (!this.initialized) {
            console.log('Email service not initialized');
            return false;
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: adminEmails.join(','),
                subject: '🚨 LANDSLIDE WARNING DETECTED - ADMIN ALERT',
                html: this.generateLandslideAdminHTML(alertData)
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Landslide admin warning sent to: ${adminEmails.join(', ')}`);
            return true;
        } catch (error) {
            console.error('Failed to send landslide admin warning:', error);
            return false;
        }
    }

    // Landslide Warning - User Alert
    async sendLandslideUserAlert(alertData, userEmails) {
        if (!this.initialized) {
            console.log('Email service not initialized');
            return false;
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
                to: userEmails.join(','),
                subject: '🚨 URGENT: LANDSLIDE ALERT - EVACUATE IMMEDIATELY',
                html: this.generateLandslideUserHTML(alertData)
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Landslide evacuation alert sent to: ${userEmails.join(', ')}`);
            return true;
        } catch (error) {
            console.error('Failed to send landslide user alert:', error);
            return false;
        }
    }

    generateLandslideAdminHTML(alertData) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 700px; margin: 0 auto; }
                    .header { background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .warning-icon { font-size: 60px; margin-bottom: 10px; }
                    .content { background: #fef2f2; padding: 30px; }
                    .alert-box { background: white; padding: 25px; border-left: 6px solid #dc2626; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                    .data-item { background: #fff7ed; padding: 15px; border-radius: 8px; border-left: 3px solid #f59e0b; }
                    .data-item strong { display: block; color: #92400e; margin-bottom: 5px; }
                    .critical { background: #fee2e2; border-left-color: #dc2626; }
                    .critical strong { color: #991b1b; }
                    .action-section { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .action-section h3 { color: #1e40af; margin-top: 0; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #666; font-size: 13px; }
                    ul { margin: 10px 0; }
                    li { margin: 8px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="warning-icon">⚠️</div>
                        <h1>LANDSLIDE WARNING DETECTED</h1>
                        <p style="margin: 5px 0; font-size: 16px;">Administrative Alert</p>
                    </div>
                    <div class="content">
                        <div class="alert-box">
                            <h2 style="color: #dc2626; margin-top: 0;">⚡ CRITICAL CONDITIONS DETECTED</h2>
                            <p style="font-size: 16px;"><strong>Time:</strong> ${new Date(alertData.timestamp).toLocaleString()}</p>
                            <p style="font-size: 16px;"><strong>Device ID:</strong> ${alertData.deviceId}</p>
                            <p style="font-size: 16px;"><strong>Risk Level:</strong> <span style="color: #dc2626; font-weight: bold;">HIGH</span></p>
                        </div>

                        <h3 style="color: #dc2626;">📊 Sensor Readings:</h3>
                        <div class="data-grid">
                            ${alertData.temperature ? `
                            <div class="data-item ${alertData.temperature > 35 ? 'critical' : ''}">
                                <strong>🌡️ Temperature</strong>
                                <span style="font-size: 22px; font-weight: bold;">${alertData.temperature.toFixed(1)}°C</span>
                            </div>` : ''}
                            ${alertData.humidity ? `
                            <div class="data-item ${alertData.humidity > 80 ? 'critical' : ''}">
                                <strong>💧 Humidity</strong>
                                <span style="font-size: 22px; font-weight: bold;">${alertData.humidity.toFixed(1)}%</span>
                            </div>` : ''}
                            ${alertData.pressure ? `
                            <div class="data-item">
                                <strong>🌍 Pressure</strong>
                                <span style="font-size: 22px; font-weight: bold;">${alertData.pressure.toFixed(1)} hPa</span>
                            </div>` : ''}
                            ${alertData.soilMoisture !== undefined ? `
                            <div class="data-item ${alertData.soilMoisture > 80 ? 'critical' : ''}">
                                <strong>🌱 Soil Moisture</strong>
                                <span style="font-size: 22px; font-weight: bold;">${alertData.soilMoisture.toFixed(1)}%</span>
                            </div>` : ''}
                        </div>

                        <div class="action-section">
                            <h3>🎯 Required Admin Actions:</h3>
                            <ul>
                                <li><strong>Verify sensor data</strong> in the IntelliSlide dashboard immediately</li>
                                <li><strong>Contact local authorities</strong> and emergency services</li>
                                <li><strong>Initiate evacuation protocols</strong> for affected areas</li>
                                <li><strong>Monitor real-time data</strong> for any changes in conditions</li>
                                <li><strong>Alert all registered users</strong> in the danger zone</li>
                                <li><strong>Document all actions taken</strong> for compliance records</li>
                            </ul>
                        </div>

                        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                            <h3 style="color: #92400e; margin-top: 0;">⚠️ Landslide Risk Indicators:</h3>
                            <ul>
                                ${alertData.humidity > 80 ? '<li><strong>High humidity detected</strong> - Soil saturation risk</li>' : ''}
                                ${alertData.temperature > 35 ? '<li><strong>High temperature</strong> - Increased ground instability</li>' : ''}
                                ${alertData.soilMoisture > 80 ? '<li><strong>Critical soil moisture</strong> - Imminent landslide risk</li>' : ''}
                                ${alertData.motion ? '<li><strong>Motion detected</strong> - Possible ground movement</li>' : ''}
                                <li><strong>Multiple parameters exceed safe thresholds</strong></li>
                            </ul>
                        </div>

                        <p style="text-align: center; font-size: 16px; margin-top: 25px; color: #dc2626;">
                            <strong>⏰ This is an automated alert - Immediate action required</strong>
                        </p>
                    </div>
                    <div class="footer">
                        <p><strong>IoT Landslide Monitoring System</strong></p>
                        <p>This is an automated administrative alert</p>
                        <p>Dashboard: <a href="http://localhost:3000">http://localhost:3000</a></p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    generateLandslideUserHTML(alertData) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 650px; margin: 0 auto; }
                    .header { background: linear-gradient(135deg, #dc2626, #991b1b); color: white; padding: 40px 30px; text-align: center; }
                    .header h1 { margin: 0; font-size: 32px; text-transform: uppercase; letter-spacing: 2px; }
                    .warning-icon { font-size: 80px; margin-bottom: 15px; animation: pulse 1s infinite; }
                    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                    .content { background: #fef2f2; padding: 30px; }
                    .emergency-box { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px; margin: 20px 0; }
                    .emergency-box h2 { margin: 0 0 15px 0; font-size: 28px; }
                    .emergency-box p { font-size: 18px; margin: 10px 0; }
                    .action-steps { background: white; padding: 25px; border-radius: 10px; margin: 20px 0; border: 3px solid #dc2626; }
                    .action-steps h3 { color: #dc2626; margin-top: 0; font-size: 22px; }
                    .step { background: #fef3c7; padding: 15px; margin: 12px 0; border-radius: 8px; border-left: 5px solid #f59e0b; }
                    .step-number { display: inline-block; background: #f59e0b; color: white; width: 30px; height: 30px; border-radius: 50%; text-align: center; line-height: 30px; font-weight: bold; margin-right: 10px; }
                    .safe-locations { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }
                    .safe-locations h3 { color: #065f46; margin-top: 0; }
                    .emergency-contacts { background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .emergency-contacts h3 { color: #1e40af; margin-top: 0; }
                    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #666; font-size: 13px; }
                    .warning-banner { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <div class="warning-icon">🚨</div>
                        <h1>LANDSLIDE ALERT</h1>
                        <p style="font-size: 20px; margin: 10px 0;">EVACUATE IMMEDIATELY</p>
                    </div>
                    <div class="content">
                        <div class="emergency-box">
                            <h2>⚡ EMERGENCY EVACUATION REQUIRED</h2>
                            <p><strong>Time:</strong> ${new Date(alertData.timestamp).toLocaleString()}</p>
                            <p style="font-size: 22px; margin-top: 20px;"><strong>DO NOT DELAY - LEAVE NOW</strong></p>
                        </div>

                        <div class="warning-banner">
                            <p style="margin: 0; font-size: 16px; color: #92400e;"><strong>⚠️ Critical landslide conditions detected in your area</strong></p>
                        </div>

                        <div class="action-steps">
                            <h3>🏃 IMMEDIATE ACTION STEPS:</h3>
                            
                            <div class="step">
                                <span class="step-number">1</span>
                                <strong>LEAVE IMMEDIATELY</strong> - Do not wait or gather belongings
                            </div>
                            
                            <div class="step">
                                <span class="step-number">2</span>
                                <strong>ALERT FAMILY & NEIGHBORS</strong> - Warn everyone in the area
                            </div>
                            
                            <div class="step">
                                <span class="step-number">3</span>
                                <strong>MOVE TO HIGH GROUND</strong> - Get away from hillsides and slopes
                            </div>
                            
                            <div class="step">
                                <span class="step-number">4</span>
                                <strong>AVOID RIVER VALLEYS</strong> - Stay away from water channels
                            </div>
                            
                            <div class="step">
                                <span class="step-number">5</span>
                                <strong>CALL EMERGENCY SERVICES</strong> - Report your evacuation
                            </div>
                        </div>

                        <div class="safe-locations">
                            <h3>✅ SAFE EVACUATION LOCATIONS:</h3>
                            <ul>
                                <li><strong>Community Center</strong> - Main Road, 2km North</li>
                                <li><strong>School Building</strong> - Highland Area</li>
                                <li><strong>Government Office</strong> - City Center</li>
                                <li><strong>Emergency Shelter</strong> - Stadium Complex</li>
                            </ul>
                            <p style="margin-top: 15px;"><strong>Move perpendicular to the landslide path, not downslope</strong></p>
                        </div>

                        <div class="emergency-contacts">
                            <h3>📞 EMERGENCY CONTACTS:</h3>
                            <ul>
                                <li><strong>Emergency Services:</strong> 911</li>
                                <li><strong>Disaster Management:</strong> 1-800-DISASTER</li>
                                <li><strong>Local Police:</strong> Contact local station</li>
                                <li><strong>Rescue Hotline:</strong> Available 24/7</li>
                            </ul>
                        </div>

                        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border: 2px solid #dc2626; margin: 20px 0;">
                            <h3 style="color: #991b1b; margin-top: 0;">❌ DO NOT:</h3>
                            <ul>
                                <li>Return to your home until authorities declare it safe</li>
                                <li>Cross bridges or roads near hillsides</li>
                                <li>Try to rescue possessions or pets alone</li>
                                <li>Ignore this warning - conditions are critical</li>
                            </ul>
                        </div>

                        <p style="text-align: center; font-size: 18px; margin-top: 25px; color: #dc2626;">
                            <strong>⚠️ YOUR LIFE IS MORE IMPORTANT THAN PROPERTY</strong><br>
                            <strong>EVACUATE NOW</strong>
                        </p>
                    </div>
                    <div class="footer">
                        <p><strong>IoT Landslide Monitoring System</strong></p>
                        <p>This is an automated emergency alert</p>
                        <p>Take immediate action to protect yourself and others</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

module.exports = new EmailService();
