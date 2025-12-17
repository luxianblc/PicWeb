// 网易云音乐播放器 - 主要功能实现（包含搜索功能）

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
let currentSearchType = 1; // 搜索类型：1-单曲，10-专辑，100-歌手，1000-歌单
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
    
    // 搜索类型按钮
    if (elements.typeButtons) {
        elements.typeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                elements.typeButtons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                currentSearchType = parseInt(this.dataset.type);
                // 如果已有搜索关键词，立即搜索
                if (elements.searchInput.value.trim()) {
                    currentPage = 1;
                    searchMusic();
                }
            });
        });
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
        // 构建搜索参数
        const params = {
            keywords: encodeURIComponent(keyword),
            type: currentSearchType,
            limit: searchLimit,
            offset: (currentPage - 1) * searchLimit
        };
        
        // 如果有排序方式，添加到参数
        if (elements.searchSort && elements.searchSort.value !== '0') {
            params.order = elements.searchSort.value; // 1: 热度排序，2: 时间排序
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
            searchTotal = data.result.songCount || data.result.playlistCount || data.result.albumCount || 0;
            
            // 显示搜索结果
            displaySearchResults(data.result, keyword);
            
            // 更新分页
            updatePagination();
            
            // 更新统计信息
            updateSearchStats(data, currentSearchType);
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
    
    // 根据搜索类型显示不同结果
    let html = '';
    
    switch(currentSearchType) {
        case 1: // 单曲
            currentPlaylist = result.songs || [];
            html = generateSongList(currentPlaylist, keywords);
            // 更新标签页
            if (elements.searchTabs) {
                elements.searchTabs.innerHTML = `
                    <button class="search-tab active" onclick="switchSearchTab('songs')">单曲(${result.songCount || 0})</button>
                    <button class="search-tab" onclick="switchSearchTab('artists')">歌手(${result.artistCount || 0})</button>
                    <button class="search-tab" onclick="switchSearchTab('albums')">专辑(${result.albumCount || 0})</button>
                    <button class="search-tab" onclick="switchSearchTab('playlists')">歌单(${result.playlistCount || 0})</button>
                `;
            }
            break;
            
        case 100: // 歌手
            html = generateArtistList(result.artists || []);
            if (elements.searchTabs) {
                elements.searchTabs.innerHTML = `<div class="search-tab active">歌手(${result.artistCount || 0})</div>`;
            }
            break;
            
        case 10: // 专辑
            html = generateAlbumList(result.albums || []);
            if (elements.searchTabs) {
                elements.searchTabs.innerHTML = `<div class="search-tab active">专辑(${result.albumCount || 0})</div>`;
            }
            break;
            
        case 1000: // 歌单
            html = generatePlaylistList(result.playlists || []);
            if (elements.searchTabs) {
                elements.searchTabs.innerHTML = `<div class="search-tab active">歌单(${result.playlistCount || 0})</div>`;
            }
            break;
            
        default:
            html = generateMixedResults(result, keywords);
    }
    
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

// 生成歌手列表
function generateArtistList(artists) {
    if (!artists || artists.length === 0) return '<div class="empty-state">未找到相关歌手</div>';
    
    return artists.map(artist => {
        const cover = artist.img1v1Url || artist.picUrl || DEFAULT_COVER;
        return `
            <div class="song-item" onclick="searchArtistSongs(${artist.id})">
                <div class="song-cover">
                    <img src="${cover}" alt="${artist.name}" loading="lazy">
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
                    <img src="${album.picUrl}" alt="${album.name}" loading="lazy">
                </div>
                <div class="song-info">
                    <div class="song-title">${album.name}</div>
                    <div class="song-artist">${artists} • ${album.size || 0}首</div>
                </div>
            </div>
        `;
    }).join('');
}

// 生成歌单列表
function generatePlaylistList(playlists) {
    if (!playlists || playlists.length === 0) return '<div class="empty-state">未找到相关歌单</div>';
    
    return playlists.map(playlist => {
        return `
            <div class="song-item" onclick="getPlaylistSongs(${playlist.id})">
                <div class="song-cover">
                    <img src="${playlist.coverImgUrl}" alt="${playlist.name}" loading="lazy">
                </div>
                <div class="song-info">
                    <div class="song-title">${playlist.name}</div>
                    <div class="song-artist">${playlist.creator.nickname} • ${playlist.trackCount || 0}首</div>
                </div>
            </div>
        `;
    }).join('');
}

// 生成混合结果
function generateMixedResults(result, keywords) {
    let html = '';
    
    if (result.songs && result.songs.length > 0) {
        html += `<h4 style="margin: 1rem 0; color: var(--primary-color);">单曲</h4>`;
        html += generateSongList(result.songs.slice(0, 5), keywords);
    }
    
    if (result.artists && result.artists.length > 0) {
        html += `<h4 style="margin: 1rem 0; color: var(--primary-color);">歌手</h4>`;
        html += generateArtistList(result.artists.slice(0, 5));
    }
    
    if (result.albums && result.albums.length > 0) {
        html += `<h4 style="margin: 1rem 0; color: var(--primary-color);">专辑</h4>`;
        html += generateAlbumList(result.albums.slice(0, 5));
    }
    
    if (result.playlists && result.playlists.length > 0) {
        html += `<h4 style="margin: 1rem 0; color: var(--primary-color);">歌单</h4>`;
        html += generatePlaylistList(result.playlists.slice(0, 5));
    }
    
    if (!html) html = '<div class="empty-state">未找到相关内容</div>';
    
    return html;
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

// 搜索艺术家的歌曲
async function searchArtistSongs(artistId) {
    // 切换到单曲搜索
    currentSearchType = 1;
    // 更新类型按钮状态
    elements.typeButtons.forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.type) === currentSearchType);
    });
    
    try {
        // 获取歌手详情
        const response = await fetch(`${API_BASE_URL}/artists?id=${artistId}`);
        const data = await response.json();
        
        if (data.hotSongs) {
            currentPlaylist = data.hotSongs;
            const resultsDiv = elements.searchResults;
            resultsDiv.innerHTML = generateSongList(currentPlaylist, '');
        }
    } catch (error) {
        console.error('获取歌手歌曲失败:', error);
        showNotification('获取歌手歌曲失败', 'error');
    }
}

// 获取专辑歌曲
async function getAlbumSongs(albumId) {
    try {
        const response = await fetch(`${API_BASE_URL}/album?id=${albumId}`);
        const data = await response.json();
        
        if (data.songs) {
            currentPlaylist = data.songs;
            const resultsDiv = elements.searchResults;
            resultsDiv.innerHTML = generateSongList(currentPlaylist, '');
        }
    } catch (error) {
        console.error('获取专辑歌曲失败:', error);
        showNotification('获取专辑歌曲失败', 'error');
    }
}

// 获取歌单歌曲
async function getPlaylistSongs(playlistId) {
    try {
        const response = await fetch(`${API_BASE_URL}/playlist/detail?id=${playlistId}`);
        const data = await response.json();
        
        if (data.playlist?.tracks) {
            currentPlaylist = data.playlist.tracks;
            const resultsDiv = elements.searchResults;
            resultsDiv.innerHTML = generateSongList(currentPlaylist.slice(0, 50), '');
        }
    } catch (error) {
        console.error('获取歌单歌曲失败:', error);
        showNotification('获取歌单歌曲失败', 'error');
    }
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

// 切换搜索标签
function switchSearchTab(tab) {
    // 更新标签按钮状态
    const tabs = elements.searchTabs.querySelectorAll('.search-tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    // 找到对应的标签并激活
    const activeTab = Array.from(tabs).find(t => t.textContent.includes(tab));
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // 这里可以根据tab显示不同的内容
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
function updateSearchStats(data, type) {
    if (!elements.searchStats || !elements.resultCount || !elements.resultType) return;
    
    const typeMap = {
        '1': '单曲',
        '100': '歌手',
        '10': '专辑',
        '1000': '歌单',
        '1004': 'MV'
    };
    
    let count = 0;
    if (data) {
        switch (type) {
            case '1': count = data.songCount || 0; break;
            case '100': count = data.artistCount || 0; break;
            case '10': count = data.albumCount || 0; break;
            case '1000': count = data.playlistCount || 0; break;
            case '1004': count = data.mvCount || 0; break;
        }
    }
    
    elements.resultCount.textContent = count;
    elements.resultType.textContent = typeMap[type] || '未知';
    elements.searchStats.style.display = 'flex';
}

// ==================== 以下保留原来的播放器功能 ====================

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
    
    const modes = ['none', 'one', 'all'];
    const currentIndex = modes.indexOf(playMode);
    playMode = modes[(currentIndex + 1) % modes.length];
    
    switch(playMode) {
        case 'none':
            repeatBtn.style.color = '';
            repeatBtn.title = '循环播放';
            repeatBtn.innerHTML = '<i class="fas fa-redo"></i>';
            showNotification('循环播放已关闭');
            break;
        case 'one':
            repeatBtn.style.color = 'var(--primary-color)';
            repeatBtn.innerHTML = '<i class="fas fa-redo-alt"></i>';
            repeatBtn.title = '单曲循环';
            showNotification('单曲循环已开启');
            break;
        case 'all':
            repeatBtn.style.color = 'var(--primary-color)';
            repeatBtn.innerHTML = '<i class="fas fa-infinity"></i>';
            repeatBtn.title = '列表循环';
            showNotification('列表循环已开启');
            break;
    }
}

// 切换播放模式
function togglePlayMode() {
    const modes = ['sequential', 'repeat-one', 'shuffle'];
    const modeNames = ['顺序播放', '单曲循环', '随机播放'];
    const modeIcons = ['fa-retweet', 'fa-redo', 'fa-random'];
    
    const currentModeIndex = modes.indexOf(playMode);
    const nextModeIndex = (currentModeIndex + 1) % modes.length;
    
    playMode = modes[nextModeIndex];
    
    // 更新按钮图标和文字
    const modeIcon = modeIcons[nextModeIndex];
    if (elements.modeBtn) {
        elements.modeBtn.innerHTML = `<i class="fas ${modeIcon}"></i>`;
        elements.modeBtn.title = modeNames[nextModeIndex];
    }
    
    // 更新状态显示
    if (elements.playMode) {
        elements.playMode.textContent = modeNames[nextModeIndex];
        elements.playMode.className = 'status-value info';
    }
    
    showNotification(`播放模式：${modeNames[nextModeIndex]}`);
}

// 更新音量
function updateVolume() {
    if (!elements.volumeSlider || !elements.volumePercent || !elements.volumeIcon) return;
    
    currentVolume = elements.volumeSlider.value;
    volume = currentVolume / 100;
    audioPlayer.volume = volume;
    elements.volumePercent.textContent = `${currentVolume}%`;
    
    // 更新音量图标
    updateVolumeIcon();
    saveVolume();
}

// 更新音量图标
function updateVolumeIcon() {
    if (!elements.volumeIcon) return;
    
    if (currentVolume === 0) {
        elements.volumeIcon.className = 'fas fa-volume-mute';
    } else if (currentVolume < 50) {
        elements.volumeIcon.className = 'fas fa-volume-down';
    } else {
        elements.volumeIcon.className = 'fas fa-volume-up';
    }
}

// 切换静音
function toggleMute() {
    if (!elements.volumeSlider || !elements.volumeIcon) return;
    
    if (isMuted) {
        // 取消静音
        audioPlayer.volume = previousVolume / 100;
        elements.volumeSlider.value = previousVolume;
        elements.volumePercent.textContent = previousVolume + '%';
        updateVolumeIcon();
        isMuted = false;
    } else {
        // 静音
        previousVolume = currentVolume;
        audioPlayer.volume = 0;
        elements.volumeSlider.value = 0;
        elements.volumePercent.textContent = '0%';
        elements.volumeIcon.className = 'fas fa-volume-mute';
        isMuted = true;
    }
    saveVolume();
}

// 跳转到指定位置
function seekToPosition(e) {
    if (!elements.progressBar) return;
    
    const rect = elements.progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const duration = audioPlayer.duration;
    
    if (duration) {
        audioPlayer.currentTime = pos * duration;
    }
}

// 处理歌曲结束
function handleTrackEnd() {
    if (playMode === 'repeat-one') {
        // 单曲循环
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    } else {
        // 播放下一首
        playNext();
    }
}

// 处理音频错误
function handleAudioError() {
    console.error('音频播放错误');
    showNotification('播放失败，请重试', 'error');
    
    // 尝试播放下一首
    if (currentPlaylist.length > 1) {
        setTimeout(playNext, 1000);
    }
}

// 切换喜欢状态
function toggleLike() {
    if (!elements.likeBtn) return;
    
    const icon = elements.likeBtn.querySelector('i');
    if (!icon) return;
    
    if (icon.classList.contains('far')) {
        // 未喜欢 -> 喜欢
        icon.classList.remove('far');
        icon.classList.add('fas');
        elements.likeBtn.title = '取消喜欢';
        
        if (currentTrack) {
            addToFavorites(currentTrack);
            showNotification('已添加到喜欢列表');
        }
    } else {
        // 喜欢 -> 未喜欢
        icon.classList.remove('fas');
        icon.classList.add('far');
        elements.likeBtn.title = '喜欢';
        
        if (currentTrack) {
            removeFromFavorites(currentTrack.id);
            showNotification('已从喜欢列表移除');
        }
    }
}

// 添加到喜欢列表
function addToFavorites(song) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const exists = favorites.some(fav => fav.id === song.id);
    
    if (!exists) {
        favorites.push({
            id: song.id,
            name: song.name,
            artists: song.ar ? song.ar.map(artist => artist.name) : [],
            album: song.al ? song.al.name : '',
            duration: song.dt,
            cover: song.al ? song.al.picUrl : DEFAULT_COVER,
            addedAt: new Date().toISOString()
        });
        
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
}

// 从喜欢列表移除
function removeFromFavorites(songId) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    favorites = favorites.filter(fav => fav.id !== songId);
    localStorage.setItem('favorites', JSON.stringify(favorites));
}

// 添加到播放历史
function addToPlayHistory(song) {
    let history = JSON.parse(localStorage.getItem('playHistory') || '[]');
    
    // 移除重复项
    history = history.filter(item => item.id !== song.id);
    
    // 添加到开头
    history.unshift({
        id: song.id,
        name: song.name,
        artists: song.ar ? song.ar.map(artist => artist.name) : [],
        album: song.al ? song.al.name : '',
        cover: song.al ? song.al.picUrl : DEFAULT_COVER,
        playedAt: new Date().toISOString()
    });
    
    // 限制历史记录数量
    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    
    localStorage.setItem('playHistory', JSON.stringify(history));
}

// 高亮当前播放的歌曲
function highlightCurrentSong() {
    // 移除所有 active 类
    document.querySelectorAll('.song-item.active').forEach(item => {
        item.classList.remove('active');
    });
    
    // 为当前播放的歌曲添加 active 类
    const currentSongElement = document.querySelector(`.song-item[data-id="${currentTrack?.id}"]`);
    if (currentSongElement) {
        currentSongElement.classList.add('active');
        currentSongElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// 高亮活跃歌曲
function highlightActiveSong(element) {
    document.querySelectorAll('.song-item.active').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
}

// 获取推荐音乐
async function getRecommendations() {
    if (!elements.recommendations) return;
    
    showLoading(elements.recommendations);
    
    try {
        const response = await fetch(`${API_BASE_URL}/personalized/newsong`);
        const data = await response.json();
        
        if (data.result) {
            displayRecommendations(data.result);
            // 设置为当前播放列表
            currentPlaylist = data.result.map(item => item.song);
        } else {
            showNoRecommendations();
        }
    } catch (error) {
        console.error('获取推荐失败:', error);
        showNoRecommendations();
    }
}

// 显示推荐音乐
function displayRecommendations(songs) {
    if (!elements.recommendations) return;
    
    const container = elements.recommendations;
    container.innerHTML = '';
    
    songs.slice(0, 10).forEach((item, index) => {
        const song = item.song;
        const songElement = createSongElement(song, index);
        container.appendChild(songElement);
    });
}

// 显示无推荐状态
function showNoRecommendations() {
    if (!elements.recommendations) return;
    
    elements.recommendations.innerHTML = `
        <div class="no-results">
            <i class="fas fa-star"></i>
            <p>暂无推荐，请稍后重试</p>
        </div>
    `;
}

// 获取热门歌单
async function getHotPlaylists() {
    try {
        const response = await fetch(`${API_BASE_URL}/top/playlist?limit=6`);
        const data = await response.json();
        
        if (data.playlists) {
            displayHotPlaylists(data.playlists);
        }
    } catch (error) {
        console.error('获取热门歌单失败:', error);
    }
}

// 显示热门歌单
function displayHotPlaylists(playlists) {
    if (!elements.playlistList) return;
    
    const listDiv = elements.playlistList;
    
    let html = playlists.map(playlist => `
        <div class="playlist-item" onclick="getPlaylistSongs(${playlist.id})">
            <div class="playlist-cover">
                <img src="${playlist.coverImgUrl}" alt="${playlist.name}" loading="lazy">
            </div>
            <div class="playlist-info">
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-creator">${playlist.creator.nickname}</div>
            </div>
        </div>
    `).join('');
    
    listDiv.innerHTML = html;
}

// 获取精品歌单
async function getHighQualityPlaylists() {
    try {
        const response = await fetch(`${API_BASE_URL}/top/playlist/highquality?limit=6`);
        const data = await response.json();
        
        if (data.playlists) {
            displayHotPlaylists(data.playlists);
        }
    } catch (error) {
        console.error('获取精品歌单失败:', error);
    }
}

// 获取个性化推荐
async function getPersonalized() {
    if (!isLoggedIn) {
        alert('个性化推荐需要登录后使用');
        showLoginModal();
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/personalized?limit=20`);
        const data = await response.json();
        
        if (data.result) {
            showNotification('已获取个性化推荐');
            // 这里可以显示个性化推荐
            console.log('个性化推荐:', data.result);
        }
    } catch (error) {
        console.error('获取个性化推荐失败:', error);
        showNotification('获取推荐失败', 'error');
    }
}

// 获取排行榜
async function getTopList() {
    try {
        const response = await fetch(`${API_BASE_URL}/top/list?idx=0`);
        const data = await response.json();
        
        if (data.playlist?.tracks) {
            currentPlaylist = data.playlist.tracks;
            currentIndex = 0;
            playSong(currentPlaylist[0], 0);
            showNotification('已加载排行榜歌曲');
        }
    } catch (error) {
        console.error('获取排行榜失败:', error);
        showNotification('获取排行榜失败', 'error');
    }
}

// 刷新推荐
function refreshRecommendations() {
    getRecommendations();
    showNotification('推荐已刷新');
}

// ==================== 主题和设置 ====================

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('netease_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        if (elements.themeIcon) {
            elements.themeIcon.className = 'fas fa-sun';
        }
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        if (elements.themeIcon) {
            elements.themeIcon.className = 'fas fa-moon';
        }
    }
}

// 切换主题
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    
    if (isDark) {
        // 切换到浅色主题
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        if (elements.themeIcon) {
            elements.themeIcon.className = 'fas fa-sun';
        }
        localStorage.setItem('theme', 'light');
    } else {
        // 切换到深色主题
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        if (elements.themeIcon) {
            elements.themeIcon.className = 'fas fa-moon';
        }
        localStorage.setItem('theme', 'dark');
    }
}

// 加载设置
function loadSettings() {
    const savedVolume = localStorage.getItem('netease_volume');
    if (savedVolume) {
        currentVolume = parseInt(savedVolume);
        if (elements.volumeSlider) {
            elements.volumeSlider.value = currentVolume;
            elements.volumePercent.textContent = currentVolume + '%';
            updateVolumeIcon();
        }
        audioPlayer.volume = currentVolume / 100;
    }
    
    const savedCookie = localStorage.getItem('netease_cookie');
    if (savedCookie) {
        // 如果有保存的cookie，可以在这里使用
        // userCookie = savedCookie;
    }
}

// 保存音量设置
function saveVolume() {
    localStorage.setItem('netease_volume', currentVolume.toString());
}

// ==================== 登录相关 ====================

// 检查登录状态
async function checkLoginStatus() {
    // 从本地存储检查登录状态
    const savedLogin = localStorage.getItem('netease_login');
    
    if (savedLogin) {
        try {
            const loginData = JSON.parse(savedLogin);
            const response = await fetch(`${API_BASE_URL}/login/status`);
            const data = await response.json();
            
            if (data.data?.profile) {
                isLoggedIn = true;
                userInfo = data.data.profile;
                updateLoginStatus(true, userInfo);
            } else {
                updateLoginStatus(false);
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
            updateLoginStatus(false);
        }
    } else {
        updateLoginStatus(false);
    }
}

// 更新登录状态显示
function updateLoginStatus(loggedIn, user = null) {
    if (elements.loginStatus) {
        if (loggedIn && user) {
            elements.loginStatus.textContent = `已登录: ${user.nickname}`;
            elements.loginStatus.className = 'status-value success';
            
            // 更新音质权限
            const level = user.vipType === 0 ? 'standard' : 'premium';
            updateQualityStatus(level);
        } else {
            elements.loginStatus.textContent = '未登录';
            elements.loginStatus.className = 'status-value error';
            updateQualityStatus('standard');
        }
    }
}

// 更新音质状态
function updateQualityStatus(level) {
    if (!elements.qualityStatus) return;
    
    const statusMap = {
        'standard': { text: '标准音质', class: 'warning' },
        'premium': { text: 'VIP 高音质', class: 'success' }
    };
    
    const status = statusMap[level] || statusMap.standard;
    elements.qualityStatus.textContent = status.text;
    elements.qualityStatus.className = `status-value ${status.class}`;
}

// 显示登录模态框
function showLoginModal() {
    if (elements.loginModal) {
        elements.loginModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// 隐藏登录模态框
function hideLoginModal() {
    if (elements.loginModal) {
        elements.loginModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    // 清除二维码检查间隔
    if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
        qrCheckInterval = null;
    }
}

// 处理登录
async function handleLogin() {
    const account = elements.loginAccount?.value.trim();
    const password = elements.loginPassword?.value;
    
    if (!account || !password) {
        showNotification('请输入账号和密码', 'error');
        return;
    }
    
    // 显示登录中状态
    const loginBtn = document.querySelector('.btn-primary[onclick="handleLogin()"]');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';
    loginBtn.disabled = true;
    
    try {
        // 这里使用模拟登录，实际应该调用网易云音乐API
        // 注意：出于安全考虑，不建议在前端直接处理登录
        
        // 模拟登录成功
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 保存登录状态
        const mockUser = {
            nickname: '网易云用户',
            vipType: 1,
            avatarUrl: DEFAULT_COVER
        };
        
        localStorage.setItem('netease_login', JSON.stringify({
            account,
            timestamp: Date.now(),
            user: mockUser
        }));
        
        isLoggedIn = true;
        userInfo = mockUser;
        updateLoginStatus(true, mockUser);
        
        showNotification('登录成功！');
        hideLoginModal();
        
    } catch (error) {
        console.error('登录失败:', error);
        showNotification('登录失败，请检查账号密码', 'error');
    } finally {
        // 恢复按钮状态
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// 开始二维码登录
function startQRLogin() {
    showNotification('二维码登录功能开发中');
    // 这里可以添加二维码登录的实现
}

// 退出登录
function logout() {
    localStorage.removeItem('netease_login');
    isLoggedIn = false;
    userInfo = null;
    updateLoginStatus(false);
    showNotification('已退出登录');
}

// 发送验证码
async function sendCaptcha() {
    const phone = elements.loginPhone?.value;
    
    if (!phone) {
        alert('请输入手机号码');
        return;
    }
    
    const btn = elements.sendCaptchaBtn;
    btn.disabled = true;
    btn.textContent = '60秒后重试';
    
    let countdown = 60;
    const timer = setInterval(() => {
        countdown--;
        btn.textContent = `${countdown}秒后重试`;
        
        if (countdown <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = '发送验证码';
        }
    }, 1000);
    
    alert('验证码已发送到您的手机');
}

// ==================== 其他功能 ====================

// 检查 API 状态
async function checkApiStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/`);
        if (response.ok) {
            updateApiStatus('success', 'API 正常');
        } else {
            updateApiStatus('error', 'API 异常');
        }
    } catch (error) {
        console.error('API 状态检查失败:', error);
        updateApiStatus('error', 'API 连接失败');
    }
}

// 更新 API 状态显示
function updateApiStatus(status, message) {
    const statusElement = document.querySelector('#apiStatus');
    if (statusElement) {
        statusElement.textContent = message;
    }
    
    if (elements.apiStatusCard) {
        elements.apiStatusCard.textContent = message;
        elements.apiStatusCard.className = 'status-value ' + status;
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 移除现有通知
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-left: 4px solid var(--primary-color);
            border-radius: 10px;
            padding: 1rem 1.5rem;
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            max-width: 400px;
        }
        
        .notification.error {
            border-left-color: var(--danger-color);
        }
        
        .notification.success {
            border-left-color: var(--success-color);
        }
        
        .notification.warning {
            border-left-color: var(--warning-color);
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .notification-close {
            background: none;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            padding: 5px;
            border-radius: 5px;
            transition: all 0.3s;
        }
        
        .notification-close:hover {
            background: rgba(255, 255, 255, 0.05);
            color: var(--text-primary);
        }
        
        .light-theme .notification-close:hover {
            background: rgba(0, 0, 0, 0.05);
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 绑定关闭按钮事件
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
        style.remove();
    });
    
    // 自动消失
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            
            // 添加消失动画
            const disappearStyle = document.createElement('style');
            disappearStyle.textContent = `
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(disappearStyle);
            
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    notification.remove();
                }
                style.remove();
                disappearStyle.remove();
            }, 300);
        }
    }, 3000);
}

// 清空缓存
function clearCache() {
    if (confirm('确定要清空所有缓存吗？')) {
        localStorage.removeItem('netease_login');
        localStorage.removeItem('netease_search_history');
        localStorage.removeItem('netease_volume');
        localStorage.removeItem('favorites');
        localStorage.removeItem('playHistory');
        isLoggedIn = false;
        userInfo = null;
        searchHistory = [];
        updateLoginStatus(false);
        showNotification('缓存已清空');
    }
}

// ==================== 工具函数 ====================

// 工具函数：格式化时间
function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// 工具函数：格式化数字
function formatCount(count) {
    if (count >= 100000000) {
        return (count / 100000000).toFixed(1) + '亿';
    } else if (count >= 10000) {
        return (count / 10000).toFixed(1) + '万';
    }
    return count.toString();
}

// 创建歌曲元素
function createSongElement(song, index) {
    const div = document.createElement('div');
    div.className = 'song-item';
    div.dataset.id = song.id;
    div.dataset.index = index;
    
    const coverUrl = song.al?.picUrl || DEFAULT_COVER;
    const artists = song.ar?.map(artist => artist.name).join(' / ') || '未知歌手';
    const album = song.al?.name || '未知专辑';
    const duration = formatTime(song.dt / 1000);
    
    div.innerHTML = `
        <div class="song-cover">
            <img src="${coverUrl}" alt="${song.name}" loading="lazy">
        </div>
        <div class="song-info">
            <div class="song-title">${song.name}</div>
            <div class="song-artist">${artists} - ${album}</div>
        </div>
        <div class="song-duration">${duration}</div>
    `;
    
    div.addEventListener('click', () => {
        playSong(song, index);
        highlightActiveSong(div);
    });
    
    return div;
}

// 更新播放进度
function updateProgress() {
    const current = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 1;
    const percent = (current / duration) * 100;
    
    if (elements.progress) {
        elements.progress.style.width = `${percent}%`;
    }
    if (elements.currentTime) {
        elements.currentTime.textContent = formatTime(current);
    }
    
    // 保存播放进度
    if (currentTrack) {
        localStorage.setItem(`progress_${currentTrack.id}`, current.toString());
    }
}

// 更新总时长
function updateDuration() {
    const duration = audioPlayer.duration;
    if (duration && elements.totalTime) {
        elements.totalTime.textContent = formatTime(duration);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);

// 保存设置到本地存储
window.addEventListener('beforeunload', function() {
    saveVolume();
});
