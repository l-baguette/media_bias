const express = require('express');
const Groq = require('groq-sdk');

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
          content: `Identify the main topics of an article based on its title and first paragraph. Example topics include but are not limited to: events (e.g., the presidential election, investigations, etc.), people, companies, broad categories (e.g., Tech, politics, geopolitics, climate change, etc.), countries, etc. Return 3 to 4 words that describe the content of the article. ENSURE THAT YOU ONLY RETURN THE 3 TO 4 WORDS SEPARATED BY COMMAS, NO OTHER TEXT OR COMMENTARY. If there is a name, company, country, or any other proper now, ENSURE IT IS THE 4TH TOPIC! Title: ${title}\n\nFirst Paragraph: ${firstParagraph}`
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

app.post('/get-keywords', async (req, res) => {
    const { title } = req.body;
  
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
  
    try {
      const response = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: `Return to me any keywords of this title, including terminology, proper nouns (names, countries, places, etc.), or any other specific details SEPARATED BY COMMAS IN ONE LINE! ENSURE YOUR RESPONSE IS ONLY ONE LINE AND DOESN'T HAVE ANY EXTRA COMMENTARY, CATEGORIZATION, CHARACTERS, ETC.  \nTitle: ${title}`
          }
        ],
        model: 'llama3-8b-8192'
      });
  
      const keywords = response.choices[0]?.message?.content || 'No keywords found';
      res.json({ keywords });
    } catch (error) {
      console.error('Error fetching keywords from Groq API:', error);
      res.status(500).json({ error: 'Error fetching keywords' });
    }
  });
  
// Specify a port number for the server
const port = process.env.PORT || 5001;

// Start the server and listen to the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


