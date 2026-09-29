const cheerio = require('cheerio');
const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

function cleanPortalHtml(html) {
  if (!html) return '';
  return html.replace(/<\/div>\s*<\/td>/gi, '</td>');
}

function parseDailyTable(html) {
  const cleaned = cleanPortalHtml(html);
  const $ = cheerio.load(cleaned);
  const table = $('table.table');
  if (!table.length) return { present: 0, total: 0 };

  let present = 0;
  let total = 0;

  table.find('tr').each((index, el) => {
    if (index === 0) return;
    const cols = $(el).find('td').map((_, td) => $(td).text().trim()).get();
    if (cols.length >= 5) {
      const atnd = parseInt(cols[3], 10);
      const cnctd = parseInt(cols[4], 10);
      if (!isNaN(cnctd) && cnctd === 1) {
        total += 1;
        if (!isNaN(atnd) && atnd === 1) {
          present += 1;
        }
      }
    }
  });

  return { present, total };
}

async function fetchStudentAttendance(hallTicket) {
  const client = axios.create({
    baseURL: 'https://scce.ac.in/parent12/',
    timeout: 15000,
    httpsAgent,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    },
    maxRedirects: 0,
    validateStatus: () => true
  });

  // 1. POST login form
  const loginParams = new URLSearchParams();
  loginParams.append('HallticketNo', hallTicket);
  loginParams.append('submit', 'Login');

  const loginRes = await client.post('index.php', loginParams.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const cookies = loginRes.headers['set-cookie'];
  const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

  if (typeof loginRes.data === 'string' && (loginRes.data.includes('Hallticket No Not Found') || loginRes.data.includes('Invalid'))) {
    throw new Error('INVALID_HALL_TICKET');
  }

  const authHeaders = cookieHeader ? { Cookie: cookieHeader } : {};

  // 2. GET updateddata_new.php landing page (required by portal PHP session state)
  await client.get('updateddata_new.php', { headers: authHeaders });

  // 3. GET Dailywisereport.php page to extract available dates
  const dailyPageRes = await client.get('Dailywisereport.php', {
    headers: {
      ...authHeaders,
      Referer: 'https://scce.ac.in/parent12/updateddata_new.php'
    }
  });

  const optionMatches = [...dailyPageRes.data.matchAll(/<option\s+value=["']?(\d{4}-\d{2}-\d{2})["']?/gi)];
  const dateValues = optionMatches.map(m => m[1]);

  if (dateValues.length === 0) {
    throw new Error('PORTAL_STRUCTURE_ERROR');
  }

  // 4. Batch fetch daily attendance for each date
  const chunkSize = 4;
  const daysBreakdown = [];
  let overallPresent = 0;
  let overallTotal = 0;

  for (let i = 0; i < dateValues.length; i += chunkSize) {
    const chunk = dateValues.slice(i, i + chunkSize);
    const promises = chunk.map(async (dateStr) => {
      let retries = 2;
      while (retries >= 0) {
        try {
          const bodyParams = new URLSearchParams();
          bodyParams.append('date', dateStr);
          bodyParams.append('dayatten', 'Submit');

          const res = await client.post('Dailywisereport.php', bodyParams.toString(), {
            headers: {
              ...authHeaders,
              'Content-Type': 'application/x-www-form-urlencoded',
              Referer: 'https://scce.ac.in/parent12/Dailywisereport.php'
            },
            timeout: 10000
          });

          const { present, total } = parseDailyTable(res.data);
          return { date: dateStr, present, total };
        } catch (err) {
          retries -= 1;
          if (retries < 0) return { date: dateStr, present: 0, total: 0, failed: true };
          await new Promise(r => setTimeout(r, 200));
        }
      }
    });

    const results = await Promise.all(promises);
    for (const item of results) {
      if (item && item.total > 0) {
        daysBreakdown.push({
          date: item.date,
          present: item.present,
          total: item.total,
          percentage: Math.round((item.present / item.total) * 10000) / 100
        });
        overallPresent += item.present;
        overallTotal += item.total;
      }
    }
  }

  const overallPercentage = overallTotal > 0 
    ? Math.round((overallPresent / overallTotal) * 10000) / 100 
    : 0.0;

  return {
    hallTicket,
    summary: {
      present: overallPresent,
      total: overallTotal,
      percentage: overallPercentage
    },
    days: daysBreakdown,
    lastUpdated: dateValues[0] || new Date().toISOString().split('T')[0]
  };
}

module.exports = {
  cleanPortalHtml,
  parseDailyTable,
  fetchStudentAttendance
};
