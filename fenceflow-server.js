// FenceFlow SMS Backend — deploy this to Render.com (free)
// Node.js web service · runs on port 3000

const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;

function sendSMS({ accountSid, authToken, from, to, body }) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({ From: from, To: to, Body: body }).toString();
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.sid) resolve({ success: true, sid: json.sid });
          else reject(new Error(json.message || 'Twilio error'));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('FenceFlow SMS Server is running.');
    return;
  }
  if (req.method === 'POST' && req.url === '/send-sms') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { to, body: msgBody, from, accountSid, authToken } = JSON.parse(body);
        if (!to || !msgBody || !from || !accountSid || !authToken) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
          return;
        }
        const result = await sendSMS({ accountSid, authToken, from, to, body: msgBody });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }
  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log(`FenceFlow server running on port ${PORT}`));
