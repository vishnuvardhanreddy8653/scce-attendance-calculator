const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

async function debug() {
  const client = axios.create({
    baseURL: 'https://scce.ac.in/parent12/',
    httpsAgent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
    maxRedirects: 0,
    validateStatus: () => true
  });

  console.log("1. POST login...");
  const params = new URLSearchParams();
  params.append('HallticketNo', '23N01A7401');
  params.append('submit', 'Login');

  const postRes = await client.post('index.php', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const cookie = postRes.headers['set-cookie'] ? postRes.headers['set-cookie'][0].split(';')[0] : '';
  console.log("Post status:", postRes.status, "Cookie:", cookie);

  console.log("2. GET updateddata_new.php...");
  const page1 = await client.get('updateddata_new.php', { headers: { Cookie: cookie } });
  const cookie2 = page1.headers['set-cookie'] ? page1.headers['set-cookie'][0].split(';')[0] : cookie;
  console.log("page1 status:", page1.status, "Cookie2:", cookie2);

  console.log("3. GET Dailywisereport.php...");
  const dailyRes = await client.get('Dailywisereport.php', { headers: { Cookie: cookie2 } });
  console.log("DailyRes length:", dailyRes.data.length);
  console.log("Contains select date:", dailyRes.data.includes('name="date"'));
}

debug();
