const express = require('express');
const cheerio = require('cheerio');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// Apply stealth plugin to Playwright
chromium.use(stealth);

const app = express();
const PORT = process.env.PORT || 7860;

// Global Browser Instance
let globalBrowser;

// --- Utility Functions for Kwik Packer ---
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
    return k || _0xc2e[11];
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
        ao += String.fromCharCode(_0xe89c(s, cF, 10) - OA);
    }
    return decodeURIComponent(escape(ao));
}

// Helper to block useless resources for speed
async function blockUselessResources(page) {
    await page.route('**/*', route => {
        const type = route.request().resourceType();
        // Abort images, CSS, fonts, and media. Allow document, script, xhr, fetch.
        if (['image', 'stylesheet', 'font', 'media', 'manifest', 'other'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });
}

// --- Express Routes ---
app.get('/api/anime/download', async (req, res) => {
    const { animeId, episodeId } = req.query;

    if (!animeId || !episodeId) {
        return res.status(400).json({ developer: "arcane", success: false, status: 400, message: "Missing query parameters." });
    }

    const playUrl = `https://animepahe.si/play/${animeId}/${episodeId}`;
    
    // Create a new lightweight browser context for this specific API request
    const context = await globalBrowser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    
    try {
        const page = await context.newPage();
        await blockUselessResources(page);

        // Smart Waiting: Only wait for the DOM, not images/network idle
        await page.goto(playUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        // Wait specifically for the elements we need to appear
        await page.waitForSelector('#downloadMenu .dropdown-item, a[href*="pahe.win"]', { timeout: 10000 }).catch(() => {});

        const html = await page.content();
        const $ = cheerio.load(html);
        const downloadLinks = [];

        $('#downloadMenu .dropdown-item').each((i, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            const isEng = $el.find('.badge-warning').text().trim().toLowerCase() === 'eng' || text.toLowerCase().includes(' eng');
            downloadLinks.push({
                resolution: (text.match(/(\d{3,4}p)/) || [])[1] || null,
                size: (text.match(/\((\d+(?:\.\d+)?\s*[KMG]B)\)/i) || [])[1] || null,
                audio: isEng ? 'eng' : 'jpn',
                url: $el.attr('href')
            });
        });

        if (downloadLinks.length === 0) {
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && (href.includes('pahe.win') || href.includes('kwik.si'))) {
                    const text = $(el).text().trim();
                    const isEng = text.toLowerCase().includes(' eng');
                    downloadLinks.push({
                        resolution: (text.match(/(\d{3,4}p)/) || [])[1] || null,
                        size: (text.match(/\((\d+(?:\.\d+)?\s*[KMG]B)\)/i) || [])[1] || null,
                        audio: isEng ? 'eng' : 'jpn',
                        url: href
                    });
                }
            });
        }

        // Close the main page early to free up memory
        await page.close();

        // Process all download links concurrently using the same browser context
        const fetchKwikAndMp4 = async (link) => {
            let linkPage = null;
            try {
                linkPage = await context.newPage();
                await blockUselessResources(linkPage);

                // Visit pahe.win url
                await linkPage.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                const paheHtml = await linkPage.content();
                const kwikMatch = paheHtml.match(/https:\/\/kwik\.(?:cx|si)\/f\/[a-zA-Z0-9]+/);
                
                if (!kwikMatch) throw new Error("Kwik link not found");
                const kwikUrl = kwikMatch[0];

                // Visit Kwik URL to solve Cloudflare/DDoS-Guard and get the script
                await linkPage.goto(kwikUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                const kwikHtml = await linkPage.content();
                const _$ = cheerio.load(kwikHtml);
                
                const script = _$('script').filter((i, el) => _$(el).text().includes('eval')).text();
                if (!script) throw new Error("Kwik packer script not found");

                const match = script.match(/\("(.+?)",(\d+),"(.+?)",(\d+),(\d+),(\d+)\)/);
                if (!match) throw new Error("Could not extract Kwik packer variables");

                const decoded = decodeKwik(match[1], parseInt(match[2]), match[3], parseInt(match[4]), parseInt(match[5]), parseInt(match[6]));
                const tokenMatch = decoded.match(/value="([^"]+)"/);
                const actionMatch = decoded.match(/action="([^"]+)"/);

                let mp4Url = null;
                let m3u8Url = null;

                if (tokenMatch && actionMatch) {
                    const token = tokenMatch[1];
                    const action = actionMatch[1];

                    // Use Playwright's built-in APIRequestContext for lightning-fast POSTs (inherits context cookies automatically)
                    const postRes = await context.request.post(action, {
                        data: `_token=${token}`,
                        headers: {
                            'referer': kwikUrl,
                            'content-type': 'application/x-www-form-urlencoded'
                        },
                        maxRedirects: 0 // Stop at the 302 redirect so we can grab the 'location' header
                    });

                    mp4Url = postRes.headers()['location'] || null;
                    if (mp4Url) {
                        m3u8Url = mp4Url.replace('/mp4/', '/stream/').split('?')[0] + '/uwu.m3u8';
                    }
                }

                await linkPage.close();
                return { ...link, mp4Url, m3u8Url };

            } catch (err) {
                if (linkPage) await linkPage.close().catch(() => {});
                return { ...link, mp4Url: null, m3u8Url: null };
            }
        };

        // Resolve all links at the same time
        const finalLinks = await Promise.all(downloadLinks.map(fetchKwikAndMp4));

        res.status(200).json({
            developer: "arcane",
            success: true,
            status: 200,
            results: {
                referer: "https://kwik.cx/",
                downloadLinks: finalLinks
            }
        });

    } catch (error) {
        console.error('Scraping Error:', error.message);
        res.status(500).json({ success: false, status: 500, message: "Error fetching links", error: error.message });
    } finally {
        // ALWAYS close the context to clear cookies and free memory
        await context.close().catch(() => {});
    }
});

// Start the server and launch the global browser
app.listen(PORT, async () => {
    console.log(`Server starting on port ${PORT}...`);
    globalBrowser = await chromium.launch({ 
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox', 
            '--disable-dev-shm-usage', // Crucial for low-memory servers
            '--disable-gpu'
        ]
    });
    console.log('Playwright Global Browser launched successfully.');
});
            
