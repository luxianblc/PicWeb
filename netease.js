// 网易云音乐增强版 - JavaScript

// 全局变量
let API_BASE = 'https://neteaseapi-enhanced.vercel.app';
let currentAudio = null;
let currentTrackIndex = 0;
let isPlaying = false;
let currentPlaylist = [];
let userCookie = null;
let currentSongData = null;
let repeatMode = 0; // 0: 不循环, 1: 循环列表, 2: 单曲循环
let searchCurrentPage = 1;
let searchTotalPage = 1;
let currentSearchType = '1';
let currentSearchKeywords = '';
let currentSearchLimit = 20;
let qrCheckInterval = null;

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('网易云音乐增强版已加载');
    
    // 初始化主题
    initTheme();
    
    // 从本地存储加载设置
    loadSettings();
    
    // 初始化播放器
    initPlayer();
    
    // 初始化搜索功能
    initSearch();
    
    // 加载推荐音乐
    getRecommendations();
    
    // 加载热门搜索
    getHotSearch();
    
    // 检查API状态
    checkAPIStatus();
    
    // 更新登录状态
    updateLoginStatus();
    
    // 初始化登录标签切换
    initLoginTabs();
    
    // 设置事件监听
    setupEventListeners();
});
// 构建API请求URL
function buildApiUrl(endpoint, params = {}) {
    // API基础URL
    const API_BASE = 'https://neteaseapi-enhanced.vercel.app';
    
    // 默认参数
    const defaultParams = {
        timestamp: Date.now(),
        realIP: '116.25.146.177' // 可以设置为随机IP或空
    };
    
    // 合并参数
    const allParams = { ...defaultParams, ...params };
    
    // 构建查询字符串
    const queryString = Object.entries(allParams)
        .filter(([_, value]) => value !== null && value !== undefined)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    
    // 返回完整URL
    return `${API_BASE}${endpoint}${queryString ? '?' + queryString : ''}`;
}
// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('netease_theme') || 'dark';
    setTheme(savedTheme);
    
    // 主题切换按钮
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

// 设置主题
function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('themeIcon').className = 'fas fa-sun';
        localStorage.setItem('netease_theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        document.getElementById('themeIcon').className = 'fas fa-moon';
        localStorage.setItem('netease_theme', 'dark');
    }
}

// 切换主题
function toggleTheme() {
    const isLight = document.body.classList.contains('light-theme');
    setTheme(isLight ? 'dark' : 'light');
}

// 初始化搜索功能
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    // 输入框回车搜索
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMusic();
        }
    });
    
    // 清空搜索
    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        this.style.display = 'none';
        clearSearch();
    });
    
    // 输入时显示清空按钮
    searchInput.addEventListener('input', function() {
        searchClear.style.display = this.value ? 'block' : 'none';
    });
    
    // 搜索类型切换
    document.getElementById('searchType').addEventListener('change', function() {
        currentSearchType = this.value;
    });
    
    // 搜索数量切换
    document.getElementById('searchLimit').addEventListener('change', function() {
        currentSearchLimit = parseInt(this.value);
    });
    
    // 搜索标签切换
    const searchTabs = document.querySelectorAll('.search-tab');
    searchTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 更新激活状态
            searchTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 更新当前搜索类型
            currentSearchType = this.getAttribute('data-type');
            
            // 重新显示搜索结果
            if (currentSearchKeywords) {
                searchMusic();
            }
        });
    });
    
    // 分页按钮
    document.getElementById('prevPage').addEventListener('click', function() {
        if (searchCurrentPage > 1) {
            searchCurrentPage--;
            searchMusic();
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', function() {
        if (searchCurrentPage < searchTotalPage) {
            searchCurrentPage++;
            searchMusic();
        }
    });
}

// 初始化播放器
function initPlayer() {
    const audio = new Audio();
    currentAudio = audio;
    
    // DOM元素
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const volumeSlider = document.getElementById('volumeSlider');
    const repeatBtn = document.getElementById('repeatBtn');
    
    // 播放/暂停
    playBtn.addEventListener('click', togglePlay);
    
    // 音量控制
    volumeSlider.addEventListener('input', function() {
        audio.volume = this.value / 100;
        document.getElementById('volumePercent').textContent = this.value + '%';
        
        // 更新音量图标
        const volumeIcon = document.getElementById('volumeIcon');
        if (this.value == 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (this.value < 50) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    });
    
    // 进度条控制
    progressBar.addEventListener('click', function(e) {
        if (!audio.duration) return;
        const percent = e.offsetX / this.clientWidth;
        audio.currentTime = percent * audio.duration;
    });
    
    // 循环模式
    repeatBtn.addEventListener('click', function() {
        repeatMode = (repeatMode + 1) % 3;
        updateRepeatButton();
    });
    
    // 音频事件监听
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', function() {
        document.getElementById('totalTime').textContent = formatTime(audio.duration);
    });
    audio.addEventListener('ended', function() {
        isPlaying = false;
        playIcon.className = 'fas fa-play';
        
        // 根据循环模式处理
        if (repeatMode === 2) {
            // 单曲循环
            audio.currentTime = 0;
            audio.play();
            isPlaying = true;
            playIcon.className = 'fas fa-pause';
        } else if (repeatMode === 1) {
            // 循环列表
            playNext();
        } else {
            // 不循环，什么也不做
        }
    });
    
    // 上一首/下一首按钮
    document.getElementById('prevBtn').addEventListener('click', playPrev);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    
    // 喜欢按钮
    document.getElementById('likeBtn').addEventListener('click', toggleLike);
}

// 更新循环按钮
function updateRepeatButton() {
    const repeatBtn = document.getElementById('repeatBtn');
    const icon = repeatBtn.querySelector('i');
    
    if (repeatMode === 0) {
        icon.className = 'fas fa-redo';
        icon.style.color = '';
        repeatBtn.title = '列表循环';
    } else if (repeatMode === 1) {
        icon.className = 'fas fa-redo';
        icon.style.color = 'var(--primary-color)';
        repeatBtn.title = '单曲循环';
    } else {
        icon.className = 'fas fa-redo';
        icon.style.color = 'var(--primary-color)';
        icon.style.textShadow = '0 0 10px var(--primary-color)';
        repeatBtn.title = '随机播放';
    }
}

// 加载设置
function loadSettings() {
    const savedApiBase = localStorage.getItem('netease_api_base');
    if (savedApiBase) {
        API_BASE = savedApiBase;
    }
    
    const savedCookie = localStorage.getItem('netease_cookie');
    if (savedCookie) {
        userCookie = savedCookie;
    }
}

// 设置事件监听
function setupEventListeners() {
    // 发现链接
    document.getElementById('discoverLink').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    });
}

// 搜索音乐 - 聚合搜索
async function searchMusic() {
    const searchInput = document.getElementById('searchInput');
    const keywords = searchInput.value.trim();
    
    if (!keywords) {
        alert('请输入搜索关键词');
        return;
    }
    
    currentSearchKeywords = keywords;
    searchCurrentPage = 1;
    
    // 显示加载状态
    const resultsContainer = document.getElementById('searchResultsContainer');
    const searchResults = document.getElementById('searchResults');
    const noResults = document.getElementById('noResults');
    const searchLoading = document.getElementById('searchLoading');
    const searchPagination = document.getElementById('searchPagination');
    
    resultsContainer.style.display = 'block';
    searchResults.innerHTML = '';
    noResults.style.display = 'none';
    searchLoading.style.display = 'block';
    searchPagination.style.display = 'none';
    
    // 更新标题
    document.getElementById('searchResultsTitle').textContent = `搜索: ${keywords}`;
    document.getElementById('searchResultsType').textContent = `类型: ${getSearchTypeName(currentSearchType)}`;
    
    try {
        const params = {
            keywords: encodeURIComponent(keywords),
            type: currentSearchType,
            limit: currentSearchLimit,
            offset: (searchCurrentPage - 1) * currentSearchLimit
        };
        
        if (userCookie) params.cookie = userCookie;
        
        const url = buildApiUrl('/cloudsearch', params);
        const response = await fetch(url);
        const data = await response.json();
        
        searchLoading.style.display = 'none';
        
        if (data.code === 200) {
            displaySearchResults(data.result);
            updateSearchPagination(data.result);
        } else {
            noResults.style.display = 'block';
            noResults.innerHTML = `
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <h4>搜索失败</h4>
                <p>${data.message || '未知错误'}</p>
            `;
        }
    } catch (error) {
        searchLoading.style.display = 'none';
        noResults.style.display = 'block';
        noResults.innerHTML = `
            <i class="fas fa-wifi-slash fa-3x"></i>
            <h4>网络错误</h4>
            <p>${error.message}</p>
        `;
    }
}

// 显示搜索结果
function displaySearchResults(result) {
    const searchResults = document.getElementById('searchResults');
    const noResults = document.getElementById('noResults');
    
    // 清空结果
    searchResults.innerHTML = '';
    
    // 根据搜索类型显示不同结果
    let songs = [];
    let resultCount = 0;
    
    switch (currentSearchType) {
        case '1': // 单曲
            if (result.songs) {
                songs = result.songs;
                currentPlaylist = songs;
                resultCount = result.songCount || songs.length;
            }
            break;
        case '10': // 专辑
            if (result.albums) {
                songs = result.albums;
                resultCount = result.albumCount || songs.length;
            }
            break;
        case '100': // 歌手
            if (result.artists) {
                songs = result.artists;
                resultCount = result.artistCount || songs.length;
            }
            break;
        case '1000': // 歌单
            if (result.playlists) {
                songs = result.playlists;
                resultCount = result.playlistCount || songs.length;
            }
            break;
        case '1018': // 综合
            // 综合搜索显示所有类型
            displayComprehensiveResults(result);
            return;
    }
    
    // 更新结果数量
    document.getElementById('searchResultsCount').textContent = `${resultCount} 个结果`;
    
    // 更新标签计数
    updateTabCounts(result);
    
    if (songs.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    // 生成HTML
    let html = '';
    
    songs.forEach((item, index) => {
        if (currentSearchType === '1') {
            // 单曲
            const artists = item.ar ? item.ar.map(artist => artist.name).join(', ') : '未知';
            const album = item.al ? item.al.name : '未知';
            const cover = item.al ? item.al.picUrl : '';
            const duration = formatTime(item.dt);
            
            html += `
                <div class="song-item" onclick="playSearchResult(${index})" data-id="${item.id}">
                    <div class="song-cover">
                        ${cover ? `<img src="${cover}?param=50y50" alt="${item.name}">` : 
                                  `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-music"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${item.name}</div>
                        <div class="song-artist">${artists} - ${album}</div>
                    </div>
                    <div class="song-duration">${duration}</div>
                </div>
            `;
        } else if (currentSearchType === '10') {
            // 专辑
            const artist = item.artist ? item.artist.name : '未知';
            const songCount = item.size || 0;
            
            html += `
                <div class="song-item" onclick="viewAlbum(${item.id})">
                    <div class="song-cover">
                        ${item.picUrl ? `<img src="${item.picUrl}?param=50y50" alt="${item.name}">` : 
                                       `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-compact-disc"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${item.name}</div>
                        <div class="song-artist">${artist} · ${songCount}首</div>
                    </div>
                </div>
            `;
        } else if (currentSearchType === '100') {
            // 歌手
            const albumCount = item.albumSize || 0;
            const mvCount = item.mvSize || 0;
            
            html += `
                <div class="song-item" onclick="viewArtist(${item.id})">
                    <div class="song-cover">
                        ${item.picUrl ? `<img src="${item.picUrl}?param=50y50" alt="${item.name}">` : 
                                       `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${item.name}</div>
                        <div class="song-artist">专辑: ${albumCount} · MV: ${mvCount}</div>
                    </div>
                </div>
            `;
        } else if (currentSearchType === '1000') {
            // 歌单
            const creator = item.creator ? item.creator.nickname : '未知';
            const trackCount = item.trackCount || 0;
            
            html += `
                <div class="song-item" onclick="viewPlaylist(${item.id})">
                    <div class="song-cover">
                        ${item.coverImgUrl ? `<img src="${item.coverImgUrl}?param=50y50" alt="${item.name}">` : 
                                           `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-list"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${item.name}</div>
                        <div class="song-artist">by ${creator} · ${trackCount}首</div>
                    </div>
                </div>
            `;
        }
    });
    
    searchResults.innerHTML = html;
}

// 显示综合搜索结果
function displayComprehensiveResults(result) {
    const searchResults = document.getElementById('searchResults');
    const noResults = document.getElementById('noResults');
    
    // 清空结果
    searchResults.innerHTML = '';
    
    // 更新结果数量
    const totalCount = (result.songCount || 0) + (result.albumCount || 0) + 
                      (result.artistCount || 0) + (result.playlistCount || 0);
    document.getElementById('searchResultsCount').textContent = `${totalCount} 个结果`;
    
    // 更新标签计数
    updateTabCounts(result);
    
    if (totalCount === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    // 显示单曲（最多5首）
    if (result.songs && result.songs.length > 0) {
        searchResults.innerHTML += '<div class="result-section"><h5>单曲</h5></div>';
        
        result.songs.slice(0, 5).forEach((song, index) => {
            const artists = song.ar ? song.ar.map(artist => artist.name).join(', ') : '未知';
            const album = song.al ? song.al.name : '未知';
            const cover = song.al ? song.al.picUrl : '';
            const duration = formatTime(song.dt);
            
            searchResults.innerHTML += `
                <div class="song-item" onclick="playSearchResult(${index})" data-id="${song.id}">
                    <div class="song-cover">
                        ${cover ? `<img src="${cover}?param=50y50" alt="${song.name}">` : 
                                  `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-music"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${song.name}</div>
                        <div class="song-artist">${artists} - ${album}</div>
                    </div>
                    <div class="song-duration">${duration}</div>
                </div>
            `;
        });
        
        if (result.songs.length > 5) {
            searchResults.innerHTML += `
                <div class="more-results" onclick="switchToTab('1')">
                    查看全部 ${result.songCount || result.songs.length} 首单曲 <i class="fas fa-chevron-right"></i>
                </div>
            `;
        }
    }
    
    // 显示专辑（最多3个）
    if (result.albums && result.albums.length > 0) {
        searchResults.innerHTML += '<div class="result-section"><h5>专辑</h5></div>';
        
        result.albums.slice(0, 3).forEach(album => {
            const artist = album.artist ? album.artist.name : '未知';
            const songCount = album.size || 0;
            
            searchResults.innerHTML += `
                <div class="song-item" onclick="viewAlbum(${album.id})">
                    <div class="song-cover">
                        ${album.picUrl ? `<img src="${album.picUrl}?param=50y50" alt="${album.name}">` : 
                                       `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-compact-disc"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${album.name}</div>
                        <div class="song-artist">${artist} · ${songCount}首</div>
                    </div>
                </div>
            `;
        });
        
        if (result.albums.length > 3) {
            searchResults.innerHTML += `
                <div class="more-results" onclick="switchToTab('10')">
                    查看全部 ${result.albumCount || result.albums.length} 张专辑 <i class="fas fa-chevron-right"></i>
                </div>
            `;
        }
    }
    
    // 显示歌手（最多3个）
    if (result.artists && result.artists.length > 0) {
        searchResults.innerHTML += '<div class="result-section"><h5>歌手</h5></div>';
        
        result.artists.slice(0, 3).forEach(artist => {
            const albumCount = artist.albumSize || 0;
            const mvCount = artist.mvSize || 0;
            
            searchResults.innerHTML += `
                <div class="song-item" onclick="viewArtist(${artist.id})">
                    <div class="song-cover">
                        ${artist.picUrl ? `<img src="${artist.picUrl}?param=50y50" alt="${artist.name}">` : 
                                        `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${artist.name}</div>
                        <div class="song-artist">专辑: ${albumCount} · MV: ${mvCount}</div>
                    </div>
                </div>
            `;
        });
        
        if (result.artists.length > 3) {
            searchResults.innerHTML += `
                <div class="more-results" onclick="switchToTab('100')">
                    查看全部 ${result.artistCount || result.artists.length} 位歌手 <i class="fas fa-chevron-right"></i>
                </div>
            `;
        }
    }
    
    // 显示歌单（最多3个）
    if (result.playlists && result.playlists.length > 0) {
        searchResults.innerHTML += '<div class="result-section"><h5>歌单</h5></div>';
        
        result.playlists.slice(0, 3).forEach(playlist => {
            const creator = playlist.creator ? playlist.creator.nickname : '未知';
            const trackCount = playlist.trackCount || 0;
            
            searchResults.innerHTML += `
                <div class="song-item" onclick="viewPlaylist(${playlist.id})">
                    <div class="song-cover">
                        ${playlist.coverImgUrl ? `<img src="${playlist.coverImgUrl}?param=50y50" alt="${playlist.name}">` : 
                                               `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-list"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${playlist.name}</div>
                        <div class="song-artist">by ${creator} · ${trackCount}首</div>
                    </div>
                </div>
            `;
        });
        
        if (result.playlists.length > 3) {
            searchResults.innerHTML += `
                <div class="more-results" onclick="switchToTab('1000')">
                    查看全部 ${result.playlistCount || result.playlists.length} 个歌单 <i class="fas fa-chevron-right"></i>
                </div>
            `;
        }
    }
}

// 切换到指定标签
function switchToTab(type) {
    currentSearchType = type;
    
    // 更新标签激活状态
    const searchTabs = document.querySelectorAll('.search-tab');
    searchTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.getAttribute('data-type') === type) {
            tab.classList.add('active');
        }
    });
    
    // 重新搜索
    searchMusic();
}

// 更新搜索分页
function updateSearchPagination(result) {
    const total = result.songCount || result.albumCount || result.artistCount || result.playlistCount || 0;
    searchTotalPage = Math.ceil(total / currentSearchLimit);
    
    const pagination = document.getElementById('searchPagination');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    const currentPage = document.getElementById('currentPage');
    
    currentPage.textContent = searchCurrentPage;
    
    if (searchTotalPage > 1) {
        pagination.style.display = 'flex';
        prevBtn.disabled = searchCurrentPage <= 1;
        nextBtn.disabled = searchCurrentPage >= searchTotalPage;
    } else {
        pagination.style.display = 'none';
    }
}

// 更新标签计数
function updateTabCounts(result) {
    document.getElementById('songCount').textContent = result.songCount || 0;
    document.getElementById('albumCount').textContent = result.albumCount || 0;
    document.getElementById('artistCount').textContent = result.artistCount || 0;
    document.getElementById('playlistCount').textContent = result.playlistCount || 0;
}

// 清空搜索
function clearSearch() {
    const resultsContainer = document.getElementById('searchResultsContainer');
    resultsContainer.style.display = 'none';
    document.getElementById('searchInput').value = '';
    currentSearchKeywords = '';
}

// 获取热门搜索
async function getHotSearch() {
    try {
        const url = buildApiUrl('/search/hot/detail');
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.data) {
            displayHotSearch(data.data.slice(0, 10));
        }
    } catch (error) {
        console.error('获取热门搜索失败:', error);
    }
}

// 显示热门搜索
function displayHotSearch(hotList) {
    const hotSearchTags = document.getElementById('hotSearchTags');
    
    let html = '';
    hotList.forEach((item, index) => {
        html += `
            <button class="hot-tag" onclick="setSearchKeyword('${item.searchWord}')">
                ${index < 3 ? `<span style="color: var(--primary-color);">${index + 1}</span>` : index + 1}. ${item.searchWord}
            </button>
        `;
    });
    
    hotSearchTags.innerHTML = html;
}

// 设置搜索关键词
function setSearchKeyword(keyword) {
    document.getElementById('searchInput').value = keyword;
    document.getElementById('searchClear').style.display = 'block';
    searchMusic();
}

// 播放搜索结果
async function playSearchResult(index) {
    const song = currentPlaylist[index];
    
    // 更新高亮
    document.querySelectorAll('#searchResults .song-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // 更新播放器显示
    document.getElementById('trackTitle').textContent = song.name;
    document.getElementById('trackArtist').textContent = song.ar ? song.ar.map(artist => artist.name).join(', ') : '未知';
    document.getElementById('trackAlbum').textContent = '专辑：' + (song.al ? song.al.name : '未知');
    document.getElementById('trackDuration').textContent = '时长：' + formatTime(song.dt);
    
    // 更新专辑封面
    const albumArt = document.getElementById('albumArt');
    if (song.al && song.al.picUrl) {
        albumArt.className = 'album-art';
        albumArt.innerHTML = `<img src="${song.al.picUrl}?param=200y200" alt="${song.name}">`;
    } else {
        albumArt.className = 'album-art default';
        albumArt.innerHTML = '<i class="fas fa-music"></i>';
    }
    
    // 获取播放链接
    try {
        const params = {
            id: song.id,
            level: userCookie ? 'exhigh' : 'standard'
        };
        
        if (userCookie) params.cookie = userCookie;
        
        const url = buildApiUrl('/song/url/v1', params);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.data && data.data[0].url) {
            const songData = data.data[0];
            document.getElementById('trackQuality').textContent = '音质：' + getQualityText(songData.level);
            
            // 播放
            currentAudio.src = songData.url;
            currentAudio.play().then(() => {
                isPlaying = true;
                document.getElementById('playIcon').className = 'fas fa-pause';
                currentSongData = song;
                currentTrackIndex = index;
            });
        } else {
            alert('无法播放此歌曲：' + (data.message || '无版权或VIP专享'));
        }
    } catch (error) {
        alert('播放失败：' + error.message);
    }
}

// 获取推荐音乐
async function getRecommendations() {
    const recDiv = document.getElementById('recommendations');
    recDiv.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    
    try {
        const params = {};
        if (userCookie) params.cookie = userCookie;
        
        const url = buildApiUrl('/personalized/newsong', params);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.result) {
            displayRecommendations(data.result.slice(0, 10), '每日推荐');
        } else {
            getDefaultRecommendations();
        }
    } catch (error) {
        getDefaultRecommendations();
    }
}

// 显示推荐音乐
function displayRecommendations(songs, title) {
    const recDiv = document.getElementById('recommendations');
    
    let html = `<h4 style="margin-bottom: 1rem; color: var(--primary-color);">${title}</h4>`;
    
    songs.forEach((song, index) => {
        const cover = song.picUrl || (song.song && song.song.al && song.song.al.picUrl) || '';
        const songName = song.name || (song.song && song.song.name) || '未知歌曲';
        const artist = song.song && song.song.ar ? song.song.ar.map(a => a.name).join(', ') : '未知歌手';
        const songId = song.id || (song.song && song.song.id);
        
        html += `
            <div class="song-item" onclick="playRecommendation(${songId})">
                <div class="song-cover">
                    ${cover ? `<img src="${cover}?param=50y50" alt="${songName}">` : 
                              `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-music"></i></div>`}
                </div>
                <div class="song-info">
                    <div class="song-title">${songName}</div>
                    <div class="song-artist">${artist}</div>
                </div>
            </div>
        `;
    });
    
    recDiv.innerHTML = html;
}

// 默认推荐列表（备用）
function getDefaultRecommendations() {
    const recDiv = document.getElementById('recommendations');
    
    const defaultSongs = [
        { id: 33894312, name: "起风了", artist: "买辣椒也用券" },
        { id: 1330348068, name: "沈园外", artist: "阿YueYue,戾格,小田音乐社" },
        { id: 1441758494, name: "如愿", artist: "王菲" },
        { id: 1901371647, name: "雪 Distance", artist: "Capper,罗言RollFlash" },
        { id: 1974443814, name: "我会等", artist: "承桓" },
        { id: 202373, name: "晴天", artist: "周杰伦" },
        { id: 65528, name: "江南", artist: "林俊杰" },
        { id: 108478, name: "泡沫", artist: "G.E.M.邓紫棋" }
    ];
    
    displayRecommendations(defaultSongs, '热门歌曲');
}

// 通过ID播放歌曲
async function playSongById(songId) {
    try {
        // 获取歌曲详情
        const songUrl = buildApiUrl('/song/detail', { ids: songId });
        const songResponse = await fetch(songUrl);
        const songData = await songResponse.json();
        
        if (songData.code === 200 && songData.songs[0]) {
            const song = songData.songs[0];
            
            // 更新播放器显示
            document.getElementById('trackTitle').textContent = song.name;
            document.getElementById('trackArtist').textContent = song.ar ? song.ar.map(artist => artist.name).join(', ') : '未知';
            document.getElementById('trackAlbum').textContent = '专辑：' + (song.al ? song.al.name : '未知');
            document.getElementById('trackDuration').textContent = '时长：' + formatTime(song.dt);
            
            // 更新专辑封面
            const albumArt = document.getElementById('albumArt');
            if (song.al && song.al.picUrl) {
                albumArt.className = 'album-art';
                albumArt.innerHTML = `<img src="${song.al.picUrl}?param=200y200" alt="${song.name}">`;
            } else {
                albumArt.className = 'album-art default';
                albumArt.innerHTML = '<i class="fas fa-music"></i>';
            }
            
            // 获取播放链接
            const params = {
                id: songId,
                level: userCookie ? 'exhigh' : 'standard'
            };
            
            if (userCookie) params.cookie = userCookie;
            
            const url = buildApiUrl('/song/url/v1', params);
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.code === 200 && data.data && data.data[0].url) {
                const audioData = data.data[0];
                document.getElementById('trackQuality').textContent = '音质：' + getQualityText(audioData.level);
                
                // 播放
                currentAudio.src = audioData.url;
                currentAudio.play().then(() => {
                    isPlaying = true;
                    document.getElementById('playIcon').className = 'fas fa-pause';
                    currentSongData = song;
                });
            }
        }
    } catch (error) {
        alert('播放失败：' + error.message);
    }
}

// 播放推荐歌曲
async function playRecommendation(songId) {
    await playSongById(songId);
}

// 播放/暂停
function togglePlay() {
    if (!currentAudio.src) {
        // 如果没有歌曲，播放第一首推荐
        const firstSong = document.querySelector('#recommendations .song-item');
        if (firstSong) {
            const onclickAttr = firstSong.getAttribute('onclick');
            if (onclickAttr) {
                const songId = onclickAttr.match(/\d+/)[0];
                playSongById(songId);
            }
        }
        return;
    }
    
    if (isPlaying) {
        currentAudio.pause();
        document.getElementById('playIcon').className = 'fas fa-play';
    } else {
        currentAudio.play().then(() => {
            document.getElementById('playIcon').className = 'fas fa-pause';
        });
    }
    isPlaying = !isPlaying;
}

// 播放上一首
function playPrev() {
    if (currentPlaylist.length === 0) return;
    
    current
