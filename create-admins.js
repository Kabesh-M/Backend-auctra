const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    bankName: { type: String, trim: true, default: 'Pending' },
    bankAccount: { type: String, trim: true, default: 'Pending' },
    role: { type: String, enum: ['conductor', 'participant', 'admin'], default: 'participant' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    lastLogin: { type: Date }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

const createAdminUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        const adminUsers = [
            {
                email: 's99577939@gmail.com',
                mobile: '9999999991',
                password: 'jeevans@2004',
                bankName: 'Admin Bank 1',
                bankAccount: 'ADMIN001',
                role: 'admin',
                status: 'active'
            },
            {
                email: 'deepakarthi182005@gmail.com',
                mobile: '9999999992',
                password: 'deepak@2005',
                bankName: 'Admin Bank 2',
                bankAccount: 'ADMIN002',
                role: 'admin',
                status: 'active'
            }
        ];

        for (const adminData of adminUsers) {
            // Check if user already exists
            const existingUser = await User.findOne({ email: adminData.email });

            if (existingUser) {
                console.log(`⚠️  User ${adminData.email} already exists. Updating to admin role...`);

                // Update existing user to admin
                existingUser.role = 'admin';
                existingUser.status = 'active';
                existingUser.password = await bcrypt.hash(adminData.password, 10);
                existingUser.bankName = adminData.bankName;
                existingUser.bankAccount = adminData.bankAccount;
                await existingUser.save();

                console.log(`✅ Updated ${adminData.email} to admin`);
            } else {
                // Create new admin user
                const hashedPassword = await bcrypt.hash(adminData.password, 10);
                const newAdmin = await User.create({
                    ...adminData,
                    password: hashedPassword
                });
                console.log(`✅ Created admin user: ${newAdmin.email}`);
            }
        }

        console.log('\n🎉 Admin users setup complete!');
        console.log('\n📋 Admin Credentials:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Admin 1:');
        console.log('  Email: s99577939@gmail.com');
        console.log('  Password: jeevans@2004');
        console.log('  Phone: 9999999991');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Admin 2:');
        console.log('  Email: deepakarthi182005@gmail.com');
        console.log('  Password: deepak@2005');
        console.log('  Phone: 9999999992');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

createAdminUsers();
