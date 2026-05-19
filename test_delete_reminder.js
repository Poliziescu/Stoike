const axios = require('axios');

async function testDelete() {
    try {
        console.log("Sending DELETE request to localhost:3000/api/reminders/testuser/1011985...");
        const response = await axios.delete('http://localhost:3000/api/reminders/testuser/1011985');
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

testDelete();
