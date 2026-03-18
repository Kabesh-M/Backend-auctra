const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const checkAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({
            email: String,
            mobile: String,
            role: String,
            status: String,
            bankName: String,
            bankAccount: String
        }));

        const admins = await User.find({
            email: { $in: ['s99577939@gmail.com', 'deepakarthi182005@gmail.com'] }
        });

        console.log('\n📋 Admin Users Found:', admins.length);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        admins.forEach((admin, index) => {
            console.log(`\nAdmin ${index + 1}:`);
            console.log(`  Email: ${admin.email}`);
            console.log(`  Mobile: ${admin.mobile}`);
            console.log(`  Role: ${admin.role}`);
            console.log(`  Status: ${admin.status}`);
            console.log(`  Bank: ${admin.bankName}`);
            console.log(`  Account: ${admin.bankAccount}`);
        });

        if (admins.length === 0) {
            console.log('\n⚠️  No admin users found!');
            console.log('Run: node create-admins.js');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

checkAdmins();
