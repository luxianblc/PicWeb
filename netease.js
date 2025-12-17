// 全局变量
let API_BASE = 'https://neteaseapi-enhanced.vercel.app';
let currentAudio = null;
let currentTrackIndex = 0;
let isPlaying = false;
let currentPlaylist = [];
let userCookie = null;
let currentSongData = null;
let playMode = 'order'; // order, random, repeat
let searchHistory = [];
let debounceTimer = null;

// 页面加载初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('网易云音乐正式版已加载');
    
    // 从本地存储加载设置
    loadSettings();
    
    // 初始化播放器
    initPlayer();
    
    // 初始化主题
    initTheme();
    
    // 初始化事件监听
    initEventListeners();
    
    // 加载推荐音乐
    getRecommendations();
    
    // 检查API状态
    checkAPIStatus();
    
    // 更新登录状态
    updateLoginStatus();
});

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
    const modeBtn = document.getElementById('modeBtn');
    
    // 播放/暂停
    playBtn.addEventListener('click', togglePlay);
    
    // 音量控制
    volumeSlider.addEventListener('input', function() {
        audio.volume = this.value / 100;
        document.getElementById('volumePercent').textContent = this.value + '%';
        updateVolumeIcon(this.value);
    });
    
    // 更新音量图标
    function updateVolumeIcon(volume) {
        const icon = document.getElementById('volumeIcon');
        if (volume == 0) {
            icon.className = 'fas fa-volume-mute';
        } else if (volume < 30) {
            icon.className = 'fas fa-volume-down';
        } else {
            icon.className = 'fas fa-volume-up';
        }
    }
    
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
        // 根据播放模式播放下一首
        handlePlayEnd();
    });
    
    // 上一首/下一首按钮
    document.getElementById('prevBtn').addEventListener('click', playPrev);
    document.getElementById('nextBtn').addEventListener('click', playNext);
    
    // 喜欢按钮
    document.getElementById('likeBtn').addEventListener('click', toggleLike);
    
    // 播放模式按钮
    modeBtn.addEventListener('click', togglePlayMode);
    
    // 初始音量图标
    updateVolumeIcon(volumeSlider.value);
}

// 初始化主题
function initTheme() {
    const savedTheme = localStorage.getItem('netease_theme') || 'dark';
    const themeToggle = document.getElementById('themeToggle');
    
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    // 主题切换按钮事件
    themeToggle.addEventListener('click', toggleTheme);
}

// 初始化事件监听器
function initEventListeners() {
    // 搜索输入框事件
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    // 搜索输入实时监听（防抖）
    searchInput.addEventListener('input', function() {
        if (this.value.trim()) {
            searchClear.style.display = 'block';
            
            // 防抖处理
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (this.value.trim().length >= 2) {
                    // 实时搜索建议
                    showSearchSuggestions(this.value);
                }
            }, 300);
        } else {
            searchClear.style.display = 'none';
        }
    });
    
    // 清空搜索按钮
    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.focus();
        this.style.display = 'none';
        clearSearchResults();
    });
    
    // 搜索框回车键搜索
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchMusic();
        }
    });
    
    // 模态框关闭事件
    document.getElementById('loginModal').addEventListener('click', function(e) {
        if (e.target === this) {
            hideLoginModal();
        }
    });
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
    
    const savedSearchHistory = localStorage.getItem('netease_search_history');
    if (savedSearchHistory) {
        searchHistory = JSON.parse(savedSearchHistory);
    }
    
    const savedPlayMode = localStorage.getItem('netease_play_mode');
    if (savedPlayMode) {
        playMode = savedPlayMode;
        updatePlayModeDisplay();
    }
}

// 保存设置
function saveSettings() {
    localStorage.setItem('netease_cookie', userCookie || '');
    localStorage.setItem('netease_search_history', JSON.stringify(searchHistory));
    localStorage.setItem('netease_play_mode', playMode);
}

// 切换主题
function toggleTheme() {
    const themeToggle = document.getElementById('themeToggle');
    
    if (document.body.classList.contains('dark-theme')) {
        // 切换到浅色主题
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('netease_theme', 'light');
    } else {
        // 切换到深色主题
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('netease_theme', 'dark');
    }
}

// 搜索音乐
async function searchMusic() {
    const searchInput = document.getElementById('searchInput');
    const keywords = searchInput.value.trim();
    
    if (!keywords) {
        showNotification('请输入搜索关键词', 'error');
        return;
    }
    
    // 添加到搜索历史
    addToSearchHistory(keywords);
    
    const resultsDiv = document.getElementById('searchResults');
    const noResults = document.getElementById('noResults');
    const searchStats = document.getElementById('searchStats');
    const searchType = document.getElementById('searchType').value;
    const typeName = document.getElementById('searchType').options[document.getElementById('searchType').selectedIndex].text;
    
    // 显示加载状态
    noResults.style.display = 'none';
    resultsDiv.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    searchStats.style.display = 'flex';
    
    try {
        const params = {
            keywords: encodeURIComponent(keywords),
            type: parseInt(searchType),
            limit: 30,
            offset: 0
        };
        
        if (userCookie) params.cookie = userCookie;
        
        // 根据搜索类型选择不同的API端点
        const endpoint = '/cloudsearch';
        const url = buildApiUrl(endpoint, params);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            displaySearchResults(data, searchType, typeName);
        } else {
            throw new Error(data.message || '搜索失败');
        }
    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-circle"></i>
                <p>搜索失败: ${error.message}</p>
                <button class="btn btn-secondary" onclick="searchMusic()" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> 重试
                </button>
            </div>
        `;
        document.getElementById('resultCount').textContent = '0';
        document.getElementById('resultType').textContent = typeName;
    }
}

// 显示搜索结果
function displaySearchResults(data, searchType, typeName) {
    const resultsDiv = document.getElementById('searchResults');
    const searchStats = document.getElementById('searchStats');
    
    let items = [];
    let total = 0;
    
    // 根据搜索类型处理数据
    switch (searchType) {
        case '1': // 单曲
            items = data.result.songs || [];
            total = data.result.songCount || 0;
            currentPlaylist = items;
            break;
        case '100': // 歌手
            items = data.result.artists || [];
            total = data.result.artistCount || 0;
            break;
        case '10': // 专辑
            items = data.result.albums || [];
            total = data.result.albumCount || 0;
            break;
        case '1000': // 歌单
            items = data.result.playlists || [];
            total = data.result.playlistCount || 0;
            break;
        case '1004': // MV
            items = data.result.mvs || [];
            total = data.result.mvCount || 0;
            break;
        default:
            items = [];
            total = 0;
    }
    
    // 更新统计信息
    document.getElementById('resultCount').textContent = total;
    document.getElementById('resultType').textContent = typeName;
    
    if (items.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <p>没有找到相关${typeName}</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">尝试其他关键词或搜索类型</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // 根据不同类型渲染结果
    if (searchType === '1') { // 单曲
        items.forEach((song, index) => {
            const artists = song.ar ? song.ar.map(artist => artist.name).join(', ') : '未知';
            const album = song.al ? song.al.name : '未知';
            const cover = song.al ? song.al.picUrl : '';
            const duration = formatTime(song.dt);
            
            html += `
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
    } else if (searchType === '100') { // 歌手
        items.forEach((artist) => {
            const cover = artist.img1v1Url || artist.picUrl || '';
            const albumCount = artist.albumSize || 0;
            const musicCount = artist.musicSize || 0;
            
            html += `
                <div class="song-item" onclick="viewArtist(${artist.id})">
                    <div class="song-cover">
                        ${cover ? `<img src="${cover}?param=50y50" alt="${artist.name}">` : 
                                  `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-user"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${artist.name}</div>
                        <div class="song-artist">专辑: ${albumCount} | 歌曲: ${musicCount}</div>
                    </div>
                </div>
            `;
        });
    } else if (searchType === '10') { // 专辑
        items.forEach((album) => {
            const cover = album.picUrl || '';
            const artist = album.artist ? album.artist.name : '未知';
            const songCount = album.size || 0;
            
            html += `
                <div class="song-item" onclick="viewAlbum(${album.id})">
                    <div class="song-cover">
                        ${cover ? `<img src="${cover}?param=50y50" alt="${album.name}">` : 
                                  `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-compact-disc"></i></div>`}
                    </div>
                    <div class="song-info">
                        <div class="song-title">${album.name}</div>
                        <div class="song-artist">${artist} | ${songCount}首歌曲</div>
                    </div>
                </div>
            `;
        });
    }
    
    resultsDiv.innerHTML = html;
    searchStats.style.display = 'flex';
}

// 清空搜索结果
function clearSearchResults() {
    const resultsDiv = document.getElementById('searchResults');
    const searchStats = document.getElementById('searchStats');
    const noResults = document.getElementById('noResults');
    
    resultsDiv.innerHTML = '';
    noResults.style.display = 'flex';
    searchStats.style.display = 'none';
    currentPlaylist = [];
}

// 添加到搜索历史
function addToSearchHistory(keyword) {
    if (!searchHistory.includes(keyword)) {
        searchHistory.unshift(keyword);
        if (searchHistory.length > 10) {
            searchHistory.pop();
        }
        localStorage.setItem('netease_search_history', JSON.stringify(searchHistory));
    }
}

// 显示搜索建议
async function showSearchSuggestions(keyword) {
    // 这里可以调用搜索建议API
    // 暂时使用本地搜索历史作为建议
    const suggestions = searchHistory.filter(item => 
        item.toLowerCase().includes(keyword.toLowerCase())
    ).slice(0, 5);
    
    if (suggestions.length > 0) {
        // 显示搜索建议（可以扩展实现）
        console.log('搜索建议:', suggestions);
    }
}

// 播放搜索结果
async function playSearchResult(index) {
    if (!currentPlaylist || currentPlaylist.length === 0) {
        showNotification('请先搜索歌曲', 'error');
        return;
    }
    
    const song = currentPlaylist[index];
    if (!song) return;
    
    // 更新高亮
    document.querySelectorAll('#searchResults .song-item').forEach(item => {
        item.classList.remove('active');
    });
    const clickedItem = event.currentTarget;
    clickedItem.classList.add('active');
    
    // 更新播放器显示
    document.getElementById('trackTitle').textContent = song.name;
    document.getElementById('trackArtist').textContent = song.ar ? song.ar.map(artist => artist.name).join(', ') : '未知';
    document.getElementById('trackAlbum').textContent = '专辑：' + (song.al ? song.al.name : '未知');
    document.getElementById('trackDuration').textContent = '时长：' + formatTime(song.dt);
    
    // 更新专辑封面
    const albumArt = document.getElementById('albumArt');
    if (song.al && song.al.picUrl) {
        albumArt.className = 'album-art';
        albumArt.innerHTML = `<img src="${song.al.picUrl}?param=200y200" alt="${song.name}" onerror="this.onerror=null; this.parentElement.className='album-art default'; this.parentElement.innerHTML='<i class=\"fas fa-music\"></i>';">`;
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
                showNotification(`正在播放: ${song.name}`, 'success');
            }).catch(error => {
                showNotification('播放失败: ' + error.message, 'error');
            });
        } else {
            throw new Error(data.message || '无法播放此歌曲');
        }
    } catch (error) {
        showNotification('播放失败: ' + error.message, 'error');
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
        console.error('获取推荐失败:', error);
        getDefaultRecommendations();
    }
}

// 刷新推荐
function refreshRecommendations() {
    const recDiv = document.getElementById('recommendations');
    recDiv.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
    getRecommendations();
}

// 显示推荐音乐
function displayRecommendations(songs) {
    const recDiv = document.getElementById('recommendations');
    
    let html = '<h4 style="margin-bottom: 1rem; color: var(--primary-color);">每日推荐</h4>';
    
    songs.forEach((song, index) => {
        const cover = song.picUrl || (song.song && song.song.al && song.song.al.picUrl) || '';
        const songName = song.name || (song.song && song.song.name) || '未知歌曲';
        const artist = song.song && song.song.ar ? song.song.ar.map(a => a.name).join(', ') : '未知歌手';
        const songId = song.id || (song.song && song.song.id);
        
        html += `
            <div class="song-item" onclick="playSongById(${songId})">
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
            const albumArt = document.getElementById('albumArt');
            if (song.al && song.al.picUrl) {
                albumArt.className = 'album-art';
                albumArt.innerHTML = `<img src="${song.al.picUrl}?param=200y200" alt="${song.name}" onerror="this.onerror=null; this.parentElement.className='album-art default'; this.parentElement.innerHTML='<i class=\"fas fa-music\"></i>';">`;
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
                    showNotification(`正在播放: ${song.name}`, 'success');
                }).catch(error => {
                    showNotification('播放失败: ' + error.message, 'error');
                });
            } else {
                throw new Error(data.message || '无法获取播放链接');
            }
        } else {
            throw new Error('获取歌曲详情失败');
        }
    } catch (error) {
        showNotification('播放失败: ' + error.message, 'error');
    }
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
        }).catch(error => {
            showNotification('播放失败: ' + error.message, 'error');
        });
    }
    isPlaying = !isPlaying;
}

// 播放上一首
function playPrev() {
    if (currentPlaylist.length === 0) {
        showNotification('当前没有播放列表', 'info');
        return;
    }
    
    if (playMode === 'random') {
        currentTrackIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
        currentTrackIndex--;
        if (currentTrackIndex < 0) {
            if (playMode === 'repeat') {
                currentTrackIndex = currentPlaylist.length - 1;
            } else {
                currentTrackIndex = 0;
                showNotification('已经是第一首歌了', 'info');
                return;
            }
        }
    }
    
    const song = currentPlaylist[currentTrackIndex];
    if (song && song.id) {
        playSongById(song.id);
    }
}

// 播放下一首
function playNext() {
    if (currentPlaylist.length === 0) {
        showNotification('当前没有播放列表', 'info');
        return;
    }
    
    if (playMode === 'random') {
        currentTrackIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
        currentTrackIndex++;
        if (currentTrackIndex >= currentPlaylist.length) {
            if (playMode === 'repeat') {
                currentTrackIndex = 0;
            } else {
                currentTrackIndex = currentPlaylist.length - 1;
                showNotification('已经是最后一首歌了', 'info');
                return;
            }
        }
    }
    
