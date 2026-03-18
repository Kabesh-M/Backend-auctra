const mongoose = require('mongoose');
const Auction = require('./models/Auction');
const Chit = require('./models/Chit');
require('dotenv').config();

async function testAuctions() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chit-auction');
        console.log('Connected to database');

        // Check existing chits
        const chits = await Chit.find({});
        console.log('Total chits in database:', chits.length);
        
        chits.forEach(chit => {
            console.log(`- Chit ID: ${chit._id}`);
            console.log(`  Log Code: ${chit.logCode}`);
            console.log(`  Conductor: ${chit.conductor}`);
            console.log('---');
        });

        // Check existing auctions
        const auctions = await Auction.find({}).populate('chit');
        console.log('Total auctions in database:', auctions.length);
        
        auctions.forEach(auction => {
            console.log(`- Auction ID: ${auction._id}`);
            console.log(`  Chit: ${auction.chit?.logCode || 'N/A'}`);
            console.log(`  Status: ${auction.status}`);
            console.log(`  Date: ${auction.auctionDate}`);
            console.log('---');
        });

        // Check scheduled/ongoing auctions specifically
        const activeAuctions = await Auction.find({
            status: { $in: ['scheduled', 'ongoing'] }
        }).populate('chit');
        
        console.log('Active auctions (scheduled/ongoing):', activeAuctions.length);

        // Create a test chit if none exist
        if (chits.length === 0) {
            console.log('Creating a test chit...');
            const testChit = await Chit.create({
                logCode: 'TEST-001',
                totalAmount: 50000,
                participantsCount: 10,
                floorPrice: 45000,
                bidOptions: [45000, 44000, 43000, 42000, 41000],
                conductor: new mongoose.Types.ObjectId() // Dummy conductor ID
            });
            console.log('Test chit created:', testChit.logCode);
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testAuctions();
