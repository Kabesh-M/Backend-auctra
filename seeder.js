const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Chit = require('./models/Chit');
const bcrypt = require('bcryptjs');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Clear existing
        await User.deleteMany();
        await Chit.deleteMany();

        // Create a conductor
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const conductor = await User.create({
            mobile: '9999999999',
            role: 'conductor',
            status: 'active'
        });

        // Create a participant
        await User.create({
            mobile: '8888888888',
            role: 'participant',
            status: 'active'
        });

        // Create a sample chit
        await Chit.create({
            logCode: 'SAMPLE-CHIT-1',
            password: hashedPassword,
            conductor: conductor._id,
            totalAmount: 100000,
            participantsCount: 10,
            floorPrice: 2000,
            bidOptions: [100, 500, 1000, 2000],
            formula: 'standard'
        });

        console.log('Dummy data seeded successfully!');
        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
