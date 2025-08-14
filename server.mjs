import path from 'path';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  port: process.env.PORT || 8080,
  password: process.env.PASSWORD || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  timeout: parseInt(process.env.REQUEST_TIMEOUT || '5000'),
  maxRetries: parseInt(process.env.MAX_RETRIES || '2'),
  cacheMaxAge: process.env.CACHE_MAX_AGE || '1d',
  userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  debug: process.env.DEBUG === 'true',
  prefix: process.env.PREFIX || '',
};

const log = (...args) => {
  if (config.debug) {
    console.log('[DEBUG]', ...args);
  }
};

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // res.setHeader('X-Frame-Options', 'DENY'); 防止历史记录功能失效
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

function sha256Hash(input) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256');
    hash.update(input);
    resolve(hash.digest('hex'));
  });
}

async function renderPage(filePath, password) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (password !== '') {
    const sha256 = await sha256Hash(password);
    content = content.replace('{{PASSWORD}}', sha256);
  }

  // 给所有静态资源路径加 prefix（匹配 href="/static/... 或 src="/static/...）
  const staticRegex = /(["'])\/static\//g;
  content = content.replace(staticRegex, `$1${config.prefix}/static/`);
  

  // 如果不是下载页面，就添加悬浮窗公告
  if (!filePath.endsWith('download.html')) {
    const noticeHTML = `
      <style>
      #floatNotice {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(255, 215, 0, 0.95);
        color: #000;
        padding: 10px 15px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        font-size: 14px;
        z-index: 9999;
      }
      #floatNotice a {
        color: #d00;
        font-weight: bold;
        text-decoration: underline;
      }
      #floatNotice .closeBtn {
        position: absolute;
        top: 2px;
        right: 6px;
        cursor: pointer;
        font-weight: bold;
      }
      </style>
      <div id="floatNotice">
        <span class="closeBtn" onclick="document.getElementById('floatNotice').remove()">×</span>
        📢 最新版本app已发布！<a href="${config.prefix}/download.html">点击这里下载</a>
      </div>
    `;
    // 在 </body> 前插入公告
    content = content.replace('</body>', `${noticeHTML}\n</body>`);
  }

  // 如果 HTML 里有其它页面的绝对路径，比如 href="/player.html"
    // HTML 链接加 prefix（排除已经有 prefix 的、以及以 http 开头的）
  const pageRegex = new RegExp(`(["'])\\/(?!${config.prefix.slice(1)}\\/|static\\/|https?:)([^"']+\\.html)`, 'g');
  content = content.replace(pageRegex, `$1${config.prefix}/$2`);


  //添加全局js
  const injectedScript = `<script src="${config.prefix}/static/js/global.js"></script>`;
  content = content.replace('<head>', `<head>\n${injectedScript}\n`);
  //添加全局js
  const googleAdScript = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2647469332993764" crossorigin="anonymous"></script>`;
  content = content.replace('<head>', `<head>\n${googleAdScript}\n`);
  


    // 注入 <base> 和 data-prefix
  const headInsert = `
    <script>
      document.documentElement.dataset.prefix = "${config.prefix}";
    </script>
    `;

  content = content.replace('<head>', `<head>\n${headInsert}\n`);



  //返回响应html
  return content;
}

// app.get(['/', '/index.html', '/player.html','/watch.html'], async (req, res) => {
//   try {
//     let filePath;
//     let htmlBasePath = path.join(__dirname, 'html');
//     switch (req.path) {
//       case '/player.html':
//         filePath = path.join(htmlBasePath, 'player.html');
//         break;
//       case '/watch.html':
//         filePath = path.join(htmlBasePath, 'watch.html');
//         break;
//       default: // '/' 和 '/index.html'
//         filePath = path.join(htmlBasePath, 'index.html');
//         break;
//     }

//     const content = await renderPage(filePath, config.password);
//     res.send(content);
//   } catch (error) {
//     console.error('页面渲染错误:', error);
//     res.status(500).send('读取静态页面失败');
//   }
// });


//使用正则匹配所有html页面
app.get(new RegExp(`^${config.prefix}(/$|/.*\\.html|/s=.*)$`), async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'];
    const htmlBasePath = path.join(__dirname, 'html');

    if (!isAllowedUserAgent(userAgent) && !req.path.includes('download.html')) {
      return res.redirect(`${config.prefix}/download.html`);
    }

    let filePath;
    const cleanPath = req.path.replace(config.prefix, ''); // 去掉前缀再判断

    if (cleanPath === '/' || cleanPath === '/index.html') {
      filePath = path.join(htmlBasePath, 'index.html');
    } else if (cleanPath.startsWith('/s=')) {
      filePath = path.join(htmlBasePath, 'index.html');
    } else {
      const relativePath = cleanPath.replace(/^\//, '');
      filePath = path.join(htmlBasePath, relativePath);
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('页面不存在');
    }

    const content = await renderPage(filePath, config.password);
    res.send(content);
  } catch (error) {
    console.error('页面渲染错误:', error);
    res.status(500).send('读取静态页面失败');
  }
});

// app.get('/s=:keyword', async (req, res) => {
//   try {
//     const filePath = path.join(__dirname, 'index.html');
//     const content = await renderPage(filePath, config.password);
//     res.send(content);
//   } catch (error) {
//     console.error('搜索页面渲染错误:', error);
//     res.status(500).send('读取静态页面失败');
//   }
// });

function isValidUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const allowedProtocols = ['http:', 'https:'];

    // 从环境变量获取阻止的主机名列表
    const blockedHostnames = (process.env.BLOCKED_HOSTS || 'localhost,127.0.0.1,0.0.0.0,::1').split(',');

    // 从环境变量获取阻止的 IP 前缀
    const blockedPrefixes = (process.env.BLOCKED_IP_PREFIXES || '192.168.,10.,172.').split(',');

    if (!allowedProtocols.includes(parsed.protocol)) return false;
    if (blockedHostnames.includes(parsed.hostname)) return false;

    for (const prefix of blockedPrefixes) {
      if (parsed.hostname.startsWith(prefix)) return false;
    }

    return true;
  } catch {
    return false;
  }
}


  // 允许的User-Agent列表
  const allowedUserAgents = [
    'iphone', 'ipad', 'android', 'jihadandroid'
  ];
// 检查User-Agent是否允许访问
function isAllowedUserAgent(userAgent) {
  if (!userAgent) return false;
  userAgent = userAgent.toLowerCase();


  // 检查是否包含允许的User-Agent
  // for (const agent of allowedUserAgents) {
  //   if (userAgent.includes(agent)) {
  //     return true;
  //   }
  // }
  // // 如果没有匹配到，返回false
  // return false; 
  return true; // 允许所有User-Agent
}

// 代理路由
app.get(`${config.prefix}/proxy/:encodedUrl`, async (req, res) => {
  try {
    const encodedUrl = req.params.encodedUrl;
    const targetUrl = decodeURIComponent(encodedUrl);

    // 安全验证
    if (!isValidUrl(targetUrl)) {
      return res.status(400).send('无效的 URL');
    }

    log(`代理请求: ${targetUrl}`);

    // 添加请求超时和重试逻辑
    const maxRetries = config.maxRetries;
    let retries = 0;

    const makeRequest = async () => {
      try {
        return await axios({
          method: 'get',
          url: targetUrl,
          responseType: 'stream',
          timeout: config.timeout,
          headers: {
            'User-Agent': config.userAgent
          }
        });
      } catch (error) {
        if (retries < maxRetries) {
          retries++;
          log(`重试请求 (${retries}/${maxRetries}): ${targetUrl}`);
          return makeRequest();
        }
        throw error;
      }
    };

    const response = await makeRequest();

    // 转发响应头（过滤敏感头）
    const headers = { ...response.headers };
    const sensitiveHeaders = (
      process.env.FILTERED_HEADERS ||
      // 'content-security-policy,cookie,set-cookie,x-frame-options,access-control-allow-origin' 防止历史记录功能失效
      'content-security-policy,cookie,set-cookie,access-control-allow-origin'
    ).split(',');

    sensitiveHeaders.forEach(header => delete headers[header]);
    res.set(headers);

    // 管道传输响应流
    response.data.pipe(res);
  } catch (error) {
    console.error('代理请求错误:', error.message);
    if (error.response) {
      res.status(error.response.status || 500);
      error.response.data.pipe(res);
    } else {
      res.status(500).send(`请求失败: ${error.message}`);
    }
  }
});

// 处理APK下载请求
app.get(`${config.prefix}/download/app`, (req, res) => {
  // 直接重定向到下载地址
  res.redirect(`${config.prefix}/static/jihad.apk`);
});

app.use(`${config.prefix}/static`, express.static(path.join(__dirname, 'static'), {
  maxAge: config.cacheMaxAge
}));

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).send('服务器内部错误');
});

app.use((req, res) => {
  res.status(404).send('页面未找到');
});

// 启动服务器
app.listen(config.port, () => {
  console.log(`服务器运行在 http://localhost:${config.port}`);
  if (config.password !== '') {
    console.log('登录密码已设置');
  }
  if (config.debug) {
    console.log('调试模式已启用');
    console.log('配置:', { ...config, password: config.password ? '******' : '' });
  }
});
