import * as cheerio from 'cheerio';

const _0xc2e = ["", "split", "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/", "slice", "indexOf", "", "", ".", "pow", "reduce", "reverse", "0"];

function _0xe89c(sd, aR, bN) {
  var g = _0xc2e[2][_0xc2e[1]](_0xc2e[0]);
  var h = g[_0xc2e[3]](0, aR);
  var i = g[_0xc2e[3]](0, bN);
  var j = sd[_0xc2e[1]](_0xc2e[0])[_0xc2e[10]]()[_0xc2e[9]](function (zj, wt, Ih) {
    if (h[_0xc2e[4]](wt) !== -1) return zj += h[_0xc2e[4]](wt) * (Math[_0xc2e[8]](aR, Ih))
  }, 0);
  var k = _0xc2e[0];
  while (j > 0) {
    k = i[j % bN] + k;
    j = (j - (j % bN)) / bN
  }
  return k || _0xc2e[11]
}

function decodeKwik(ew, Lx, UC, OA, cF, ao) {
  ao = "";
  for (var i = 0, len = ew.length; i < len; i++) {
    var s = "";
    while (ew[i] !== UC[cF]) {
      s += ew[i];
      i++
    }
    for (var j = 0; j < UC.length; j++) s = s.replace(new RegExp(UC[j], "g"), j);
    ao += String.fromCharCode(_0xe89c(s, cF, 10) - OA)
  }
  return decodeURIComponent(escape(ao))
}

async function getKwikMp4(kwikUrl) {
  try {
    const response = await fetch(kwikUrl, {
      headers: {
        'referer': 'https://animepahe.si/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    const script = $('script').filter((i, el) => $(el).text().includes('eval')).text();
    if (!script) return null;

    const match = script.match(/\("(.+?)",(\d+),"(.+?)",(\d+),(\d+),(\d+)\)/);
    if (match) {
      const decoded = decodeKwik(match[1], parseInt(match[2]), match[3], parseInt(match[4]), parseInt(match[5]), parseInt(match[6]));
      const tokenMatch = decoded.match(/value="([^"]+)"/);
      const actionMatch = decoded.match(/action="([^"]+)"/);

      if (tokenMatch && actionMatch) {
        const token = tokenMatch[1];
        const action = actionMatch[1];
        
        // Grab set-cookie from the fetch response headers
        const setCookieHeader = response.headers.get('set-cookie');
        const cookies = setCookieHeader ? setCookieHeader.split(';')[0] : '';

        const postRes = await fetch(action, {
          method: 'POST',
          headers: {
            'referer': kwikUrl,
            'cookie': cookies,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded'
          },
          body: `_token=${token}`,
          redirect: 'manual' // This replaces axios maxRedirects: 0 to catch the 302 location
        });

        // If it's a redirect, grab the location header
        if (postRes.status >= 300 && postRes.status < 400) {
          return postRes.headers.get('location') || null;
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

export default {
  async fetch(request, env, ctx) {
    // You can make these dynamic later by pulling them from the request URL
    const animeSession = '78e38106-d9f3-a8b5-7974-9702f603dc96';
    const episodeSession = '354f591022424c75c72b9e1fc4efe2cee1a33d2c45db62db914c5d79acd4808e';
    const playUrl = `https://animepahe.si/play/${animeSession}/${episodeSession}`;

    const cookies = [
      '__ddgid_=syw9aDJv7U1jNBi4',
      '__ddgmark_=ty7rT9IGnl4AmirS',
      '__ddg2_=9U7a4sOjY35rHJYY',
      '__ddg1_=yZ8wJdZ9i4kQUKz2vDCj',
      'res=1080',
      'aud=jpn',
      'av1=0',
      '__ddg9_=102.89.75.29',
      'latest=6461',
      '__ddg8_=mCvoUEEU9wCq5xDx',
      '__ddg10_=1770543833',
      'XSRF-TOKEN=eyJpdiI6InZ5Um1sZVNlM1AyUnV2dnh1em1zR0E9PSIsInZhbHVlIjoibGVVUW1JWFRaRFZ2ZU0ydFJ1UU5xOWZyMVNHVEtPTU9GeWlkbVBLMVpjL2lvNlZMb3Ftc3BSbjJMT2JyT0psdHdodjRUQkIxOEhhRHR6YTZrNTZ2Tis1MEFTanQ2bk93WWFEZVdwZ0J3bStDanl6WkVoNmFPQzFKT0YwZ2ZLbVciLCJtYWMiOiJmMWQ4MDgyMjhlZDA3ZTg3NDE1MDRkOTI0ZmQzODdjNTlkNmY3MDgzZGZhMzFkZGU3YTY3OGY1OTRhYmQ4YjE4IiwidGFnIjoiIn0%3D',
      'laravel_session=eyJpdiI6Ii92WlpuamVJNFVXRWhzMnVMT05wRkE9PSIsInZhbHVlIjoiTFlFNHVvV21DdmVVdGYvUjhDYmsydkdBY1Evd3c1NCs1RWZxdjVzSkxaRlFpRlZxTjdsY2wyZjhxbFA0ck1KZzMwcE9pNUdDTWR2NGlOZ2hPWERiZVNyRzdhUnJSRVpXanRnS3lwdHNWdVB3WjdYM2V4a1B5NWlYUHFmQzZrTk4iLCJtYWMiOiIxY2RmZmUyYmQ3OWM4ZTVlZWYwNzA5NDZjY2NhN2FiMjQ0ZTlkNDA1MDcxY2UxNWZkZDcxZWUwZWU3ODRkMTIzIiwidGFnIjoiIn0%3D'
    ].join('; ');

    const commonHeaders = {
      'accept-language': 'en-US,en;q=0.9',
      'cookie': cookies,
      'referer': 'https://animepahe.si/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
    };

    try {
      const res = await fetch(playUrl, { headers: commonHeaders });
      const html = await res.text();
      const $ = cheerio.load(html);

      const downloadLinks = [];
      const dropdownItems = $('#downloadMenu .dropdown-item');

      dropdownItems.each((i, el) => {
        const $el = $(el);
        const text = $el.text().trim();
        const url = $el.attr('href');
        const resolutionMatch = text.match(/(\d{3,4}p)/);
        const sizeMatch = text.match(/\((\d+(?:\.\d+)?\s*[KMG]B)\)/i);
        const isEng = $el.find('.badge-warning').text().trim().toLowerCase() === 'eng' || text.toLowerCase().includes(' eng');

        downloadLinks.push({
          resolution: resolutionMatch ? resolutionMatch[1] : null,
          size: sizeMatch ? sizeMatch[1] : null,
          audio: isEng ? 'eng' : 'jpn',
          url: url
        });
      });

      if (downloadLinks.length === 0) {
        $('a').each((i, el) => {
          const $el = $(el);
          const href = $el.attr('href');
          if (href && (href.includes('pahe.win') || href.includes('kwik.si'))) {
            const text = $el.text().trim();
            const resolutionMatch = text.match(/(\d{3,4}p)/);
            const sizeMatch = text.match(/\((\d+(?:\.\d+)?\s*[KMG]B)\)/i);
            const isEng = text.toLowerCase().includes(' eng');

            downloadLinks.push({
              resolution: resolutionMatch ? resolutionMatch[1] : null,
              size: sizeMatch ? sizeMatch[1] : null,
              audio: isEng ? 'eng' : 'jpn',
              url: href
            });
          }
        });
      }

      const fetchKwikAndMp4 = async (link) => {
        try {
          const paheRes = await fetch(link.url, {
            headers: {
              'cookie': cookies,
              'user-agent': commonHeaders['user-agent']
            }
          });
          const paheHtml = await paheRes.text();
          const kwikMatch = paheHtml.match(/https:\/\/kwik\.(?:cx|si)\/f\/[a-zA-Z0-9]+/);
          
          if (kwikMatch) {
            const kwikUrl = kwikMatch[0];
            const mp4Url = await getKwikMp4(kwikUrl);

            let m3u8Url = null;
            if (mp4Url) {
              m3u8Url = mp4Url.replace('/mp4/', '/stream/').split('?')[0] + '/uwu.m3u8';
            }

            return {
              resolution: link.resolution,
              size: link.size,
              audio: link.audio,
              mp4Url: mp4Url,
              m3u8Url: m3u8Url
            };
          }
          return {
            resolution: link.resolution,
            size: link.size,
            audio: link.audio,
            mp4Url: null,
            m3u8Url: null
          };
        } catch (err) {
          return {
            resolution: link.resolution,
            size: link.size,
            audio: link.audio,
            mp4Url: null,
            m3u8Url: null
          };
        }
      };

      const finalLinks = await Promise.all(downloadLinks.map(fetchKwikAndMp4));

      // Return standard JSON response
      return new Response(JSON.stringify({
        referer: 'https://kwik.cx/',
        downloadLinks: finalLinks
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
