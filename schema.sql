-- AUCTRA Database Schema

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'participant', -- conductor / participant
    status VARCHAR(20) DEFAULT 'active', -- active / blocked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LOGS (CHIT)
CREATE TABLE IF NOT EXISTS chits (
    log_id SERIAL PRIMARY KEY,
    log_code VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    conductor_id INTEGER REFERENCES users(user_id),
    total_amount DECIMAL(15, 2) NOT NULL,
    participants_count INTEGER NOT NULL,
    floor_price DECIMAL(15, 2) NOT NULL,
    bid_options JSONB NOT NULL, -- array: [100,500,1000,2000]
    formula TEXT, -- monthly contribution logic
    lock_status BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active', -- active / closed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PARTICIPANTS (Mapping users to a specific chit log)
CREATE TABLE IF NOT EXISTS participants (
    participant_id SERIAL PRIMARY KEY,
    log_id INTEGER REFERENCES chits(log_id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    mobile VARCHAR(15) NOT NULL,
    photo_url TEXT,
    approved BOOLEAN DEFAULT FALSE,
    has_won BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AUCTIONS
CREATE TABLE IF NOT EXISTS auctions (
    auction_id SERIAL PRIMARY KEY,
    log_id INTEGER REFERENCES chits(log_id) ON DELETE CASCADE,
    auction_date DATE NOT NULL,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    winner_id INTEGER REFERENCES participants(participant_id),
    final_bid DECIMAL(15, 2),
    status VARCHAR(20) DEFAULT 'scheduled' -- scheduled / ongoing / completed
);

-- BIDS
CREATE TABLE IF NOT EXISTS bids (
    bid_id SERIAL PRIMARY KEY,
    auction_id INTEGER REFERENCES auctions(auction_id) ON DELETE CASCADE,
    participant_id INTEGER REFERENCES participants(participant_id) ON DELETE CASCADE,
    bid_amount DECIMAL(15, 2) NOT NULL,
    bid_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    auction_id INTEGER REFERENCES auctions(auction_id) ON DELETE SET NULL,
    participant_id INTEGER REFERENCES participants(participant_id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    mode VARCHAR(20) DEFAULT 'UPI', -- cash / UPI
    status VARCHAR(20) DEFAULT 'pending', -- pending / confirmed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    actor INTEGER REFERENCES users(user_id),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_device TEXT
);
