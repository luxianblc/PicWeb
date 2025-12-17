// 网易云音乐播放器 - 主要功能实现（简化版）

// 全局变量
let currentTrack = null;
let isPlaying = false;
let audioPlayer = new Audio();
let currentPlaylist = [];
let currentIndex = -1;
let volume = 0.5;
let playMode = 'sequential'; // sequential, repeat-one, shuffle
let isLoggedIn = false;
let userInfo = null;
let searchTimeout = null;
let currentPage = 1; // 当前页码
let searchTotal = 0; // 总搜索结果数
let searchLimit = 30; // 每页显示数量
let currentVolume = 50; // 音量
let isMuted = false; // 是否静音
let previousVolume = 50; // 之前的音量
let qrCheckInterval = null; // 二维码登录检查间隔
let searchHistory = []; // 搜索历史

// 配置
const API_BASE_URL = 'https://netease-cloud-music-api-sigma-three.vercel.app';
const DEFAULT_COVER = 'https://p2.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg';

// DOM 元素
const elements = {
    // 播放器控制
    playBtn: document.getElementById('playBtn'),
    playIcon: document.getElementById('playIcon'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    likeBtn: document.getElementById('likeBtn'),
    modeBtn: document.getElementById('modeBtn'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    repeatBtn: document.getElementById('repeatBtn'),
    volumeSlider: document.getElementById('volumeSlider'),
    volumePercent: document.getElementById('volumePercent'),
    volumeIcon: document.getElementById('volumeIcon'),
    
    // 播放器显示
    trackTitle: document.getElementById('trackTitle'),
    trackArtist: document.getElementById('trackArtist'),
    trackAlbum: document.getElementById('trackAlbum'),
    trackDuration: document.getElementById('trackDuration'),
    trackQuality: document.getElementById('trackQuality'),
    albumArt: document.getElementById('albumArt'),
    currentTime: document.getElementById('currentTime'),
    totalTime: document.getElementById('totalTime'),
    progress: document.getElementById('progress'),
    progressBar: document.getElementById('progressBar'),
    
    // 搜索相关
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    searchResults: document.getElementById('searchResults'),
    resultCount: document.getElementById('resultCount'),
    resultType: document.getElementById('resultType'),
    searchStats: document.getElementById('searchStats'),
    noResults: document.getElementById('noResults'),
    searchResultsContainer: document.getElementById('searchResultsContainer'),
    searchResultsTitle: document.getElementById('searchResultsTitle'),
    searchPagination: document.getElementById('searchPagination'),
    searchTabs: document.getElementById('searchTabs'),
    searchLimit: document.getElementById('searchLimit'),
    searchSort: document.getElementById('searchSort'),
    
    // 搜索类型按钮
    typeButtons: document.querySelectorAll('.type-btn'),
    
    // 推荐和状态
    recommendations: document.getElementById('recommendations'),
    loginStatus: document.getElementById('loginStatus'),
    qualityStatus: document.getElementById('qualityStatus'),
    apiStatusCard: document.getElementById('apiStatusCard'),
    playMode: document.getElementById('playMode'),
    cacheStatus: document.getElementById('cacheStatus'),
    
    // 主题切换
    themeToggle: document.getElementById('themeToggle'),
    themeIcon: document.getElementById('themeIcon'),
    
    // 登录模态框
    loginModal: document.getElementById('loginModal'),
    loginAccount: document.getElementById('loginAccount'),
    loginPassword: document.getElementById('loginPassword'),
    loginPhone: document.getElementById('loginPhone'),
    loginCaptcha: document.getElementById('loginCaptcha'),
    sendCaptchaBtn: document.getElementById('sendCaptchaBtn'),
    modalClose: document.querySelector('.modal-close'),
    
    // 其他
    playlistList: document.getElementById('playlistList')
};

// 初始化函数
function init() {
    console.log('网易云音乐播放器初始化...');
    
    // 设置音频播放器
    setupAudioPlayer();
    
    // 绑定事件监听器
    bindEvents();
    
    // 检查 API 状态
    checkApiStatus();
    
    // 获取推荐音乐
    getRecommendations();
    
    // 获取热门歌单
    getHotPlaylists();
    
    // 检查登录状态
    checkLoginStatus();
    
    // 初始化主题
    initTheme();
    
    // 初始化搜索
    initSearch();
    
    // 加载设置
    loadSettings();
    
    console.log('初始化完成！');
}

// 设置音频播放器
function setupAudioPlayer() {
    audioPlayer.volume = volume;
    audioPlayer.preload = 'metadata';
    
    // 音频事件监听
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('ended', handleTrackEnd);
    audioPlayer.addEventListener('error', handleAudioError);
    audioPlayer.addEventListener('play', () => {
        isPlaying = true;
        updatePlayButton();
    });
    audioPlayer.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayButton();
    });
    
    // 设置默认专辑封面
    setDefaultAlbumArt();
}

// 绑定事件监听器
function bindEvents() {
    // 播放器控制
    elements.playBtn.addEventListener('click', togglePlay);
    elements.prevBtn.addEventListener('click', playPrevious);
    elements.nextBtn.addEventListener('click', playNext);
    elements.likeBtn.addEventListener('click', toggleLike);
    elements.modeBtn.addEventListener('click', togglePlayMode);
    
    // 随机播放和循环按钮
    if (elements.shuffleBtn) {
        elements.shuffleBtn.addEventListener('click', toggleShuffle);
    }
    if (elements.repeatBtn) {
        elements.repeatBtn.addEventListener('click', toggleRepeat);
    }
    
    // 音量控制
    if (elements.volumeSlider) {
        elements.volumeSlider.addEventListener('input', updateVolume);
    }
    if (elements.volumeIcon) {
        elements.volumeIcon.addEventListener('click', toggleMute);
    }
    
    // 进度条控制
    if (elements.progressBar) {
        elements.progressBar.addEventListener('click', seekToPosition);
    }
    
    // 主题切换
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }
    
    // 搜索相关
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', handleSearchInput);
        elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchMusic();
        });
    }
    
    if (elements.searchClear) {
        elements.searchClear.addEventListener('click', clearSearchInput);
    }
    
    // 每页数量选择
    if (elements.searchLimit) {
        elements.searchLimit.addEventListener('change', function() {
            searchLimit = parseInt(this.value);
            // 如果已有搜索结果，重新搜索
            if (elements.searchInput.value.trim()) {
                currentPage = 1;
                searchMusic();
            }
        });
    }
    
    // 排序方式选择
    if (elements.searchSort) {
        elements.searchSort.addEventListener('change', function() {
            // 如果已有搜索结果，重新搜索
            if (elements.searchInput.value.trim()) {
                currentPage = 1;
                searchMusic();
            }
        });
    }
    
    // 模态框关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideLoginModal();
    });
    
    if (elements.modalClose) {
        elements.modalClose.addEventListener('click', hideLoginModal);
    }
    
    // 点击模态框外部关闭
    if (elements.loginModal) {
        elements.loginModal.addEventListener('click', (e) => {
            if (e.target === elements.loginModal) {
                hideLoginModal();
            }
        });
    }
    
    // 发送验证码按钮
    if (elements.sendCaptchaBtn) {
        elements.sendCaptchaBtn.addEventListener('click', sendCaptcha);
    }
}

// ==================== 搜索功能 ====================

// 初始化搜索功能
function initSearch() {
    // 加载搜索历史
    loadSearchHistory();
    
    // 隐藏搜索结果容器
    if (elements.searchResultsContainer) {
        elements.searchResultsContainer.style.display = 'none';
    }
    
    // 显示初始状态
    if (elements.noResults) {
        showNoResults('输入关键词搜索音乐');
    }
    
    // 隐藏搜索类型按钮（只保留综合搜索）
    if (elements.typeButtons) {
        elements.typeButtons.forEach(btn => {
            btn.style.display = 'none';
        });
    }
}

// 处理搜索输入
function handleSearchInput() {
    const keyword = elements.searchInput.value.trim();
    
    // 显示/隐藏清除按钮
    if (elements.searchClear) {
        elements.searchClear.style.display = keyword.length > 0 ? 'block' : 'none';
    }
    
    // 防抖搜索建议
    clearTimeout(searchTimeout);
    if (keyword.length >= 2) {
        searchTimeout = setTimeout(() => {
            showSearchSuggestions(keyword);
        }, 300);
    }
}

// 显示搜索建议
function showSearchSuggestions(keyword) {
    // 这里可以添加搜索建议的实现
    console.log('搜索建议:', keyword);
}

// 清除搜索输入
function clearSearchInput() {
    if (elements.searchInput) {
        elements.searchInput.value = '';
    }
    if (elements.searchClear) {
        elements.searchClear.style.display = 'none';
    }
    if (elements.searchInput) {
        elements.searchInput.focus();
    }
    if (elements.noResults) {
        showNoResults('输入关键词搜索音乐');
    }
    if (elements.searchResultsContainer) {
        elements.searchResultsContainer.style.display = 'none';
    }
    if (elements.searchStats) {
        elements.searchStats.style.display = 'none';
    }
}

// 搜索音乐 - 主要搜索函数
async function searchMusic() {
    const keyword = elements.searchInput.value.trim();
    
    if (!keyword) {
        showNoResults('请输入搜索关键词');
        return;
    }
    
    // 添加到搜索历史
    addToSearchHistory(keyword);
    
    // 显示搜索结果容器
    if (elements.searchResultsContainer) {
        elements.searchResultsContainer.style.display = 'block';
    }
    
    // 更新标题
    if (elements.searchResultsTitle) {
        elements.searchResultsTitle.textContent = `搜索"${keyword}"`;
    }
    
    // 显示加载状态
    if (elements.searchResults) {
        showLoading(elements.searchResults);
    }
    
    try {
        // 构建搜索参数 - 固定搜索单曲
        const params = {
            keywords: encodeURIComponent(keyword),
            type: 1, // 固定为单曲搜索
            limit: searchLimit,
            offset: (currentPage - 1) * searchLimit
        };
        
        // 如果有排序方式，添加到参数
        if (elements.searchSort && elements.searchSort.value !== '0') {
            params.order = elements.searchSort.value;
        }
        
        // 如果有登录cookie，添加到参数
        if (isLoggedIn && userInfo) {
            params.cookie = userInfo.cookie;
        }
        
        // 构建查询字符串
        const queryString = new URLSearchParams(params).toString();
        
        // 调用搜索API
        const response = await fetch(`${API_BASE_URL}/cloudsearch?${queryString}`);
        
        if (!response.ok) {
            throw new Error(`搜索失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.code === 200) {
            // 更新搜索结果总数
            searchTotal = data.result.songCount || 0;
            
            // 显示搜索结果
            displaySearchResults(data.result, keyword);
            
            // 更新分页
            updatePagination();
            
            // 更新统计信息
            updateSearchStats(data);
        } else {
            throw new Error(data.message || '搜索失败');
        }
    } catch (error) {
        console.error('搜索错误:', error);
        if (elements.searchResults) {
            showNoResults('搜索失败，请重试');
        }
        if (elements.searchStats) {
            elements.searchStats.style.display = 'none';
        }
    }
}

// 显示搜索结果
function displaySearchResults(result, keywords) {
    const container = elements.searchResults;
    if (!container) return;
    
    container.innerHTML = '';
    
    // 只显示单曲结果
    currentPlaylist = result.songs || [];
    
    if (!currentPlaylist || currentPlaylist.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-music"></i>
                <p>未找到相关歌曲</p>
            </div>
        `;
        return;
    }
    
    // 隐藏搜索标签
    if (elements.searchTabs) {
        elements.searchTabs.innerHTML = '';
    }
    
    // 生成歌曲列表
    const html = generateSongList(currentPlaylist, keywords);
    container.innerHTML = html;
}

// 生成歌曲列表HTML
function generateSongList(songs, keywords) {
    if (!songs || songs.length === 0) {
        return `<div class="empty-state">
            <i class="fas fa-music"></i>
            <p>未找到相关歌曲</p>
        </div>`;
    }
    
    return songs.map((song, index) => {
        const artists = song.ar ? song.ar.map(artist => artist.name).join(', ') : '未知';
        const album = song.al ? song.al.name : '未知';
        const cover = song.al ? song.al.picUrl : DEFAULT_COVER;
        const duration = formatTime(song.dt / 1000);
        
        return `
            <div class="song-item" onclick="playSearchResult(${index})" data-id="${song.id}">
                <div class="song-cover">
                    <img src="${cover}" alt="${song.name}" loading="lazy">
                </div>
                <div class="song-info">
                    <div class="song-title">${highlightText(song.name, keywords)}</div>
                    <div class="song-artist">${artists} - ${album}</div>
                </div>
                <div class="song-duration">${duration}</div>
            </div>
        `;
    }).join('');
}

// 高亮搜索关键词
function highlightText(text, keyword) {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background-color: rgba(230, 0, 38, 0.3); padding: 0 2px; border-radius: 2px;">$1</mark>');
}

// 播放搜索结果
async function playSearchResult(index) {
    const song = currentPlaylist[index];
    
    if (!song || !song.id) {
        showNotification('无法播放此歌曲', 'error');
        return;
    }
    
    // 更新高亮
    document.querySelectorAll('#searchResults .song-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 更新当前播放列表索引
    currentIndex = index;
    
    // 播放歌曲
    playSong(song, index);
}

// 更新分页
function updatePagination() {
    if (!elements.searchPagination) return;
    
    const totalPages = Math.ceil(searchTotal / searchLimit);
    
    if (totalPages <= 1) {
        elements.searchPagination.innerHTML = '';
        return;
    }
    
    let html = '';
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    // 调整起始页
    if (endPage - startPage + 1 < maxPages && startPage > 1) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    // 上一页按钮
    if (currentPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>`;
    }
    
    // 页码按钮
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    // 下一页按钮
    if (currentPage < totalPages) {
        html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>`;
    }
    
    // 添加统计信息
    html += `<span style="color: var(--text-secondary); margin-left: 10px; font-size: 0.9rem;">
        共 ${searchTotal} 条结果，第 ${currentPage}/${totalPages} 页
    </span>`;
    
    elements.searchPagination.innerHTML = html;
}

// 切换到指定页面
function goToPage(page) {
    currentPage = page;
    searchMusic();
    // 滚动到搜索结果顶部
    if (elements.searchResultsContainer) {
        elements.searchResultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
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
    const searchInput = elements.searchInput;
    
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
        const response = await fetch(`${API_BASE_URL}/search/hot`);
        const data = await response.json();
        
        if (data.result?.hots) {
            const hotList = data.result.hots.slice(0, 10).map(hot => hot.first).join('\n');
            const keyword = prompt('热门搜索：\n\n' + hotList + '\n\n请输入要搜索的关键词：');
            
            if (keyword) {
                elements.searchInput.value = keyword;
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
    clearSearchInput();
    if (elements.searchResultsContainer) {
        elements.searchResultsContainer.style.display = 'none';
    }
}

// 更新搜索统计
function updateSearchStats(data) {
    if (!elements.searchStats || !elements.resultCount || !elements.resultType) return;
    
    let count = 0;
    if (data && data.result) {
        count = data.result.songCount || 0;
    }
    
    elements.resultCount.textContent = count;
    elements.resultType.textContent = '单曲';
    elements.searchStats.style.display = 'flex';
}

// ==================== 播放器核心功能 ====================

// 显示加载状态
function showLoading(container) {
    if (container) {
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
            </div>
        `;
    }
}

// 显示无结果状态
function showNoResults(message) {
    if (elements.noResults && elements.searchResults) {
        elements.noResults.innerHTML = `
            <i class="fas fa-search"></i>
            <p>${message}</p>
        `;
        elements.noResults.style.display = 'flex';
        elements.searchResults.appendChild(elements.noResults);
    }
}

// 播放歌曲
async function playSong(song, index) {
    if (!song) return;
    
    try {
        // 获取歌曲播放链接
        const response = await fetch(`${API_BASE_URL}/song/url?id=${song.id}`);
        const data = await response.json();
        
        if (!data.data || data.data.length === 0 || !data.data[0].url) {
            throw new Error('无法获取歌曲URL');
        }
        
        const songUrl = data.data[0].url;
        const quality = data.data[0].type || 'standard';
        
        // 停止当前播放
        audioPlayer.pause();
        
        // 设置新歌曲
        audioPlayer.src = songUrl;
        
        // 更新当前播放信息
        currentTrack = song;
        currentIndex = index;
        
        // 更新显示信息
        updatePlayerInfo(song, quality);
        
        // 播放
        await audioPlayer.play();
        isPlaying = true;
        updatePlayButton();
        
        // 高亮当前播放的歌曲
        highlightCurrentSong();
        
        // 添加到播放历史
        addToPlayHistory(song);
        
        console.log('正在播放:', song.name);
        showNotification(`正在播放: ${song.name}`);
        
    } catch (error) {
        console.error('播放失败:', error);
        showNotification('播放失败，请重试', 'error');
    }
}

// 更新播放器信息
function updatePlayerInfo(song, quality) {
    // 歌曲信息
    if (elements.trackTitle) {
        elements.trackTitle.textContent = song.name || '未知歌曲';
    }
    
    // 艺术家信息
    const artists = song.ar ? song.ar.map(artist => artist.name).join(' / ') : 
                  song.artists ? song.artists.map(artist => artist.name).join(' / ') : '未知歌手';
    if (elements.trackArtist) {
        elements.trackArtist.textContent = artists;
    }
    
    // 专辑信息
    const album = song.al ? song.al.name : 
                 song.album ? song.album.name : '未知专辑';
    if (elements.trackAlbum) {
        elements.trackAlbum.textContent = `专辑：${album}`;
    }
    
    // 时长
    const duration = song.dt ? song.dt / 1000 : 
                    song.duration ? song.duration / 1000 : 0;
    if (elements.trackDuration) {
        elements.trackDuration.textContent = `时长：${formatTime(duration)}`;
    }
    
    // 音质
    const qualityMap = {
        'standard': '标准音质',
        'higher': '较高音质',
        'exhigh': '极高音质',
        'lossless': '无损音质',
        'hires': 'Hi-Res'
    };
    if (elements.trackQuality) {
        elements.trackQuality.textContent = `音质：${qualityMap[quality] || '未知'}`;
    }
    
    // 专辑封面
    updateAlbumArt(song);
}

// 更新专辑封面
function updateAlbumArt(song) {
    if (!elements.albumArt) return;
    
    const albumArtElement = elements.albumArt;
    
    // 获取封面 URL
    const coverUrl = song.al ? song.al.picUrl : 
                    song.album ? song.album.picUrl : 
                    DEFAULT_COVER;
    
    // 创建图片元素
    const img = new Image();
    img.src = coverUrl;
    img.alt = song.name || '专辑封面';
    img.onload = () => {
        // 图片加载成功后替换内容
        albumArtElement.innerHTML = '';
        albumArtElement.appendChild(img);
        albumArtElement.classList.remove('default');
    };
    
    img.onerror = () => {
        // 图片加载失败，使用默认图标
        setDefaultAlbumArt();
    };
}

// 设置默认专辑封面
function setDefaultAlbumArt() {
    if (elements.albumArt) {
        elements.albumArt.innerHTML = '<i class="fas fa-music"></i>';
        elements.albumArt.classList.add('default');
    }
}

// 切换播放/暂停
function togglePlay() {
    if (!currentTrack) {
        // 如果没有当前曲目，尝试播放第一首推荐歌曲
        const firstSong = document.querySelector('.song-item');
        if (firstSong) {
            const index = parseInt(firstSong.dataset.index || 0);
            const songId = firstSong.dataset.id;
            // 这里需要从数据中获取歌曲对象
            // 暂时播放第一首
            const playButtons = document.querySelectorAll('.song-item');
            if (playButtons.length > 0) {
                playButtons[0].click();
            }
        }
        return;
    }
    
    if (audioPlayer.paused) {
        audioPlayer.play().then(() => {
            isPlaying = true;
            updatePlayButton();
        }).catch(error => {
            console.error('播放失败:', error);
            showNotification('播放失败', 'error');
        });
    } else {
        audioPlayer.pause();
        isPlaying = false;
        updatePlayButton();
    }
}

// 更新播放按钮
function updatePlayButton() {
    if (!elements.playIcon) return;
    
    const icon = elements.playIcon;
    if (isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        if (elements.playBtn) {
            elements.playBtn.title = '暂停';
        }
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        if (elements.playBtn) {
            elements.playBtn.title = '播放';
        }
    }
}

// 播放上一首
function playPrevious() {
    if (!currentPlaylist.length) return;
    
    let newIndex;
    switch (playMode) {
        case 'sequential':
        case 'repeat-one':
            newIndex = currentIndex - 1;
            if (newIndex < 0) newIndex = currentPlaylist.length - 1;
            break;
        case 'shuffle':
            newIndex = Math.floor(Math.random() * currentPlaylist.length);
            break;
    }
    
    if (currentPlaylist[newIndex]) {
        playSong(currentPlaylist[newIndex], newIndex);
    }
}

// 播放下一首
function playNext() {
    if (!currentPlaylist.length) return;
    
    let newIndex;
    switch (playMode) {
        case 'sequential':
        case 'repeat-one':
            newIndex = currentIndex + 1;
            if (newIndex >= currentPlaylist.length) newIndex = 0;
            break;
        case 'shuffle':
            newIndex = Math.floor(Math.random() * currentPlaylist.length);
            break;
    }
    
    if (currentPlaylist[newIndex]) {
        playSong(currentPlaylist[newIndex], newIndex);
    }
}

// 切换随机播放
function toggleShuffle() {
    const shuffleBtn = elements.shuffleBtn;
    if (!shuffleBtn) return;
    
    // 切换随机播放模式
    if (playMode === 'shuffle') {
        playMode = 'sequential';
        shuffleBtn.style.color = '';
        shuffleBtn.title = '随机播放';
    } else {
        playMode = 'shuffle';
        shuffleBtn.style.color = 'var(--primary-color)';
        shuffleBtn.title = '顺序播放';
    }
    showNotification(playMode === 'shuffle' ? '随机播放已开启' : '顺序播放已开启');
}

// 切换循环模式
function toggleRepeat() {
    const repeatBtn = elements.repeatBtn;
    if (!repeatBtn) return;
    
    // 切换循环模式
    if (playMode === 'repeat-one') {
        playMode = 'sequential';
        repeatBtn.style.color = '';
        repeatBtn.title = '单曲循环';
    } else {
        playMode = 'repeat-one';
        repeatBtn.style.color = 'var(--primary-color)';
        repeatBtn.title = '顺序播放';
    }
    showNotification(playMode === 'repeat-one' ? '单曲循环已开启' : '顺序播放已开启');
}

// 切换播放模式
function togglePlayMode() {
    // 循环切换播放模式
    if (playMode === 'sequential') {
        playMode = 'repeat-one';
        if (elements.playMode) {
            elements.playMode.textContent = '单曲循环';
        }
        showNotification('单曲循环模式');
    } else if (playMode === 'repeat-one') {
        playMode = 'shuffle';
        if (elements.playMode) {
            elements.playMode.textContent = '随机播放';
        }
        showNotification('随机播放模式');
    } else {
        playMode = 'sequential';
        if (elements.playMode) {
            elements.playMode.textContent = '顺序播放';
        }
        showNotification('顺序播放模式');
    }
    
    // 更新按钮样式
    updatePlayModeButtons();
}

// 更新播放模式按钮
function updatePlayModeButtons() {
    if (elements.shuffleBtn) {
        elements.shuffleBtn.style.color = playMode === 'shuffle' ? 'var(--primary-color)' : '';
    }
    if (elements.repeatBtn) {
        elements.repeatBtn.style.color = playMode === 'repeat-one' ? 'var(--primary-color)' : '';
    }
}

// 更新进度条
function updateProgress() {
    if (!elements.progress || !elements.currentTime) return;
    
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 1;
    
    // 更新进度条宽度
    const progressPercent = (currentTime / duration) * 100;
    elements.progress.style.width = `${progressPercent}%`;
    
    // 更新当前时间显示
    elements.currentTime.textContent = formatTime(currentTime);
}

// 更新总时长
function updateDuration() {
    if (!elements.totalTime || !elements.progressBar) return;
    
    const duration = audioPlayer.duration;
    if (duration && !isNaN(duration)) {
        elements.totalTime.textContent = formatTime(duration);
    }
}

// 格式化时间
function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 跳转到指定位置
function seekToPosition(e) {
    if (!elements.progressBar || !audioPlayer.duration) return;
    
    const progressBarRect = elements.progressBar.getBoundingClientRect();
    const clickPosition = e.clientX - progressBarRect.left;
    const progressBarWidth = progressBarRect.width;
    const percentage = clickPosition / progressBarWidth;
    
    const newTime = percentage * audioPlayer.duration;
    audioPlayer.currentTime = newTime;
    
    // 更新进度条
    updateProgress();
}

// 处理曲目结束
function handleTrackEnd() {
    if (playMode === 'repeat-one') {
        // 单曲循环，重新播放当前曲目
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    } else {
        // 播放下一首
        playNext();
    }
}

// 处理音频错误
function handleAudioError(e) {
    console.error('音频播放错误:', e);
    showNotification('播放错误，请尝试播放其他歌曲', 'error');
    
    // 尝试播放下一首
    setTimeout(() => {
        playNext();
    }, 1000);
}

// 更新音量
function updateVolume() {
    if (!elements.volumeSlider || !elements.volumePercent) return;
    
    const newVolume = elements.volumeSlider.value / 100;
    audioPlayer.volume = newVolume;
    
    // 更新音量百分比显示
    elements.volumePercent.textContent = `${elements.volumeSlider.value}%`;
    
    // 更新音量图标
    updateVolumeIcon(newVolume);
    
    // 保存音量设置
    currentVolume = elements.volumeSlider.value;
    localStorage.setItem('netease_volume', currentVolume);
}

// 切换静音
function toggleMute() {
    if (!elements.volumeIcon || !elements.volumeSlider) return;
    
    isMuted = !isMuted;
    
    if (isMuted) {
        // 静音
        previousVolume = audioPlayer.volume * 100;
        audioPlayer.volume = 0;
        elements.volumeSlider.value = 0;
        elements.volumePercent.textContent = '0%';
        elements.volumeIcon.className = 'fas fa-volume-mute';
    } else {
        // 取消静音
        audioPlayer.volume = previousVolume / 100;
        elements.volumeSlider.value = previousVolume;
        elements.volumePercent.textContent = `${previousVolume}%`;
        updateVolumeIcon(previousVolume / 100);
    }
}

// 更新音量图标
function updateVolumeIcon(volume) {
    if (!elements.volumeIcon) return;
    
    if (volume === 0) {
        elements.volumeIcon.className = 'fas fa-volume-mute';
    } else if (volume < 0.5) {
        elements.volumeIcon.className = 'fas fa-volume-down';
    } else {
        elements.volumeIcon.className = 'fas fa-volume-up';
    }
}

// ==================== 辅助功能 ====================

// 切换喜欢
function toggleLike() {
    if (!currentTrack) return;
    
    const likeBtn = elements.likeBtn;
    const isLiked = likeBtn.classList.contains('liked');
    
    if (isLiked) {
        likeBtn.classList.remove('liked');
        likeBtn.style.color = '';
        showNotification(`取消喜欢: ${currentTrack.name}`);
    } else {
        likeBtn.classList.add('liked');
        likeBtn.style.color = 'var(--primary-color)';
        showNotification(`已喜欢: ${currentTrack.name}`);
    }
}

// 高亮当前播放的歌曲
function highlightCurrentSong() {
    // 移除所有高亮
    document.querySelectorAll('.song-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 为当前播放的歌曲添加高亮
    const currentSongItem = document.querySelector(`.song-item[data-id="${currentTrack?.id}"]`);
    if (currentSongItem) {
        currentSongItem.classList.add('active');
    }
}

// 添加到播放历史
function addToPlayHistory(song) {
    // 获取现有播放历史
    let playHistory = JSON.parse(localStorage.getItem('netease_play_history') || '[]');
    
    // 移除重复项
    playHistory = playHistory.filter(item => item.id !== song.id);
    
    // 添加到开头
    playHistory.unshift({
        id: song.id,
        name: song.name,
        artists: song.ar ? song.ar.map(a => a.name).join(', ') : '',
        album: song.al ? song.al.name : '',
        timestamp: Date.now()
    });
    
    // 保持最多100条记录
    if (playHistory.length > 100) {
        playHistory = playHistory.slice(0, 100);
    }
    
    localStorage.setItem('netease_play_history', JSON.stringify(playHistory));
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 自动隐藏
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 获取推荐音乐
async function getRecommendations() {
    if (!elements.recommendations) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/personalized?limit=10`);
        const data = await response.json();
        
        if (data.code === 200 && data.result) {
            let html = '';
            data.result.forEach((playlist, index) => {
                html += `
                    <div class="recommendation-item" onclick="getPlaylistSongs(${playlist.id})">
                        <div class="recommendation-cover">
                       
