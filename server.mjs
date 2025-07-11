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
  debug: process.env.DEBUG === 'true'
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
  
  //添加全局js
  const injectedScript = `<script src="/static/js/global.js"></script>`;
  content = content.replace('<head>', `<head>\n${injectedScript}\n`);
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
app.get(/^(\/$|\/.*\.html|\/s=.*)$/, async (req, res) => {
  try {
    const userAgent = req.headers['user-agent'];
    //html的基本路径
    const htmlBasePath = path.join(__dirname, 'html');
    
    // 检查是否允许访问
    if (!isAllowedUserAgent(userAgent) && !req.path.includes('download.html')) {
      // 如果不是允许的UA且不是访问download.html，则重定向到download.html
      return res.redirect('/download.html');
    }

    let filePath;

    
    if (req.path === '/' || req.path === '/index.html') {//首页
      filePath = path.join(htmlBasePath, 'index.html');
    } else if (req.path.startsWith('/s=')) {//搜索
      filePath = path.join(htmlBasePath, 'index.html');
    } else {
      // 处理其他 .html 页面
      const relativePath = req.path.replace(/^\//, '');
      filePath = path.join(htmlBasePath, relativePath);
    }

    if (!fs.existsSync(filePath)) {
      console.warn('文件不存在:', filePath);
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

// 检查User-Agent是否允许访问
function isAllowedUserAgent(userAgent) {
  if (!userAgent) return false;
  userAgent = userAgent.toLowerCase();
  
  // 检查是否为iPhone或iPad
  const isIOS = userAgent.includes('iphone') || userAgent.includes('ipad');
  const isJihadAndroid = userAgent.includes('jihadandroid');
  
  // 只允许iOS设备和JihadAndroid
   return isIOS || isJihadAndroid;
}

// 代理路由
app.get('/proxy/:encodedUrl', async (req, res) => {
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
app.get('/download/app', (req, res) => {
  // 直接重定向到下载地址
  res.redirect('https://197795.xyz/static/jihad.apk');
});

app.use('/static',express.static(path.join(__dirname,'static'), {
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
