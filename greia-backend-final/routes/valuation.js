const express = require('express');
const router = express.Router();
// Example: using OpenAI (or any AI API)
const { OpenAI } = require('openai'); // npm install openai

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const form = req.body;

  // Compose a prompt for the AI
  const prompt = `
You are a property valuation expert. Given the following details, estimate the property's value and explain your reasoning:

Address: ${form.address}
Eircode: ${form.eircode}
Property Type: ${form['property-type']}
Bedrooms: ${form.bedrooms}
Kitchens: ${form.kitchens}
Bathrooms: ${form.bathrooms}
Living Rooms: ${form['living-rooms']}
Size: ${form.size} sqm
Year Built: ${form['year-built']}
Condition: ${form.condition}
Heating: ${form.heating}
BER: ${form['energy-rating']}
Garden: ${form.garden}
Parking: ${form.parking}
Recent Renovations: ${form['recent-renovations']}
Special Features: ${form['special-features']}

Estimate the value in euros and provide a brief explanation.
`;

  try {
    // If the API key is not set, OpenAI will throw an error
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7
    });

    const aiReply = completion.choices[0].message.content;
    res.json({ valuation: aiReply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI valuation failed." });
  }
});

module.exports = router;