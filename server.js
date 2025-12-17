// server.js - 网易云API代理服务器
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 网易云API基础URL（使用公共API服务）
const NETEASE_API = 'https://netease-cloud-music-api-liart-iota.vercel.app';

// 代理请求函数
async function proxyRequest(req, res, path, params = {}) {
  try {
    const response = await axios({
      method: req.method,
      url: `${NETEASE_API}${path}`,
      params: {
        ...req.query,
        ...params
      },
      data: req.body,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://music.163.com/',
        'Origin': 'https://music.163.com'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('代理请求失败:', error.message);
    res.status(500).json({
      code: 500,
      message: '服务器错误: ' + error.message
    });
  }
}

// 登录接口
app.post('/api/login', async (req, res) => {
  const { phone, password } = req.body;
  await proxyRequest(req, res, '/login/cellphone', { phone, password });
});

// 搜索接口
app.get('/api/search', (req, res) => {
  proxyRequest(req, res, '/search', {
    keywords: req.query.keywords,
    limit: req.query.limit || 30,
    offset: req.query.offset || 0,
    type: req.query.type || 1 // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单
  });
});

// 获取歌曲详情
app.get('/api/song/detail', (req, res) => {
  proxyRequest(req, res, '/song/detail', {
    ids: req.query.ids
  });
});

// 获取歌曲URL
app.get('/api/song/url', (req, res) => {
  proxyRequest(req, res, '/song/url', {
    id: req.query.id,
    br: req.query.br || 320000 // 比特率
  });
});

// 获取歌词
app.get('/api/lyric', (req, res) => {
  proxyRequest(req, res, '/lyric', {
    id: req.query.id
  });
});

// 获取歌单详情
app.get('/api/playlist/detail', (req, res) => {
  proxyRequest(req, res, '/playlist/detail', {
    id: req.query.id
  });
});

// 获取热门歌单
app.get('/api/top/playlist', (req, res) => {
  proxyRequest(req, res, '/top/playlist', {
    cat: req.query.cat || '全部',
    limit: req.query.limit || 20,
    offset: req.query.offset || 0
  });
});

// 获取每日推荐歌曲（需要登录）
app.get('/api/recommend/songs', (req, res) => {
  proxyRequest(req, res, '/recommend/songs');
});

// 获取排行榜
app.get('/api/toplist', (req, res) => {
  proxyRequest(req, res, '/toplist');
});

// 获取用户信息
app.get('/api/user/detail', (req, res) => {
  proxyRequest(req, res, '/user/detail', {
    uid: req.query.uid
  });
});

// 获取私人FM（需要登录）
app.get('/api/personal_fm', (req, res) => {
  proxyRequest(req, res, '/personal_fm');
});

// 喜欢歌曲（需要登录）
app.get('/api/like', (req, res) => {
  proxyRequest(req, res, '/like', {
    id: req.query.id,
    like: req.query.like || true
  });
});

// 心跳检测 - 防止cookie过期（需要登录）
app.get('/api/login/refresh', (req, res) => {
  proxyRequest(req, res, '/login/refresh');
});

// 检查登录状态
app.get('/api/login/status', (req, res) => {
  proxyRequest(req, res, '/login/status');
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '网易云API代理服务器运行中',
    endpoints: [
      'POST /api/login - 登录',
      'GET /api/search - 搜索',
      'GET /api/song/url - 获取歌曲URL',
      'GET /api/lyric - 获取歌词',
      'GET /api/top/playlist - 获取热门歌单',
      'GET /api/recommend/songs - 获取每日推荐',
      'GET /api/personal_fm - 获取私人FM',
      'GET /api/toplist - 获取排行榜',
      'GET /api/like - 喜欢歌曲',
      'GET /api/login/status - 检查登录状态',
      'GET /api/login/refresh - 刷新登录状态'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`网易云API代理服务器运行在 http://localhost:${PORT}`);
  console.log(`前端API地址: http://localhost:${PORT}/api`);
});
