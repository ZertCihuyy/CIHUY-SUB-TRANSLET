const express = require("express");
const router = express.Router();
const axios = require("axios");
const { delay } = require("../utils/utils.js");
const { langs } = require("google-translate-api-x/lib/languages.cjs");

const {
  WEBVTT_DELIMITER,
  WEBVTT_MAX_CHARS,
  WEBVTT_SPLIT_REGEX,
  SOCIAL_LINKS
} = require("../constant.js");
const globalVars = require("../global.js");
const { appLog } = globalVars;
const translate = require("google-translate-api-x");

// Render the homepage with EJS template
router.get("/", (req, res) => {
  let langOptions = Object.entries(langs).filter(([code, name]) => code !== "auto").map(([code, name]) => 
    `<option value="${code}">${name} : ${code}</option>`
  ).join('');

  res.render("index", { langOptions, SOCIAL_LINKS });
});

// Show API info
router.get("/power", (req, res) => {
  res.send("google-translate-api-x");
});

// Show who developed this project
router.get("/developer", (req, res) => {
  res.send("ZertCihuy");
});

// Show all logs based on AppLog instance and its current level
router.get("/log", (req, res) => {
  const logs = appLog.getLogs();
  res.json({
    total_logs: logs.length,
    logs: logs,
  });
});

// Show server status and health info
router.get("/status", (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: "Online 🟢",
    uptime: Math.floor(process.uptime()) + " detik",
    memory_usage: Math.round(mem.rss / 1024 / 1024) + " MB",
    timestamp: new Date().toISOString(),
  });
});

// Show total successful translations
router.get("/jumlah-terjemah", (req, res) => {
  res.json({
    total_terjemahan_sukses: globalVars.TOTAL_TRANSLATED,
  });
});

// Main handler for translation requests
router.get("/get-vtt", async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { url, lang = "id" } = req.query;

  // Validate required parameter
  if (!url) {
    appLog.error("Missing 'url' query parameter in /get-vtt request", {
      query: req.query,
    });
    return res
      .status(400)
      .json({ error: "Missing 'url' query parameter", requestId });
  }

  // Append log
  appLog.info("Received /get-vtt request", {
    url,
    lang,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    requestId,
  });

  // Setup res headers for streaming response
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    // fetch the VTT content from the provided URL
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
      },
      timeout: 30000,
    });

    // Strip HTML tags before translating, restore after
    const stripHtml = (str) => str.replace(/<[^>]+>/g, "");
    const htmlTagMap = {};

    // Chunk var
    const chunks = [];
    let currentChunkText = "";
    let currentChunkIndices = [];

    const contentLines = response.data.split(/\r?\n/);

    // Before chunking, store tags per line index
    contentLines.forEach((line, i) => {
      const tags = line.match(/<[^>]+>/g);
      if (tags) htmlTagMap[i] = tags;
    });

    let insideCue = false;

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i].trim();

      if (line.includes("-->")) {
        insideCue = true;
        continue;
      }

      if (line === "") {
        insideCue = false; // blank line = cue separator
        continue;
      }

      const isDialog =
        insideCue &&
        !line.startsWith("WEBVTT") &&
        !line.startsWith("NOTE") &&
        isNaN(line);

      if (!isDialog) {
        continue; // Skip non-dialog lines
      }

      if (
        (currentChunkText + WEBVTT_DELIMITER + line).length > WEBVTT_MAX_CHARS
      ) {
        chunks.push({
          text: currentChunkText,
          indices: [...currentChunkIndices],
        });

        currentChunkText = line;
        currentChunkIndices = [i];
      } else {
        currentChunkText += (currentChunkText ? WEBVTT_DELIMITER : "") + line;
        currentChunkIndices.push(i);
      }
    }

    // Push the last chunk if it has content
    if (currentChunkText) {
      chunks.push({
        text: currentChunkText,
        indices: [...currentChunkIndices],
      });
    }

    // Process translation and streaming
    let lastPrintedIndex = -1;

    // Send the header first
    for (let i = 0; i < contentLines.length; i++) {
      if (
        !contentLines[i].startsWith("WEBVTT") &&
        !contentLines[i].startsWith("NOTE")
      ) {
        break;
      }

      res.write(contentLines[i] + "\n");
      lastPrintedIndex = i;
    }

    // Process each chunk sequentially
    for (const chunk of chunks) {
      try {
        const responseTranslate = await translate(stripHtml(chunk.text), {
          to: lang,
          client: "gtx",
          forceTo: true,
        });
        const translatedParts =
          responseTranslate.text.split(WEBVTT_SPLIT_REGEX);

        // Update the original content with the translated text
        translatedParts.forEach((part, idx) => {
          const lineIdx = chunk.indices[idx];
          if (htmlTagMap[lineIdx]) {
            // Re-wrap with original opening/closing tags
            const openTag = htmlTagMap[lineIdx][0];
            const closeTag =
              htmlTagMap[lineIdx].length > 1
                ? htmlTagMap[lineIdx][htmlTagMap[lineIdx].length - 1]
                : "";
            contentLines[lineIdx] = `${openTag}${part}${closeTag}`;
          } else {
            contentLines[lineIdx] = part;
          }
        });
      } catch (err) {
        appLog.error("Translation error for chunk", {
          msg: err.message,
          chunkText: chunk.text,
          indices: chunk.indices,
          requestId,
        });
        console.error(`Translation error in request ${requestId}:`, err);
      }

      // Flush to client
      const maxIndexToPrint = chunk.indices[chunk.indices.length - 1];

      for (let i = lastPrintedIndex + 1; i <= maxIndexToPrint; i++) {
        if (contentLines[i] === undefined) {
          continue;
        }
        res.write(contentLines[i] + "\n");
      }
      lastPrintedIndex = maxIndexToPrint;
    }

    // Send the remaining lines if any
    for (let i = lastPrintedIndex + 1; i < contentLines.length; i++) {
      if (contentLines[i] === undefined) {
        continue;
      }
      res.write(contentLines[i] + "\n");
    }

    globalVars.TOTAL_TRANSLATED++;
    appLog.success("Successfully processed /get-vtt request", {
      url,
      lang,
      totalTranslated: globalVars.TOTAL_TRANSLATED,
      requestId,
    });
    res.end();
  } catch (err) {
    appLog.error("Error processing /get-vtt request", {
      msg: err.message,
      url,
      lang,
      requestId,
    });
    console.error(`Error in request ${requestId}:`, err);
    if (res.headersSent) {
      res.write("\n\nERROR: Failed to process the request. " + err.message);
      res.end();
    } else {
      res
        .status(500)
        .json({
          error: "Failed to process the request, please check the URL file",
          details: err.message,
          requestId,
        });
    }
  }
});

// Main handler for ASS translation requests
router.get("/get-ass", async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const { url, lang = "id" } = req.query;

  // Validate required parameter
  if (!url) {
    appLog.error("Missing 'url' query parameter in /get-ass request", {
      query: req.query,
    });
    return res
      .status(400)
      .json({ error: "Missing 'url' query parameter", requestId });
  }

  // Append log
  appLog.info("Received /get-ass request", {
    url,
    lang,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    requestId,
  });

  // Setup res headers for streaming response
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
      },
      timeout: 30000,
    });

    const chunks = [];
    let currentChunkText = "";
    let currentChunkIndices = [];

    const contentLines = response.data.split(/\r?\n/);
    const textPartsMap = {};

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i].trim();

      if (line.startsWith("Dialogue:")) {
        let commaCount = 0;
        let textStartIndex = -1;
        for (let j = 0; j < line.length; j++) {
          if (line[j] === ',') {
            commaCount++;
            if (commaCount === 9) {
              textStartIndex = j + 1;
              break;
            }
          }
        }

        if (textStartIndex !== -1) {
          const prefix = line.substring(0, textStartIndex);
          let textToTranslate = line.substring(textStartIndex);
          
          textPartsMap[i] = prefix;

          if (
            (currentChunkText + WEBVTT_DELIMITER + textToTranslate).length > WEBVTT_MAX_CHARS
          ) {
            chunks.push({
              text: currentChunkText,
              indices: [...currentChunkIndices],
            });

            currentChunkText = textToTranslate;
            currentChunkIndices = [i];
          } else {
            currentChunkText += (currentChunkText ? WEBVTT_DELIMITER : "") + textToTranslate;
            currentChunkIndices.push(i);
          }
        }
      }
    }

    if (currentChunkText) {
      chunks.push({
        text: currentChunkText,
        indices: [...currentChunkIndices],
      });
    }

    let lastPrintedIndex = -1;
    let firstDialogueIndex = contentLines.findIndex(line => line.trim().startsWith("Dialogue:"));
    if (firstDialogueIndex === -1) firstDialogueIndex = contentLines.length;

    for (let i = 0; i < firstDialogueIndex; i++) {
      res.write(contentLines[i] + "\n");
      lastPrintedIndex = i;
    }

    for (const chunk of chunks) {
      try {
        const responseTranslate = await translate(chunk.text, {
          to: lang,
          client: "gtx",
          forceTo: true,
        });
        const translatedParts =
          responseTranslate.text.split(WEBVTT_SPLIT_REGEX);

        translatedParts.forEach((part, idx) => {
          const lineIdx = chunk.indices[idx];
          contentLines[lineIdx] = textPartsMap[lineIdx] + part;
        });
      } catch (err) {
        appLog.error("Translation error for chunk in /get-ass", {
          msg: err.message,
          chunkText: chunk.text,
          indices: chunk.indices,
          requestId,
        });
        console.error(`Translation error in request ${requestId}:`, err);
      }

      const maxIndexToPrint = chunk.indices[chunk.indices.length - 1];

      for (let i = lastPrintedIndex + 1; i <= maxIndexToPrint; i++) {
        if (contentLines[i] === undefined) {
          continue;
        }
        res.write(contentLines[i] + "\n");
      }
      lastPrintedIndex = maxIndexToPrint;
    }

    for (let i = lastPrintedIndex + 1; i < contentLines.length; i++) {
      if (contentLines[i] === undefined) {
        continue;
      }
      res.write(contentLines[i] + "\n");
    }

    globalVars.TOTAL_TRANSLATED++;
    appLog.success("Successfully processed /get-ass request", {
      url,
      lang,
      totalTranslated: globalVars.TOTAL_TRANSLATED,
      requestId,
    });
    res.end();
  } catch (err) {
    appLog.error("Error processing /get-ass request", {
      msg: err.message,
      url,
      lang,
      requestId,
    });
    console.error(`Error in request ${requestId}:`, err);
    if (res.headersSent) {
      res.write("\n\nERROR: Failed to process the request. " + err.message);
      res.end();
    } else {
      res
        .status(500)
        .json({
          error: "Failed to process the request, please check the URL file",
          details: err.message,
          requestId,
        });
    }
  }
});

module.exports = router;
