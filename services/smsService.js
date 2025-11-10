// SMS Service using Twilio for sending alerts
const twilio = require('twilio');

class SMSService {
    constructor() {
        this.enabled = process.env.SMS_ENABLED === 'true';
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
        
        if (this.enabled && this.accountSid && this.authToken && this.fromNumber) {
            try {
                this.client = twilio(this.accountSid, this.authToken);
                console.log('✅ SMS service initialized successfully (Twilio)');
            } catch (error) {
                console.error('❌ Failed to initialize SMS service:', error.message);
                this.enabled = false;
            }
        } else {
            console.log('⚠️  SMS service disabled (configure Twilio credentials in .env)');
        }
    }

    async sendAlert(alertData, phoneNumbers) {
        if (!this.enabled || !this.client) {
            console.log('⚠️  SMS service not configured, skipping SMS alerts');
            return;
        }

        const message = this.formatAlertMessage(alertData);
        const results = [];

        for (const phoneNumber of phoneNumbers) {
            try {
                const result = await this.client.messages.create({
                    body: message,
                    from: this.fromNumber,
                    to: phoneNumber
                });
                
                console.log(`✅ SMS sent to ${phoneNumber} (SID: ${result.sid})`);
                results.push({ phoneNumber, success: true, sid: result.sid });
            } catch (error) {
                console.error(`❌ Failed to send SMS to ${phoneNumber}:`, error.message);
                results.push({ phoneNumber, success: false, error: error.message });
            }
        }

        return results;
    }

    async sendOTP(phoneNumber, otp) {
        if (!this.enabled || !this.client) {
            console.log('⚠️  SMS service not configured, cannot send OTP');
            return false;
        }

        const message = `Your IoT Dashboard verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nDo not share this code with anyone.`;

        try {
            const result = await this.client.messages.create({
                body: message,
                from: this.fromNumber,
                to: phoneNumber
            });
            
            console.log(`✅ OTP sent to ${phoneNumber} (SID: ${result.sid})`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to send OTP to ${phoneNumber}:`, error.message);
            return false;
        }
    }

    formatAlertMessage(alertData) {
        const { type, value, threshold, severity, timestamp } = alertData;
        
        let emoji = '⚠️';
        if (type === 'temperature') emoji = '🌡️';
        else if (type === 'humidity') emoji = '💧';
        else if (type === 'pressure') emoji = '�';
        
        const severityText = severity === 'warning' ? 'WARNING' : 'INFO';
        
        return `${emoji} IoT Alert [${severityText}]
        
${type.toUpperCase()}: ${value}
Threshold: ${threshold}
Time: ${new Date(timestamp).toLocaleString()}

- IoT Dashboard`;
    }
}

module.exports = new SMSService();
