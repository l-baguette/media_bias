const express = require('express');
const Groq = require('groq-sdk');
require('dotenv').config(); // Ensure dotenv is required to use environment variables

// Create an instance of the express application
const app = express();

// Use express.json middleware to parse JSON requests
app.use(express.json());

// Create an instance of Groq client with API key from environment variables
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Define the /get-topics route
app.post('/get-topics', async (req, res) => {
  const { title, firstParagraph } = req.body;

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `Identify the main topics of an article based on its title and first paragraph. Example topics include but are not limited to : events (eg. the presidential election, investigations, etc), people, companies, broad categories (eg. Tech, politics, geopolitics, climate change, etc.), countries, etc. Return 3 to 4 words that describe the content of the article. ENSURE THAT YOU ONLY RETURN THE 3 TO 4 WORDS SEPARATED BY COMMAS, NO OTHER TEXT OR COMMENTARY\n\nTitle: ${title}\n\nFirst Paragraph: ${firstParagraph}`
        }
      ],
      model: 'llama3-8b-8192'
    });

    const topics = response.choices[0]?.message?.content || 'No topics found';
    res.json({ topics });
  } catch (error) {
    console.error('Error fetching topics from Groq API:', error);
    res.status(500).json({ error: 'Error fetching topics' });
  }
});

// Specify a port number for the server
const port = process.env.PORT || 5001; // Use port 5001 or the port from the environment variables

// Start the server and listen to the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
