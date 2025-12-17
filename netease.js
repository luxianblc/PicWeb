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
let currentVolume = 50;
let isMuted = false;
let previousVolume = 50;
let qrCheckInterval = null;

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
    
    // 每页数量选择
    document.getElementById('searchLimit').addEventListener('change', function() {
        searchLimit = parseInt(this.value);
    });
    
    // 发送验证码按钮
    document.getElementById('sendCaptchaBtn').addEventListener('click', sendCaptcha);
    
    // 关闭模态框
    document.querySelector('.modal-close').addEventListener('click', hideLoginModal);
    document.getElementById('loginModal').addEventListener('click', function(e) {
        if (e.target === this) hideLoginModal();
    });
}

// 初始化播放器
function initPlayer() {
    const audio = new Audio();
    currentAudio = audio;
    
    // 设置初始音量
    audio.volume = currentVolume / 100;
    
    // DOM元素
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');
    
    // 播放/暂停
    playBtn.addEventListener('click', togglePlay);
    
    // 音量控制
    volumeSlider.addEventListener('input', function() {
        currentVolume = this.value;
        audio.volume = currentVolume / 100;
        document.getElementById('volumePercent').textContent = currentVolume + '%';
        updateVolumeIcon();
    });
    
    volumeIcon.addEventListener('click', toggleMute);
    
    // 进度条控制
    progressBar.addEventListener('click', function(e) {
        if (!audio.duration) return;
        const percent = e.offsetX / this.clientWidth;
        audio.currentTime = percent * audio.duration;
    });
    
    // 音频事件监听
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', function() {
        document.getElementById('totalTime').textContent = formatTime(audio.duration);
    });
    audio.addEventListener('ended', function() {
        isPlaying = false;
        playIcon.className = 'fas fa-play';
        handleSongEnded();
    });
    
    // 上一首/下一首按钮
    document.getElementById('prevBtn').addEventListener('click', playPrev);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    
    // 喜欢按钮
    document.getElementById('likeBtn').addEventListener('click', toggleLike);
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
    
    const savedVolume = localStorage.getItem('netease_volume');
    if (savedVolume) {
        currentVolume = parseInt(savedVolume);
        if (currentAudio) currentAudio.volume = currentVolume / 100;
        document.getElementById('volumeSlider').value = currentVolume;
        document.getElementById('volumePercent').textContent = currentVolume + '%';
        updateVolumeIcon();
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
            tabsDiv.innerHTML = `<div class="search-tab active">歌手(${result.artistCount || 0})</div>`;
            break;
            
        case 10: // 专辑
            html = generateAlbumList(result.albums || []);
            tabsDiv.innerHTML = `<div class="search-tab active">专辑(${result.albumCount || 0})</div>`;
            break;
            
        case 1000: // 歌单
            html = generatePlaylistList(result.playlists || []);
            tabsDiv.innerHTML = `<div class="search-tab active">歌单(${result.playlistCount || 0})</div>`;
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

// 生成歌单列表
function generatePlaylistList(playlists) {
    if (!playlists || playlists.length === 0) return '<div class="empty-state">未找到相关歌单</div>';
    
    return playlists.map(playlist => {
        return `
            <div class="song-item" onclick="getPlaylistSongs(${playlist.id})">
                <div class="song-cover">
                    ${playlist.coverImgUrl ? `<img src="${playlist.coverImgUrl}?param=50y50" alt="${playlist.name}">` : 
                                           `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-list"></i></div>`}
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
    
    if (result.playlists && result.playlists.length > 0) {
        html += `<h4 style="margin: 1rem 0; color: var(--primary-color);">歌单</h4>`;
        html += generatePlaylistList(result.playlists.slice(0, 5));
    }
    
    if (!html) html = '<div class="empty-state">未找到相关内容</div>';
    
    return html;
}

// 播放搜索结果
async function playSearchResult(index) {
    const song = currentPlaylist[index];
    
    if (!song || !song.id) {
        alert('无法播放此歌曲');
        return;
    }
    
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
    updateAlbumArt(song);
    
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
            }).catch(error => {
                alert('播放失败：' + error.message);
            });
        } else {
            alert('无法播放此歌曲：' + (data.message || '无版权或VIP专享'));
        }
    } catch (error) {
        alert('播放失败：' + error.message);
    }
}

// 更新专辑封面
function updateAlbumArt(song) {
    const albumArt = document.getElementById('albumArt');
    if (song.al && song.al.picUrl) {
        albumArt.className = 'album-art';
        albumArt.innerHTML = `<img src="${song.al.picUrl}?param=200y200" alt="${song.name}">`;
    } else {
        albumArt.className = 'album-art default';
        albumArt.innerHTML = '<i class="fas fa-music"></i>';
    }
}

// 获取歌手歌曲
async function searchArtistSongs(artistId) {
    try {
        const url = buildApiUrl('/artists', { id: artistId });
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.hotSongs) {
            currentPlaylist = data.hotSongs;
            const resultsDiv = document.getElementById('searchResults');
            resultsDiv.innerHTML = generateSongList(currentPlaylist);
        }
    } catch (error) {
        alert('获取歌手歌曲失败：' + error.message);
    }
}

// 获取专辑歌曲
async function getAlbumSongs(albumId) {
    try {
        const url = buildApiUrl('/album', { id: albumId });
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.songs) {
            currentPlaylist = data.songs;
            const resultsDiv = document.getElementById('searchResults');
            resultsDiv.innerHTML = generateSongList(currentPlaylist);
        }
    } catch (error) {
        alert('获取专辑歌曲失败：' + error.message);
    }
}

// 获取歌单歌曲
async function getPlaylistSongs(playlistId) {
    try {
        const url = buildApiUrl('/playlist/detail', { id: playlistId });
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.playlist && data.playlist.tracks) {
            currentPlaylist = data.playlist.tracks;
            const resultsDiv = document.getElementById('searchResults');
            resultsDiv.innerHTML = generateSongList(currentPlaylist.slice(0, 50));
        }
    } catch (error) {
        alert('获取歌单歌曲失败：' + error.message);
    }
}

// 高亮搜索关键词
function highlightText(text, keyword) {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background-color: rgba(230, 0, 38, 0.3); padding: 0 2px; border-radius: 2px;">$1</mark>');
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
    
    html += `<span style="color: var(--text-secondary); margin-left: 10px; font-size: 0.9rem;">共 ${searchTotal} 条</span>`;
    
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
            btn.innerHTML = '<i class="fas fa-redo"></i>';
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

// 获取推荐音乐
async function getRecommendations() {
    const recDiv = document.getElementById('recommendations');
    
    try {
        const params = {};
        if (userCookie) params.cookie = userCookie;
        
        const url = buildApiUrl('/personalized/newsong', params);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.result) {
            displayRecommendations(data.result.slice(0, 10));
        } else {
            // 如果推荐失败，使用默认列表
            getDefaultRecommendations();
        }
    } catch (error) {
        getDefaultRecommendations();
    }
}

// 显示推荐音乐
function displayRecommendations(songs) {
    const recDiv = document.getElementById('recommendations');
    
    let html = '<h4 style="margin-bottom: 1rem; color: var(--primary-color);">每日推荐</h4>';
    
    songs.forEach((song, index) => {
        const cover = song.picUrl || (song.song && song.song.al && song.song.al.picUrl) || '';
        const songName = song.name || (song.song && song.song.name) || '未知歌曲';
        const artist = song.song && song.song.ar ? song.song.ar.map(a => a.name).join(', ') : '未知歌手';
        
        html += `
            <div class="song-item" onclick="playSongById(${song.id || song.song.id})">
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
    
    let html = '<h4 style="margin-bottom: 1rem; color: var(--primary-color);">热门歌曲</h4>';
    
    defaultSongs.forEach((song, index) => {
        html += `
            <div class="song-item" onclick="playSongById(${song.id})">
                <div class="song-cover">
                    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-music"></i></div>
                </div>
                <div class="song-info">
                    <div class="song-title">${song.name}</div>
                    <div class="song-artist">${song.artist}</div>
                </div>
            </div>
        `;
    });
    
    recDiv.innerHTML = html;
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
            updateAlbumArt(song);
            
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

// 播放/暂停
function togglePlay() {
    if (!currentAudio.src) {
        // 如果没有歌曲，播放第一首推荐
        const firstSong = document.querySelector('#recommendations .song-item');
        if (firstSong) {
            const onclickAttr = firstSong.getAttribute('onclick');
            const songIdMatch = onclickAttr.match(/\d+/);
            if (songIdMatch) {
                const songId = songIdMatch[0];
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
    
    if (shuffleMode) {
        currentTrackIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
        currentTrackIndex--;
        if (currentTrackIndex < 0) {
            currentTrackIndex = currentPlaylist.length - 1;
        }
    }
    
    const song = currentPlaylist[currentTrackIndex];
    if (song && song.id) {
        playSongById(song.id);
    }
}

// 播放下一首
function playNext() {
    if (currentPlaylist.length === 0) return;
    
    if (shuffleMode) {
        currentTrackIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
        currentTrackIndex++;
        if (currentTrackIndex >= currentPlaylist.length) {
            currentTrackIndex = 0;
        }
    }
    
    const song = currentPlaylist[currentTrackIndex];
    if (song && song.id) {
        playSongById(song.id);
    }
}

// 处理歌曲结束
function handleSongEnded() {
    switch(repeatMode) {
        case 'one':
            currentAudio.currentTime = 0;
            currentAudio.play();
            isPlaying = true;
            document.getElementById('playIcon').className = 'fas fa-pause';
            break;
        case 'all':
            playNext();
            break;
        default:
            // 什么都不做
            break;
    }
}

// 切换喜欢状态
function toggleLike() {
    const likeBtn = document.getElementById('likeBtn');
    if (likeBtn.querySelector('.fas.fa-heart')) {
        likeBtn.innerHTML = '<i class="far fa-heart"></i>';
        likeBtn.title = '喜欢';
    } else {
        likeBtn.innerHTML = '<i class="fas fa-heart" style="color: var(--primary-color);"></i>';
        likeBtn.title = '取消喜欢';
    }
}

// 更新进度条
function updateProgress() {
    if (!currentAudio.duration) return;
    
    const progressPercent = (currentAudio.currentTime / currentAudio.duration) * 100;
    document.getElementById('progress').style.width = progressPercent + '%';
    document.getElementById('currentTime').textContent = formatTime(currentAudio.currentTime);
}

// 切换静音
function toggleMute() {
    const volumeIcon = document.getElementById('volumeIcon');
    const volumeSlider = document.getElementById('volumeSlider');
    
    if (isMuted) {
        // 取消静音
        currentAudio.volume = previousVolume / 100;
        volumeSlider.value = previousVolume;
        document.getElementById('volumePercent').textContent = previousVolume + '%';
        volumeIcon.className = getVolumeIcon(previousVolume);
        isMuted = false;
    } else {
        // 静音
        previousVolume = currentVolume;
        currentAudio.volume = 0;
        volumeSlider.value = 0;
        document.getElementById('volumePercent').textContent = '0%';
        volumeIcon.className = 'fas fa-volume-mute';
        isMuted = true;
    }
}

// 更新音量图标
function updateVolumeIcon() {
    const volumeIcon = document.getElementById('volumeIcon');
    volumeIcon.className = getVolumeIcon(currentVolume);
}

// 获取音量图标
function getVolumeIcon(volume) {
    if (volume === 0) return 'fas fa-volume-mute';
    if (volume < 50) return 'fas fa-volume-down';
    return 'fas fa-volume-up';
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

// 获取精品歌单
async function getHighQualityPlaylists() {
    try {
        const url = buildApiUrl('/top/playlist/highquality', { limit: 6 });
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.playlists) {
            displayHotPlaylists(data.playlists);
        }
    } catch (error) {
        console.error('获取精品歌单失败:', error);
    }
}

// 工具函数
function buildApiUrl(endpoint, params = {}) {
    const baseParams = {
        timestamp: Date.now()
    };
    
    const allParams = { ...baseParams, ...params };
    const queryString = new URLSearchParams(allParams).toString();
    
    return `${API_BASE}${endpoint}?${queryString}`;
}

function formatTime(milliseconds) {
    if (!milliseconds) return '0:00';
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getQualityText(level) {
    const qualityMap = {
        'standard': '标准',
        'higher': '较高',
        'exhigh': '极高',
        'lossless': '无损',
        'hires': 'Hi-Res'
    };
    return qualityMap[level] || level;
}

// 登录相关功能
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    // 清除二维码检查间隔
    if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
        qrCheckInterval = null;
    }
}

function switchLoginTab(tab) {
    // 隐藏所有登录表单
    document.querySelectorAll('.login-form').forEach(form => {
        form.classList.remove('active');
    });
    
    // 移除所有标签的active类
    document.querySelectorAll('.login-tab').forEach(tabBtn => {
        tabBtn.classList.remove('active');
    });
    
    // 显示选中的登录表单
    document.getElementById(tab + 'Login').classList.add('active');
    
    // 设置选中的标签为active
    document.querySelectorAll('.login-tab').forEach(tabBtn => {
        if (tabBtn.textContent.includes(getTabText(tab))) {
            tabBtn.classList.add('active');
        }
    });
}

function getTabText(tab) {
    switch(tab) {
        case 'qr': return '二维码登录';
        case 'password': return '密码登录';
        case 'phone': return '手机登录';
        default: return '';
    }
}

async function startQRLogin() {
    const qrContainer = document.getElementById('qrContainer');
    
    try {
        // 获取二维码key
        const keyUrl = buildApiUrl('/login/qr/key');
        const keyResponse = await fetch(keyUrl);
        const keyData = await keyResponse.json();
        
        if (keyData.code !== 200) {
            throw new Error('获取二维码失败');
        }
        
        const qrKey = keyData.data.unikey;
        
        // 生成二维码
        const qrUrl = buildApiUrl('/login/qr/create', { 
            key: qrKey, 
            qrimg: true 
        });
        const qrResponse = await fetch(qrUrl);
        const qrData = await qrResponse.json();
        
        if (qrData.code !== 200) {
            throw new Error('生成二维码失败');
        }
        
        // 显示二维码
        qrContainer.innerHTML = `
            <img src="${qrData.data.qrimg}" alt="登录二维码" style="width: 200px; height: 200px;">
            <p style="margin-top: 1rem; color: var(--text-secondary);">请使用网易云音乐APP扫码</p>
        `;
        
        // 轮询登录状态
        qrCheckInterval = setInterval(async () => {
            try {
                const checkUrl = buildApiUrl('/login/qr/check', { key: qrKey });
                const checkResponse = await fetch(checkUrl);
                const checkData = await checkResponse.json();
                
                if (checkData.code === 803) {
                    // 登录成功
                    clearInterval(qrCheckInterval);
                    userCookie = checkData.cookie;
                    localStorage.setItem('netease_cookie', userCookie);
                    
                    updateLoginStatus();
                    alert('登录成功！');
                    hideLoginModal();
                    getRecommendations(); // 刷新推荐
                } else if (checkData.code === 800) {
                    clearInterval(qrCheckInterval);
                    qrContainer.innerHTML = `
                        <div class="qr-placeholder">
                            <i class="fas fa-exclamation-circle"></i>
                            <p>二维码已过期</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
            }
        }, 2000);
        
    } catch (error) {
        qrContainer.innerHTML = `
            <div class="qr-placeholder">
                <i class="fas fa-exclamation-circle"></i>
                <p>生成失败: ${error.message}</p>
            </div>
        `;
        alert('登录失败：' + error.message);
    }
}

async function handleLogin() {
    const account = document.getElementById('loginAccount').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!account || !password) {
        alert('请输入账号和密码');
        return;
    }
    
    // 这里应该调用登录API
    // 由于安全原因，不建议在前端直接处理密码登录
    alert('建议使用二维码登录以保障安全');
    switchLoginTab('qr');
}

async function handlePhoneLogin() {
    const phone = document.getElementById('loginPhone').value;
    const captcha = document.getElementById('loginCaptcha').value;
    
    if (!phone || !captcha) {
        alert('请输入手机号和验证码');
        return;
    }
    
    alert('手机登录功能正在开发中...');
}

async function sendCaptcha() {
    const phone = document.getElementById('loginPhone').value;
    
    if (!phone) {
        alert('请输入手机号码');
        return;
    }
    
    const btn = document.getElementById('sendCaptchaBtn');
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

// 更新登录状态
function updateLoginStatus() {
    if (userCookie) {
        document.getElementById('loginStatus').textContent = '已登录';
        document.getElementById('loginStatus').className = 'status-value status-online';
        document.getElementById('qualityStatus').textContent = '高质量音质';
        document.getElementById('qualityStatus').className = 'status-value status-online';
    } else {
        document.getElementById('loginStatus').textContent = '未登录';
        document.getElementById('loginStatus').className = 'status-value status-offline';
        document.getElementById('qualityStatus').textContent = '标准音质';
        document.getElementById('qualityStatus').className = 'status-value status-warning';
    }
}

async function checkLoginStatus() {
    if (!userCookie) {
        alert('当前未登录');
        return;
    }
    
    try {
        const url = buildApiUrl('/login/status', { cookie: userCookie });
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.data.profile) {
            alert(`登录状态正常\n用户: ${data.data.profile.nickname}\nVIP: ${data.data.profile.vipType ? '是' : '否'}`);
            updateLoginStatus();
        } else {
            alert('登录状态已过期');
            localStorage.removeItem('netease_cookie');
            userCookie = null;
            updateLoginStatus();
        }
    } catch (error) {
        alert('检查失败：' + error.message);
    }
}

// 检查API状态
async function checkAPIStatus() {
    try {
        const url = buildApiUrl('/login/status');
        const response = await fetch(url);
        
        if (response.ok) {
            document.getElementById('apiStatus').textContent = '正常';
            document.getElementById('apiStatus').className = 'status-value status-online';
        } else {
            document.getElementById('apiStatus').textContent = '异常';
            document.getElementById('apiStatus').className = 'status-value status-offline';
        }
    } catch (error) {
        document.getElementById('apiStatus').textContent = '失败';
        document.getElementById('apiStatus').className = 'status-value status-offline';
    }
}

// 其他功能
async function getPersonalized() {
    if (!userCookie) {
        alert('个性化推荐需要登录后使用');
        showLoginModal();
        return;
    }
    
    try {
        const url = buildApiUrl('/recommend/songs', { cookie: userCookie });
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.data.dailySongs) {
            displayRecommendations(data.data.dailySongs.slice(0, 10));
        } else {
            getRecommendations(); // 回退到普通推荐
        }
    } catch (error) {
        getRecommendations();
    }
}

async function getTopList() {
    try {
        const url = buildApiUrl('/toplist');
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200 && data.list) {
            // 显示排行榜
            const recDiv = document.getElementById('recommendations');
            let html = '<h4 style="margin-bottom: 1rem; color: var(--primary-color);">排行榜</h4>';
            
            data.list.slice(0, 10).forEach(item => {
                html += `
                    <div class="song-item" onclick="getPlaylistSongs(${item.id})">
                        <div class="song-cover">
                            <img src="${item.coverImgUrl}?param=50y50" alt="${item.name}">
                        </div>
                        <div class="song-info">
                            <div class="song-title">${item.name}</div>
                            <div class="song-artist">${item.updateFrequency}</div>
                        </div>
                    </div>
                `;
            });
            
            recDiv.innerHTML = html;
        }
    } catch (error) {
        alert('获取排行榜失败：' + error.message);
    }
}

// 清空缓存
function clearCache() {
    if (confirm('确定要清空所有缓存吗？')) {
        localStorage.removeItem('netease_cookie');
        localStorage.removeItem('netease_search_history');
        localStorage.removeItem('netease_theme');
        userCookie = null;
        searchHistory = [];
        updateLoginStatus();
        alert('缓存已清空');
    }
}

// 保存音量设置
function saveVolume() {
    localStorage.setItem('netease_volume', currentVolume);
}

// 页面卸载前保存设置
window.addEventListener('beforeunload', function() {
    saveVolume();
});

// 初始化加载设置
loadSettings();
