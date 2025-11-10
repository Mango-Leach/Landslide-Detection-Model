const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createTestUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot-dashboard');
        console.log('✅ Connected to MongoDB');

        // Create a regular user (will receive evacuation emails)
        const testUser = await User.create({
            username: 'testuser',
            email: 'atharvadhamdhere2006@gmail.com', // Same email for testing
            password: 'password123',
            role: 'user',
            emailAlerts: true,
            smsAlerts: false
        });

        console.log('\n✅ Test user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Email: ${testUser.email}`);
        console.log(`👤 Role: ${testUser.role}`);
        console.log(`🔔 Email Alerts: ${testUser.emailAlerts}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('📝 Summary:');
        console.log('  - Admin users will receive: LANDSLIDE WARNING (technical details)');
        console.log('  - Regular users will receive: EVACUATION ALERT (safety instructions)');
        console.log('\n🧪 To test landslide detection, trigger these conditions:');
        console.log('  - Humidity >= 85% (Risk Score +3)');
        console.log('  - Temperature >= 35°C (Risk Score +2)');
        console.log('  - Motion detected (Risk Score +2)');
        console.log('  - Total Risk Score >= 5 triggers landslide alert\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createTestUser();
