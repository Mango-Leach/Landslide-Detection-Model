// Quick test script to check email alert system
// Run with: node test-email.js

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function testEmailSetup() {
    console.log('🔍 Testing Email Alert Configuration\n');
    console.log('='.repeat(50));
    
    // 1. Check .env configuration
    console.log('\n1️⃣  EMAIL CONFIGURATION:');
    console.log(`   EMAIL_USER: ${process.env.EMAIL_USER}`);
    console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '***hidden***' : '❌ NOT SET'}`);
    console.log(`   EMAIL_ENABLED: ${process.env.EMAIL_ENABLED || 'true'}`);
    
    const isEmailConfigured = 
        process.env.EMAIL_USER && 
        process.env.EMAIL_USER !== 'your-email@gmail.com' &&
        process.env.EMAIL_PASSWORD && 
        process.env.EMAIL_PASSWORD !== 'your-app-password';
    
    if (isEmailConfigured) {
        console.log(`   ✅ Email configured correctly`);
    } else {
        console.log(`   ❌ Email NOT configured (using placeholder values)`);
        console.log(`   ⚠️  Update .env file with real Gmail credentials`);
    }
    
    // 2. Connect to MongoDB
    console.log('\n2️⃣  DATABASE CONNECTION:');
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iot-dashboard');
        console.log(`   ✅ Connected to MongoDB`);
        
        // 3. Check for users with email alerts enabled
        console.log('\n3️⃣  USERS WITH EMAIL ALERTS:');
        const usersWithAlerts = await User.find({ emailAlerts: true });
        
        if (usersWithAlerts.length === 0) {
            console.log(`   ❌ No users found with emailAlerts enabled`);
            console.log(`   ⚠️  Sign up at: http://localhost:3000/signup.html`);
            
            // Check all users
            const allUsers = await User.find({});
            if (allUsers.length === 0) {
                console.log(`   ℹ️  No users in database at all`);
            } else {
                console.log(`   ℹ️  Total users: ${allUsers.length}`);
                allUsers.forEach((user, i) => {
                    console.log(`      ${i + 1}. ${user.email} - emailAlerts: ${user.emailAlerts}`);
                });
            }
        } else {
            console.log(`   ✅ Found ${usersWithAlerts.length} user(s) with email alerts:`);
            usersWithAlerts.forEach((user, i) => {
                console.log(`      ${i + 1}. ${user.email}`);
            });
        }
        
        // 4. Summary
        console.log('\n' + '='.repeat(50));
        console.log('📊 SUMMARY:\n');
        
        if (isEmailConfigured && usersWithAlerts.length > 0) {
            console.log('✅ Email alerts are READY!');
            console.log(`✅ Will send alerts to: ${usersWithAlerts.map(u => u.email).join(', ')}`);
            console.log('\n🎯 Next: Wait for temperature > 30°C or humidity > 80%');
            console.log('   Or lower thresholds in Analytics tab for instant test');
        } else {
            console.log('❌ Email alerts NOT ready. Issues:');
            if (!isEmailConfigured) {
                console.log('   • Email credentials not configured in .env');
            }
            if (usersWithAlerts.length === 0) {
                console.log('   • No users signed up with email alerts enabled');
            }
            console.log('\n📖 See EMAIL_SETUP_GUIDE.md for instructions');
        }
        
        console.log('\n' + '='.repeat(50));
        
    } catch (error) {
        console.log(`   ❌ Database error: ${error.message}`);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

testEmailSetup();
