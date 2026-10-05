export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    async function translateTextWithRetry(sourceText, from, to, retries = 3) {
      for (let i = 0; i < retries; i++) {
        try {
          const params = new URLSearchParams();
          params.append('sl', from);
          params.append('tl', to);
          params.append('q', sourceText);

          const gtRes = await fetch('https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&dt=t', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            body: params.toString()
          });

          if (!gtRes.ok) throw new Error(`Google API Error: ${gtRes.status}`);
          
          const json = await gtRes.json();
          let translatedText = '';
          if (json[0] && Array.isArray(json[0])) {
            json[0].forEach(part => { if (part[0]) translatedText += part[0]; });
          }
          return { translatedText, detectedLang: json[2] || from };
        } catch (err) {
          if (i === retries - 1) throw err;
          await sleep(1500 * (i + 1)); // Exponential backoff on retry
        }
      }
    }

    async function translateArrayOP(array, from, to) {
      const SEPARATOR = '\n\n';
      const MAX_CHARS = 2500;
      
      const batches = [];
      let currentBatch = [];
      let currentLength = 0;

      for (const text of array) {
        if (currentLength + text.length > MAX_CHARS && currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
          currentLength = 0;
        }
        currentBatch.push(text);
        currentLength += text.length + SEPARATOR.length;
      }
      if (currentBatch.length > 0) batches.push(currentBatch);

      const results = [];
      for (let i = 0; i < batches.length; i++) {
        const sourceText = batches[i].join(SEPARATOR);
        
        const res = await translateTextWithRetry(sourceText, from, to);
        const splitted = res.translatedText.split(SEPARATOR).map(s => s.trim());
        results.push(...splitted);
        
        // Add random delay between batches (300ms to 700ms) to avoid Rate Limiting (429)
        if (i < batches.length - 1) {
          const delay = Math.floor(Math.random() * 400) + 300;
          await sleep(delay);
        }
      }
      return { results };
    }

    async function processSubtitle(content, type, from, to) {
      let items = [];
      let parsedContent = content.replace(/\r\n/g, '\n');

      if (type === 'srt' || type === 'vtt' || type === 'auto') {
        const blocks = parsedContent.split(/\n{2,}/);
        blocks.forEach((block, idx) => {
          const lines = block.split('\n');
          let timeIdx = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('-->')) { timeIdx = i; break; }
          }
          if (timeIdx !== -1 && timeIdx + 1 < lines.length) {
            const text = lines.slice(timeIdx + 1).join('\n');
            items.push({
              text,
              updateFn: (translated) => {
                lines.splice(timeIdx + 1, lines.length - timeIdx - 1, translated);
                blocks[idx] = lines.join('\n');
              }
            });
          }
        });
        
        // If it didn't find any VTT/SRT timestamps, it might be ASS
        if (items.length === 0 && parsedContent.includes('Dialogue:')) {
           return processSubtitle(content, 'ass', from, to);
        }

        const textsToTranslate = items.map(i => i.text);
        const { results } = await translateArrayOP(textsToTranslate, from, to);
        results.forEach((translated, idx) => { if (items[idx]) items[idx].updateFn(translated); });
        return blocks.join('\n\n');
      } else if (type === 'ass') {
        const lines = parsedContent.split('\n');
        lines.forEach((line, idx) => {
          if (line.startsWith('Dialogue: ')) {
            const parts = line.split(',');
            if (parts.length >= 10) {
              const prefix = parts.slice(0, 9).join(',') + ',';
              const text = parts.slice(9).join(',');
              items.push({
                text,
                updateFn: (translated) => { lines[idx] = prefix + translated; }
              });
            }
          }
        });
        const textsToTranslate = items.map(i => i.text);
        const { results } = await translateArrayOP(textsToTranslate, from, to);
        results.forEach((translated, idx) => { if (items[idx]) items[idx].updateFn(translated); });
        return lines.join('\n');
      }
      return content;
    }

    // Classic GET /get-vtt endpoint backwards compatibility
    if (url.pathname === '/get-vtt' && request.method === 'GET') {
      try {
        const targetUrl = url.searchParams.get('url');
        const from = url.searchParams.get('from') || 'auto';
        // support both 'lang' and 'to'
        const to = url.searchParams.get('lang') || url.searchParams.get('to') || 'id';
        
        if (!targetUrl) return new Response("Missing ?url= parameter", { status: 400 });

        const subRes = await fetch(targetUrl);
        if (!subRes.ok) throw new Error("Failed to fetch subtitle from remote URL");
        
        const rawContent = await subRes.text();
        // Auto detect type
        let type = 'vtt';
        if (rawContent.includes('Dialogue:')) type = 'ass';

        const translatedContent = await processSubtitle(rawContent, type, from, to);

        return new Response(translatedContent, {
          headers: { 
            'Content-Type': `text/plain; charset=utf-8`,
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (err) {
        return new Response(err.message, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // Original POST APIs
    if (url.pathname === '/translate-subtitle' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { content, type = 'vtt', from = 'auto', to = 'id' } = body;
        if (!content) return new Response(JSON.stringify({ error: "Missing 'content'" }), { status: 400 });

        const translatedContent = await processSubtitle(content, type, from, to);
        return new Response(JSON.stringify({ status: 'success', translated_file: translatedContent }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    if (url.pathname === '/translate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { text, from = 'auto', to = 'en' } = body;
        if (!text) return new Response(JSON.stringify({ error: "Missing 'text'" }), { status: 400 });

        if (Array.isArray(text)) {
          const { results } = await translateArrayOP(text, from, to);
          return new Response(JSON.stringify({ status: 'success', target_lang: to, translated_data: results }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        } else {
          const { translatedText } = await translateText(text, from, to);
          return new Response(JSON.stringify({ status: 'success', target_lang: to, translated_data: translatedText.trim() }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    return new Response(JSON.stringify({ error: "Not Found", message: "API OP Worker. GET /get-vtt?url=..., POST /translate-subtitle" }), { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
};
