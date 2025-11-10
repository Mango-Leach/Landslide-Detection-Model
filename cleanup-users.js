// Script to remove all users except demo and admin
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const cleanupUsers = async () => {
    try {
        // Connect to MongoDB (or use in-memory)
        if (process.env.MONGODB_URI) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ Connected to MongoDB');
        } else {
            console.log('⚠️  Using in-memory database');
            console.log('⚠️  Data cleanup only affects current session');
        }

        // Get all users
        const allUsers = await User.find({});
        console.log(`\n📊 Total users in database: ${allUsers.length}`);

        // Define users to keep
        const keepEmails = ['demo@iot.com', 'admin@iot-dashboard.com'];
        
        // Delete all users except demo and admin
        const deleteResult = await User.deleteMany({
            email: { $nin: keepEmails }
        });

        console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} user(s)`);

        // Show remaining users
        const remainingUsers = await User.find({});
        console.log(`\n✅ Remaining users: ${remainingUsers.length}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        remainingUsers.forEach(user => {
            console.log(`👤 ${user.username} (${user.email}) - Role: ${user.role}`);
        });
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error cleaning up users:', error.message);
        process.exit(1);
    }
};

cleanupUsers();
