// 网易云音乐JS
let API_BASE = 'https://neteaseapi-enhanced.vercel.app';
let currentAudio = null;
let currentTrackIndex = 0;
let isPlaying = false;
let currentPlaylist = [];
let userCookie = null;
let currentSongData = null;
let shuffleMode = false;
let repeatMode = 'none'; // 'none', 'one', 'all'
let searchHistory = [];
let currentSearchType = 1;
let currentPage = 1;
let searchTotal = 0;
let searchLimit = 30;

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('网易云音乐正式版已加载');
    
    // 初始化主题
    initTheme();
    
    // 初始化搜索历史
    loadSearchHistory();
    
    // 初始化播放器
    initPlayer();
    
    // 加载推荐音乐
    getRecommendations();
    
    // 加载热门歌单
    getHotPlaylists();
    
    // 检查API状态
    checkAPIStatus();
    
    // 更新登录状态
    updateLoginStatus();
    
    // 绑定事件
    bindEvents();
});

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('netease_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        document.getElementById('themeIcon').className = 'fas fa-sun';
    }
}

// 绑定事件
function bindEvents() {
    // 主题切换
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // 搜索输入事件
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    searchInput.addEventListener('input', function() {
        searchClear.style.display = this.value ? 'block' : 'none';
    });
    
    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        this.style.display = 'none';
    });
    
    // 搜索类型按钮
    document.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSearchType = parseInt(this.dataset.type);
        });
    });
    
    // 搜索快捷键
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMusic();
        }
    });
    
    // 随机播放和循环按钮
    document.getElementById('shuffleBtn').addEventListener('click', toggleShuffle);
    document.getElementById('repeatBtn').addEventListener('click', toggleRepeat);
}

// 切换主题
function toggleTheme() {
    const themeIcon = document.getElementById('themeIcon');
    if (document.body.classList.contains('light-mode')) {
        document.body.classList.remove('light-mode');
        themeIcon.className = 'fas fa-moon';
        localStorage.setItem('netease_theme', 'dark');
    } else {
        document.body.classList.add('light-mode');
        themeIcon.className = 'fas fa-sun';
        localStorage.setItem('netease_theme', 'light');
    }
}

// 搜索音乐 - 改进版
async function searchMusic() {
    const searchInput = document.getElementById('searchInput');
    const keywords = searchInput.value.trim();
    
    if (!keywords) {
        alert('请输入搜索关键词');
        return;
    }
    
    // 添加到搜索历史
    addToSearchHistory(keywords);
    
    const resultsDiv = document.getElementById('searchResults');
    const container = document.getElementById('searchResultsContainer');
    const title = document.getElementById('searchResultsTitle');
    
    resultsDiv.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    container.style.display = 'block';
    title.textContent = `搜索"${keywords}"`;
    
    try {
        const params = {
            keywords: encodeURIComponent(keywords),
            type: currentSearchType,
            limit: searchLimit,
            offset: (currentPage - 1) * searchLimit
        };
        
        if (userCookie) params.cookie = userCookie;
        
        const url = buildApiUrl('/cloudsearch', params);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            searchTotal = data.result.songCount || data.result.playlistCount || data.result.albumCount || 0;
            displaySearchResults(data.result, keywords);
            updatePagination();
        } else {
            resultsDiv.innerHTML = `<div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>搜索失败：${data.message || '未知错误'}</p>
            </div>`;
        }
    } catch (error) {
        resultsDiv.innerHTML = `<div class="empty-state">
            <i class="fas fa-wifi-slash"></i>
            <p>网络错误：${error.message}</p>
        </div>`;
    }
}

// 显示搜索结果
function displaySearchResults(result, keywords) {
    const resultsDiv = document.getElementById('searchResults');
    const tabsDiv = document.getElementById('searchTabs');
    
    // 根据搜索类型显示不同结果
    let html = '';
    
    switch(currentSearchType) {
        case 1: // 单曲
            currentPlaylist = result.songs || [];
            html = generateSongList(currentPlaylist);
            tabsDiv.innerHTML = `
                <button class="search-tab active" onclick="switchSearchTab('songs')">单曲(${result.songCount || 0})</button>
                <button class="search-tab" onclick="switchSearchTab('artists')">歌手(${result.artistCount || 0})</button>
                <button class="search-tab" onclick="switchSearchTab('albums')">专辑(${result.albumCount || 0})</button>
                <button class="search-tab" onclick="switchSearchTab('playlists')">歌单(${result.playlistCount || 0})</button>
            `;
            break;
            
        case 100: // 歌手
            html = generateArtistList(result.artists || []);
            break;
            
        case 10: // 专辑
            html = generateAlbumList(result.albums || []);
            break;
            
        case 1000: // 歌单
            html = generatePlaylistList(result.playlists || []);
            break;
            
        default:
            html = generateMixedResults(result);
    }
    
    resultsDiv.innerHTML = html;
}

// 生成歌曲列表HTML
function generateSongList(songs) {
    if (!songs || songs.length === 0) {
        return `<div class="empty-state">
            <i class="fas fa-music"></i>
            <p>未找到相关歌曲</p>
        </div>`;
    }
    
    return songs.map((song, index) => {
        const artists = song.ar ? song.ar.map(artist => artist.name).join(', ') : '未知';
        const album = song.al ? song.al.name : '未知';
        const cover = song.al ? song.al.picUrl : '';
        const duration = formatTime(song.dt);
        
        return `
            <div class="song-item" onclick="playSearchResult(${index})" data-id="${song.id}">
                <div class="song-cover">
                    ${cover ? `<img src="${cover}?param=50y50" alt="${song.name}">` : 
                              `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-music"></i></div>`}
                </div>
                <div class="song-info">
                    <div class="song-title">${highlightText(song.name, document.getElementById('searchInput').value)}</div>
                    <div class="song-artist">${artists} - ${album}</div>
                </div>
                <div class="song-duration">${duration}</div>
            </div>
        `;
    }).join('');
}

// 生成歌手列表
function generateArtistList(artists) {
    if (!artists || artists.length === 0) return '<div class="empty-state">未找到相关歌手</div>';
    
    return artists.map(artist => {
        const cover = artist.img1v1Url || artist.picUrl || '';
        return `
            <div class="song-item" onclick="searchArtistSongs(${artist.id})">
                <div class="song-cover">
                    ${cover ? `<img src="${cover}?param=50y50" alt="${artist.name}">` : 
                              `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user"></i></div>`}
                </div>
                <div class="song-info">
                    <div class="song-title">${artist.name}</div>
                    <div class="song-artist">${artist.alias ? artist.alias.join(' ') : ''}</div>
                </div>
            </div>
        `;
    }).join('');
}

// 生成专辑列表
function generateAlbumList(albums) {
    if (!albums || albums.length === 0) return '<div class="empty-state">未找到相关专辑</div>';
    
    return albums.map(album => {
        const artists = album.artists ? album.artists.map(a => a.name).join(', ') : '未知';
        return `
            <div class="song-item" onclick="getAlbumSongs(${album.id})">
                <div class="song-cover">
                    ${album.picUrl ? `<img src="${album.picUrl}?param=50y50" alt="${album.name}">` : 
                                   `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-compact-disc"></i></div>`}
                </div>
                <div class="song-info">
                    <div class="song-title">${album.name}</div>
                    <div class="song-artist">${artists} • ${album.size || 0}首</div>
                </div>
            </div>
        `;
    }).join('');
}

// 生成混合结果
function generateMixedResults(result) {
    let html = '';
    
    if (result.songs && result.songs.length > 0) {
        html += `<h4 style="margin: 1rem 0; color: var(--primary-color);">单曲</h4>`;
        html += generateSongList(result.songs.slice(0, 5));
    }
    
    if (result.artists && result.artists.length > 0) {
        html += `<h4 style="margin: 1rem 0; color: var(--primary-color);">歌手</h4>`;
        html += generateArtistList(result.artists.slice(0, 5));
    }
    
    if (result.albums && result.albums.length > 0) {
        html += `<h4 style="margin: 1rem 0; color: var(--primary-color);">专辑</h4>`;
        html += generateAlbumList(result.albums.slice(0, 5));
    }
    
    if (!html) html = '<div class="empty-state">未找到相关内容</div>';
    
    return html;
}

// 高亮搜索关键词
function highlightText(text, keyword) {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

// 更新分页
function updatePagination() {
    const paginationDiv = document.getElementById('searchPagination');
    const totalPages = Math.ceil(searchTotal / searchLimit);
    
    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (currentPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">上一页</button>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    if (currentPage < totalPages) {
        html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">下一页</button>`;
    }
    
    paginationDiv.innerHTML = html;
}

// 切换页面
function goToPage(page) {
    currentPage = page;
    searchMusic();
}

// 切换搜索标签
function switchSearchTab(tab) {
    // 实现标签切换逻辑
    console.log('切换到标签:', tab);
}

// 搜索历史功能
function loadSearchHistory() {
    const saved = localStorage.getItem('netease_search_history');
    if (saved) {
        searchHistory = JSON.parse(saved);
    }
}

function addToSearchHistory(keyword) {
    if (!keyword) return;
    
    // 移除重复
    searchHistory = searchHistory.filter(item => item !== keyword);
    
    // 添加到开头
    searchHistory.unshift(keyword);
    
    // 保持最多10条
    if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
    }
    
    localStorage.setItem('netease_search_history', JSON.stringify(searchHistory));
}

function showSearchHistory() {
    const searchInput = document.getElementById('searchInput');
    
    if (searchHistory.length === 0) {
        alert('暂无搜索历史');
        return;
    }
    
    const historyList = searchHistory.map(item => `• ${item}`).join('\n');
    const keyword = prompt('搜索历史：\n\n' + historyList + '\n\n请输入要搜索的关键词：', searchInput.value);
    
    if (keyword) {
        searchInput.value = keyword;
        searchMusic();
    }
}

// 热门搜索
async function showHotSearches() {
    try {
        const url = buildApiUrl('/search/hot');
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.result && data.result.hots) {
            const hotList = data.result.hots.slice(0, 10).map(hot => hot.first).join('\n');
            const keyword = prompt('热门搜索：\n\n' + hotList + '\n\n请输入要搜索的关键词：');
            
            if (keyword) {
                document.getElementById('searchInput').value = keyword;
                searchMusic();
            }
        } else {
            alert('无法获取热门搜索');
        }
    } catch (error) {
        alert('获取热门搜索失败：' + error.message);
    }
}

// 清除搜索
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchClear').style.display = 'none';
    document.getElementById('searchResultsContainer').style.display = 'none';
}

// 切换随机播放
function toggleShuffle() {
    shuffleMode = !shuffleMode;
    const btn = document.getElementById('shuffleBtn');
    if (shuffleMode) {
        btn.style.color = 'var(--primary-color)';
    } else {
        btn.style.color = '';
    }
}

// 切换循环模式
function toggleRepeat() {
    const modes = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(repeatMode);
    repeatMode = modes[(currentIndex + 1) % modes.length];
    
    const btn = document.getElementById('repeatBtn');
    switch(repeatMode) {
        case 'none':
            btn.style.color = '';
            btn.title = '循环播放';
            break;
        case 'one':
            btn.style.color = 'var(--primary-color)';
            btn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            btn.title = '单曲循环';
            break;
        case 'all':
            btn.style.color = 'var(--primary-color)';
            btn.innerHTML = '<i class="fas fa-infinity"></i>';
            btn.title = '列表循环';
            break;
    }
}

// 获取热门歌单
async function getHotPlaylists() {
    try {
        const url = buildApiUrl('/top/playlist', { limit: 6 });
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.playlists) {
            displayHotPlaylists(data.playlists);
        }
    } catch (error) {
        console.error('获取热门歌单失败:', error);
    }
}

// 显示热门歌单
function displayHotPlaylists(playlists) {
    const listDiv = document.getElementById('playlistList');
    
    let html = playlists.map(playlist => `
        <div class="playlist-item" onclick="getPlaylistSongs(${playlist.id})">
            <div class="playlist-cover">
                <img src="${playlist.coverImgUrl}?param=180y180" alt="${playlist.name}">
            </div>
            <div class="playlist-info">
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-creator">${playlist.creator.nickname}</div>
            </div>
        </div>
    `).join('');
    
    listDiv.innerHTML = html;
}

// 其他函数保持不变，包括之前的播放器功能、登录功能等
// ...（保持之前的播放器、登录等相关函数）
