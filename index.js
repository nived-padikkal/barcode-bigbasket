require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// Load from environment
const API_KEY = process.env.GOOGLE_API_KEY;
const CSE_ID = process.env.CSE_ID;

if (!API_KEY || !CSE_ID) {
  console.error("❌ Missing GOOGLE_API_KEY or CSE_ID in .env");
  process.exit(1);
}

// Extract product title from BigBasket URL
function extractTitleFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    const parts = url.pathname.split('/');
    if (parts.length >= 3) {
      const rawTitle = parts[2];
      const words = rawTitle.replace(/[^a-zA-Z0-9\-]/g, '').split('-');
      return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
  } catch (error) {
    console.error("⚠️ Error parsing title:", error.message);
  }
  return "Unknown Title";
}

// Test route
app.get('/hello', (req, res) => {
  res.send('👋 Hello from the Barcode Search API!');
});

// Barcode search route
app.get('/search', async (req, res) => {
  const barcode = req.query.barcode;
  if (!barcode) {
    return res.status(400).json({ error: "❌ Missing 'barcode' parameter" });
  }

  const query = `${barcode} site:bigbasket.com`;
  const url = 'https://www.googleapis.com/customsearch/v1';

  try {
    const { data } = await axios.get(url, {
      params: {
        q: query,
        cx: CSE_ID,
        key: API_KEY,
        searchType: 'image',
        num: 1
      }
    });

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: '❌ No results found' });
    }

    const item = data.items[0];
    const image_url = item.link;
    const page_url = item.image?.contextLink || "No Page URL";
    const title = extractTitleFromUrl(page_url);

    res.json({
      product_name: title,
      image_url,
      page_url
    });
  } catch (error) {
    console.error("❌ Error fetching search results:", error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
