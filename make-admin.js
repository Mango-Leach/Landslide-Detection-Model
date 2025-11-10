// Quick script to make user an admin
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function makeAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot-dashboard');
        console.log('✅ Connected to MongoDB\n');
        
        const email = 'atharvadhamdhere2006@gmail.com';
        
        const user = await User.findOneAndUpdate(
            { email },
            { 
                $set: { 
                    role: 'admin',
                    emailAlerts: true
                } 
            },
            { new: true }
        );
        
        if (user) {
            console.log('✅ User updated successfully!');
            console.log(`\n📧 Email: ${user.email}`);
            console.log(`👑 Role: ${user.role}`);
            console.log(`📬 Email Alerts: ${user.emailAlerts}`);
            console.log(`\n🎉 ${user.email} is now an ADMIN!`);
            console.log(`\n📧 Will receive email alerts when thresholds are exceeded.`);
        } else {
            console.log(`❌ User not found: ${email}`);
        }
        
        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

makeAdmin();
