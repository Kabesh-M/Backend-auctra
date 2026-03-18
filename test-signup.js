// Test script to verify signup endpoint
const testSignup = async () => {
    const testData = {
        email: "frontend-test@auctra.io",
        mobile: "5551234567",
        password: "testpass123",
        bankName: "State Bank",
        bankAccount: "987654321",
        role: "participant"
    };

    try {
        const response = await fetch('http://localhost:5000/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Signup successful!');
            console.log('User ID:', data._id);
            console.log('Email:', data.email);
            console.log('Role:', data.role);
            console.log('Token received:', data.token ? 'Yes' : 'No');
        } else {
            console.log('❌ Signup failed:', data.message);
        }
    } catch (error) {
        console.error('❌ Network error:', error.message);
    }
};

testSignup();
