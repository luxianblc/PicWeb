// 网易云音乐播放器 - 主要功能实现

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
    searchType: document.getElementById('searchType'),
    searchClear: document.getElementById('searchClear'),
    searchResults: document.getElementById('searchResults'),
    resultCount: document.getElementById('resultCount'),
    resultType: document.getElementById('resultType'),
    searchStats: document.getElementById('searchStats'),
    noResults: document.getElementById('noResults'),
    
    // 推荐和状态
    recommendations: document.getElementById('recommendations'),
    loginStatus: document.getElementById('loginStatus'),
    qualityStatus: document.getElementById('qualityStatus'),
    apiStatusCard: document.getElementById('apiStatusCard'),
    playMode: document.getElementById('playMode'),
    
    // 主题切换
    themeToggle: document.getElementById('themeToggle'),
    
    // 登录模态框
    loginModal: document.getElementById('loginModal'),
    loginAccount: document.getElementById('loginAccount'),
    loginPassword: document.getElementById('loginPassword')
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
    
    // 检查登录状态
    checkLoginStatus();
    
    // 初始化主题
    initTheme();
    
    // 初始化搜索
    initSearch();
    
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
    
    // 音量控制
    elements.volumeSlider.addEventListener('input', updateVolume);
    
    // 进度条控制
    elements.progressBar.addEventListener('click', seekToPosition);
    
    // 主题切换
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // 搜索相关
    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchClear.addEventListener('click', clearSearchInput);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchMusic();
    });
    
    // 模态框关闭
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideLoginModal();
    });
    
    // 点击模态框外部关闭
    elements.loginModal.addEventListener('click', (e) => {
        if (e.target === elements.loginModal) {
            hideLoginModal();
        }
    });
    
    // 窗口焦点变化时检查播放状态
    window.addEventListener('blur', () => {
        // 保存播放状态
        if (audioPlayer) {
            localStorage.setItem('playbackTime', audioPlayer.currentTime);
            localStorage.setItem('isPlaying', isPlaying);
        }
    });
    
    window.addEventListener('focus', () => {
        // 恢复播放状态
        const savedTime = localStorage.getItem('playbackTime');
        const savedPlaying = localStorage.getItem('isPlaying');
        
        if (savedTime && currentTrack) {
            audioPlayer.currentTime = parseFloat(savedTime);
        }
        
        if (savedPlaying === 'true' && currentTrack) {
            audioPlayer.play().catch(console.error);
        }
    });
}

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
}

// 初始化搜索功能
function initSearch() {
    // 清空搜索输入
    elements.searchInput.value = '';
    
    // 隐藏统计信息
    elements.searchStats.style.display = 'none';
    
    // 显示初始状态
    showNoResults('输入关键词搜索音乐');
}

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

// 切换主题
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    
    if (isDark) {
        // 切换到浅色主题
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'light');
    } else {
        // 切换到深色主题
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'dark');
    }
}

// 搜索音乐
async function searchMusic() {
    const keyword = elements.searchInput.value.trim();
    const type = elements.searchType.value;
    
    if (!keyword) {
        showNoResults('请输入搜索关键词');
        return;
    }
    
    // 显示加载状态
    showLoading(elements.searchResults);
    
    try {
        const response = await fetch(`${API_BASE_URL}/search?keywords=${encodeURIComponent(keyword)}&type=${type}`);
        
        if (!response.ok) {
            throw new Error(`搜索失败: ${response.status}`);
        }
        
        const data = await response.json();
        displaySearchResults(data, type);
        
        // 更新统计信息
        updateSearchStats(data, type);
        
    } catch (error) {
        console.error('搜索错误:', error);
        showNoResults('搜索失败，请重试');
        elements.searchStats.style.display = 'none';
    }
}

// 处理搜索输入
function handleSearchInput() {
    const keyword = elements.searchInput.value.trim();
    
    // 显示/隐藏清除按钮
    if (keyword.length > 0) {
        elements.searchClear.style.display = 'block';
    } else {
        elements.searchClear.style.display = 'none';
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
    elements.searchInput.value = '';
    elements.searchClear.style.display = 'none';
    elements.searchInput.focus();
    showNoResults('输入关键词搜索音乐');
    elements.searchStats.style.display = 'none';
}

// 清空搜索结果
function clearSearchResults() {
    elements.searchResults.innerHTML = '';
    showNoResults('输入关键词搜索音乐');
    elements.searchStats.style.display = 'none';
    elements.searchInput.value = '';
    elements.searchClear.style.display = 'none';
}

// 显示加载状态
function showLoading(container) {
    container.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
        </div>
    `;
}

// 显示无结果状态
function showNoResults(message) {
    elements.noResults.innerHTML = `
        <i class="fas fa-search"></i>
        <p>${message}</p>
    `;
    elements.noResults.style.display = 'flex';
    elements.searchResults.appendChild(elements.noResults);
}

// 显示搜索结果
function displaySearchResults(data, type) {
    const container = elements.searchResults;
    container.innerHTML = '';
    
    if (!data.result || data.result.length === 0) {
        showNoResults('未找到相关结果');
        return;
    }
    
    // 根据类型显示不同格式的结果
    switch (type) {
        case '1': // 单曲
            displaySongs(data.result.songs || [], container);
            break;
        case '100': // 歌手
            displayArtists(data.result.artists || [], container);
            break;
        case '10': // 专辑
            displayAlbums(data.result.albums || [], container);
            break;
        case '1000': // 歌单
            displayPlaylists(data.result.playlists || [], container);
            break;
        case '1004': // MV
            displayMVs(data.result.mvs || [], container);
            break;
        default:
            displaySongs(data.result.songs || [], container);
    }
}

// 显示歌曲列表
function displaySongs(songs, container) {
    songs.forEach((song, index) => {
        const songElement = createSongElement(song, index);
        container.appendChild(songElement);
    });
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

// 显示艺术家
function displayArtists(artists, container) {
    artists.forEach(artist => {
        const div = document.createElement('div');
        div.className = 'song-item';
        
        const imgUrl = artist.img1v1Url || artist.picUrl || DEFAULT_COVER;
        
        div.innerHTML = `
            <div class="song-cover">
                <img src="${imgUrl}" alt="${artist.name}" loading="lazy">
            </div>
            <div class="song-info">
                <div class="song-title">${artist.name}</div>
                <div class="song-artist">
                    <span class="tag">${artist.alias?.join(' / ') || ''}</span>
                    <span>专辑数: ${artist.albumSize}</span>
                </div>
            </div>
            <div class="song-duration">
                <button class="btn btn-secondary" onclick="searchArtistSongs(${artist.id})">
                    查看歌曲
                </button>
            </div>
        `;
        
        container.appendChild(div);
    });
}

// 搜索艺术家的歌曲
function searchArtistSongs(artistId) {
    elements.searchType.value = '1';
    elements.searchInput.value = `artist:${artistId}`;
    searchMusic();
}

// 显示专辑
function displayAlbums(albums, container) {
    albums.forEach(album => {
        const div = document.createElement('div');
        div.className = 'song-item';
        
        div.innerHTML = `
            <div class="song-cover">
                <img src="${album.picUrl}" alt="${album.name}" loading="lazy">
            </div>
            <div class="song-info">
                <div class="song-title">${album.name}</div>
                <div class="song-artist">
                    ${album.artist?.name || '未知歌手'} • ${album.size} 首
                </div>
            </div>
            <div class="song-duration">
                <button class="btn btn-secondary" onclick="playAlbum(${album.id})">
                    播放专辑
                </button>
            </div>
        `;
        
        container.appendChild(div);
    });
}

// 播放专辑
async function playAlbum(albumId) {
    try {
        const response = await fetch(`${API_BASE_URL}/album?id=${albumId}`);
        const data = await response.json();
        
        if (data.songs) {
            currentPlaylist = data.songs;
            currentIndex = 0;
            playSong(currentPlaylist[0], 0);
            showNotification('已加载专辑歌曲');
        }
    } catch (error) {
        console.error('加载专辑失败:', error);
        showNotification('加载专辑失败', 'error');
    }
}

// 显示歌单
function displayPlaylists(playlists, container) {
    playlists.forEach(playlist => {
        const div = document.createElement('div');
        div.className = 'song-item';
        
        div.innerHTML = `
            <div class="song-cover">
                <img src="${playlist.coverImgUrl}" alt="${playlist.name}" loading="lazy">
            </div>
            <div class="song-info">
                <div class="song-title">${playlist.name}</div>
                <div class="song-artist">
                    <span class="tag">${playlist.trackCount} 首</span>
                    <span>播放: ${formatCount(playlist.playCount)}</span>
                </div>
            </div>
            <div class="song-duration">
                <button class="btn btn-secondary" onclick="playPlaylist(${playlist.id})">
                    播放歌单
                </button>
            </div>
        `;
        
        container.appendChild(div);
    });
}

// 播放歌单
async function playPlaylist(playlistId) {
    try {
        const response = await fetch(`${API_BASE_URL}/playlist/detail?id=${playlistId}`);
        const data = await response.json();
        
        if (data.playlist?.tracks) {
            currentPlaylist = data.playlist.tracks;
            currentIndex = 0;
            playSong(currentPlaylist[0], 0);
            showNotification('已加载歌单歌曲');
        }
    } catch (error) {
        console.error('加载歌单失败:', error);
        showNotification('加载歌单失败', 'error');
    }
}

// 显示 MV
function displayMVs(mvs, container) {
    mvs.forEach(mv => {
        const div = document.createElement('div');
        div.className = 'song-item';
        
        div.innerHTML = `
            <div class="song-cover">
                <img src="${mv.imgurl}" alt="${mv.name}" loading="lazy">
            </div>
            <div class="song-info">
                <div class="song-title">${mv.name}</div>
                <div class="song-artist">
                    ${mv.artistName} • ${formatCount(mv.playCount)} 播放
                </div>
            </div>
            <div class="song-duration">
                <button class="btn btn-secondary" onclick="playMV(${mv.id})">
                    播放 MV
                </button>
            </div>
        `;
        
        container.appendChild(div);
    });
}

// 播放 MV
function playMV(mvId) {
    showNotification('MV 播放功能开发中');
    // 这里可以添加 MV 播放的实现
}

// 更新搜索统计
function updateSearchStats(data, type) {
    const typeMap = {
        '1': '单曲',
        '100': '歌手',
        '10': '专辑',
        '1000': '歌单',
        '1004': 'MV'
    };
    
    let count = 0;
    if (data.result) {
        switch (type) {
            case '1': count = data.result.songCount || 0; break;
            case '100': count = data.result.artistCount || 0; break;
            case '10': count = data.result.albumCount || 0; break;
            case '1000': count = data.result.playlistCount || 0; break;
            case '1004': count = data.result.mvCount || 0; break;
        }
    }
    
    elements.resultCount.textContent = count;
    elements.resultType.textContent = typeMap[type] || '未知';
    elements.searchStats.style.display = 'flex';
}

// 播放歌曲
async function playSong(song, index) {
    if (!song) return;
    
    try {
        // 获取歌曲详情
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
        
    } catch (error) {
        console.error('播放失败:', error);
        showNotification('播放失败，请重试', 'error');
    }
}

// 更新播放器信息
function updatePlayerInfo(song, quality) {
    // 歌曲信息
    elements.trackTitle.textContent = song.name || '未知歌曲';
    
    // 艺术家信息
    const artists = song.ar ? song.ar.map(artist => artist.name).join(' / ') : 
                  song.artists ? song.artists.map(artist => artist.name).join(' / ') : '未知歌手';
    elements.trackArtist.textContent = artists;
    
    // 专辑信息
    const album = song.al ? song.al.name : 
                 song.album ? song.album.name : '未知专辑';
    elements.trackAlbum.textContent = `专辑：${album}`;
    
    // 时长
    const duration = song.dt ? song.dt / 1000 : 
                    song.duration ? song.duration / 1000 : 0;
    elements.trackDuration.textContent = `时长：${formatTime(duration)}`;
    
    // 音质
    const qualityMap = {
        'standard': '标准音质',
        'higher': '较高音质',
        'exhigh': '极高音质',
        'lossless': '无损音质',
        'hires': 'Hi-Res'
    };
    elements.trackQuality.textContent = `音质：${qualityMap[quality] || '未知'}`;
    
    // 专辑封面
    updateAlbumArt(song);
}

// 更新专辑封面
function updateAlbumArt(song) {
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
    elements.albumArt.innerHTML = '<i class="fas fa-music"></i>';
    elements.albumArt.classList.add('default');
}

// 切换播放/暂停
function togglePlay() {
    if (!currentTrack) {
        // 如果没有当前曲目，尝试播放第一首推荐歌曲
        const firstSong = document.querySelector('.song-item');
        if (firstSong) {
            const index = parseInt(firstSong.dataset.index);
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
    const icon = elements.playIcon;
    if (isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        elements.playBtn.title = '暂停';
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        elements.playBtn.title = '播放';
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
    elements.modeBtn.innerHTML = `<i class="fas ${modeIcon}"></i>`;
    elements.modeBtn.title = modeNames[nextModeIndex];
    
    // 更新状态显示
    if (elements.playMode) {
        elements.playMode.textContent = modeNames[nextModeIndex];
        elements.playMode.className = 'status-value info';
    }
    
    showNotification(`播放模式：${modeNames[nextModeIndex]}`);
}

// 更新音量
function updateVolume() {
    volume = elements.volumeSlider.value / 100;
    audioPlayer.volume = volume;
    elements.volumePercent.textContent = `${elements.volumeSlider.value}%`;
    
    // 更新音量图标
    const icon = elements.volumeIcon;
    if (volume === 0) {
        icon.className = 'fas fa-volume-mute';
    } else if (volume < 0.5) {
        icon.className = 'fas fa-volume-down';
    } else {
        icon.className = 'fas fa-volume-up';
    }
}

// 更新播放进度
function updateProgress() {
    const current = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 1;
    const percent = (current / duration) * 100;
    
    elements.progress.style.width = `${percent}%`;
    elements.currentTime.textContent = formatTime(current);
    
    // 保存播放进度
    if (currentTrack) {
        localStorage.setItem(`progress_${currentTrack.id}`, current.toString());
    }
}

// 更新总时长
function updateDuration() {
    const duration = audioPlayer.duration;
    if (duration) {
        elements.totalTime.textContent = formatTime(duration);
    }
}

// 跳转到指定位置
function seekToPosition(e) {
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
    const icon = elements.likeBtn.querySelector('i');
    
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
    elements.recommendations.innerHTML = `
        <div class="no-results">
            <i class="fas fa-star"></i>
            <p>暂无推荐，请稍后重试</p>
        </div>
    `;
}

// 获取个性化推荐
async function getPersonalized() {
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

// 更新音质状态
function updateQualityStatus(level) {
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
    elements.loginModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// 隐藏登录模态框
function hideLoginModa
