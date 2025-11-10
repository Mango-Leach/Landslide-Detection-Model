// Quick script to create an admin user
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createAdmin = async () => {
    try {
        // Connect to MongoDB (or use in-memory)
        if (process.env.MONGODB_URI) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ Connected to MongoDB');
        } else {
            console.log('⚠️  Using in-memory database (data will be lost on restart)');
        }

        // Admin credentials
        const adminData = {
            username: 'admin',
            email: 'admin@iot-dashboard.com',
            password: 'admin123',
            role: 'admin'
        };

        // Check if admin exists
        const existing = await User.findOne({ email: adminData.email });
        if (existing) {
            console.log('❌ Admin user already exists!');
            console.log('   Email:', adminData.email);
            process.exit(0);
        }

        // Create admin user
        const admin = new User(adminData);
        await admin.save();

        console.log('\n✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', adminData.email);
        console.log('🔑 Password:', adminData.password);
        console.log('👤 Username:', adminData.username);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🌐 Login at: http://localhost:3000/login.html\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error.message);
        process.exit(1);
    }
};

createAdmin();
