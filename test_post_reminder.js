const axios = require('axios');

async function testPost() {
    try {
        console.log("Sending POST request to localhost:3000/api/reminders...");
        const response = await axios.post('http://localhost:3000/api/reminders', {
            username: "testuser",
            tmdb_movie_id: 1011985, // Kung Fu Panda 4 or similar
            title: "Kung Fu Panda 4",
            poster_url: "https://image.tmdb.org/t/p/w500/kDp1vUBUPmwbTyWnv7Ur65gQe5C.jpg",
            email: "test@example.com"
        });
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

testPost();
