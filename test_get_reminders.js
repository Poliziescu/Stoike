const axios = require('axios');

async function testGet() {
    try {
        console.log("Sending GET request to localhost:3000/api/reminders/testuser...");
        const response = await axios.get('http://localhost:3000/api/reminders/testuser');
        console.log("Response Status:", response.status);
        console.log("Response Data:", response.data);
    } catch (err) {
        console.error("Error Message:", err.message);
        if (err.response) {
            console.error("Error Status:", err.response.status);
            console.error("Error Data:", err.response.data);
        }
    }
}

testGet();
