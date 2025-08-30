require('dotenv').config();

const express = require('express');
const { LexRuntimeV2Client, RecognizeTextCommand } = require('@aws-sdk/client-lex-runtime-v2');
const router = express.Router();

const REGION = process.env.LEX_REGION;
const BOT_ID = process.env.LEX_BOT_ID;
const BOT_ALIAS_ID = process.env.LEX_BOT_ALIAS_ID;
const LOCALE_ID = process.env.LEX_LOCALE_ID;

const lexClient = new LexRuntimeV2Client({ region: REGION });

router.post('/', async (req, res) => {
  const { message, sessionId } = req.body;
  const userSessionId = sessionId || req.sessionID || 'user-session';

  try {
    const command = new RecognizeTextCommand({
      botId: BOT_ID,
      botAliasId: BOT_ALIAS_ID,
      localeId: LOCALE_ID,
      sessionId: userSessionId,
      text: message,
    });
    const response = await lexClient.send(command);
    const reply = response.messages?.[0]?.content || "Sorry, I didn't understand that.";
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;