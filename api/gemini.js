module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const model = req.body.model || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const contents = (req.body.messages || []).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: req.body.max_tokens || 2048 }
      })
    });
    const data = await response.json();
    if (data.candidates && data.candidates[0]) {
      const text = data.candidates[0].content.parts[0].text;
      res.json({ content: [{ type: 'text', text }] });
    } else {
      res.json({ error: data.error?.message || 'No response from Gemini' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
