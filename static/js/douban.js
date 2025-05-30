// 豆瓣热门电影电视剧推荐功能

// 豆瓣标签列表 - 修改为默认标签
let defaultMovieTags = ['热门', '最新', '经典', '豆瓣高分', '冷门佳片', '华语', '欧美', '韩国', '日本', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '治愈'];
let defaultTvTags = ['热门', '美剧', '英剧', '韩剧', '日剧', '国产剧', '港剧', '日本动画', '综艺', '纪录片'];

// 用户标签列表 - 存储用户实际使用的标签（包含保留的系统标签和用户添加的自定义标签）
let movieTags = [];
let tvTags = [];

if(localStorage.getItem('doubanEnabled')==null){
    localStorage.setItem('doubanEnabled', 'true');
}

// 加载用户标签
function loadUserTags() {
    try {
        const savedMovieTags = localStorage.getItem('userMovieTags');
        const savedTvTags = localStorage.getItem('userTvTags');
        
        if (savedMovieTags) {
            movieTags = JSON.parse(savedMovieTags);
        } else {
            movieTags = [...defaultMovieTags];
        }
        
        if (savedTvTags) {
            tvTags = JSON.parse(savedTvTags);
        } else {
            tvTags = [...defaultTvTags];
        }
    } catch (e) {
        console.error('加载标签失败：', e);
        movieTags = [...defaultMovieTags];
        tvTags = [...defaultTvTags];
    }
}

// 保存用户标签
function saveUserTags() {
    try {
        localStorage.setItem('userMovieTags', JSON.stringify(movieTags));
        localStorage.setItem('userTvTags', JSON.stringify(tvTags));
    } catch (e) {
        console.error('保存标签失败：', e);
        showToast('保存标签失败', 'error');
    }
}

let doubanMovieTvCurrentSwitch = 'movie';
let doubanCurrentTag = '热门';
const doubanPageSize = 20; // <--- 修改：每页显示20条
let doubanCurrentPage = 1; // <--- 新增：当前页码
const doubanMaxPages = 8;  // <--- 新增：豆瓣API通常能获取的最大有效页数 (8页 * 20条 = 160条)

// 初始化豆瓣功能
function initDouban() {
    const doubanToggle = document.getElementById('doubanToggle');
    if (doubanToggle) {
        const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
        doubanToggle.checked = isEnabled;
        
        const toggleBg = doubanToggle.nextElementSibling;
        const toggleDot = toggleBg.nextElementSibling;
        if (isEnabled) {
            toggleBg.classList.add('bg-pink-600');
            toggleDot.classList.add('translate-x-6');
        }
        
        doubanToggle.addEventListener('change', function(e) {
            const isChecked = e.target.checked;
            localStorage.setItem('doubanEnabled', isChecked);
            if (isChecked) {
                toggleBg.classList.add('bg-pink-600');
                toggleDot.classList.add('translate-x-6');
            } else {
                toggleBg.classList.remove('bg-pink-600');
                toggleDot.classList.remove('translate-x-6');
            }
            updateDoubanVisibility();
        });
        
        updateDoubanVisibility();
        window.scrollTo(0, 0);
    }

    loadUserTags();
    renderDoubanMovieTvSwitch();
    renderDoubanTags();
    // setupDoubanRefreshBtn(); // "换一批"按钮将被分页控件取代，故注释或移除此行

    if (localStorage.getItem('doubanEnabled') === 'true') {
        renderRecommend(doubanCurrentTag); // <--- 修改：不再传递 pageStart
    }
}

function updateDoubanVisibility() {
    const doubanArea = document.getElementById('doubanArea');
    if (!doubanArea) return;
    
    const isEnabled = localStorage.getItem('doubanEnabled') === 'true';
    const isSearching = document.getElementById('resultsArea') && 
        !document.getElementById('resultsArea').classList.contains('hidden');
    
    if (isEnabled && !isSearching) {
        doubanArea.classList.remove('hidden');
        if (document.getElementById('douban-results').children.length === 0) {
            doubanCurrentPage = 1; // 确保从第一页开始
            renderRecommend(doubanCurrentTag);
        }
    } else {
        doubanArea.classList.add('hidden');
    }
}

function fillSearchInput(title) {
    if (!title) return;
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        input.focus();
        showToast('已填充搜索内容，点击搜索按钮开始搜索', 'info');
    }
}

async function fillAndSearchWithDouban(title) {
    if (!title) return;
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    
    if (typeof selectedAPIs !== 'undefined' && !selectedAPIs.includes('dbzy')) {
        const doubanCheckbox = document.querySelector('input[id="api_dbzy"]');
        if (doubanCheckbox) {
            doubanCheckbox.checked = true;
            if (typeof updateSelectedAPIs === 'function') {
                updateSelectedAPIs();
            } else {
                selectedAPIs.push('dbzy');
                localStorage.setItem('selectedAPIs', JSON.stringify(selectedAPIs));
                const countEl = document.getElementById('selectedAPICount');
                if (countEl) countEl.textContent = selectedAPIs.length;
            }
            showToast('已自动选择豆瓣资源API', 'info');
        }
    }
    
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = safeTitle;
        await search();
        try {
            const encodedQuery = encodeURIComponent(safeTitle);
            window.history.pushState({ search: safeTitle }, `搜索: ${safeTitle} - 星空影城`, `/s=${encodedQuery}`);
            document.title = `搜索: ${safeTitle} - 星空影城`;
        } catch (e) {
            console.error('更新浏览器历史失败:', e);
        }
        if (window.innerWidth <= 768) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
}

function renderDoubanMovieTvSwitch() {
    const movieToggle = document.getElementById('douban-movie-toggle');
    const tvToggle = document.getElementById('douban-tv-toggle');
    if (!movieToggle || !tvToggle) return;

    updateToggleState(movieToggle, tvToggle);

    movieToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'movie') {
            doubanMovieTvCurrentSwitch = 'movie';
            updateToggleState(movieToggle, tvToggle);
            doubanCurrentTag = '热门';
            doubanCurrentPage = 1; // <--- 修改：重置页码
            renderDoubanTags(movieTags);
            renderRecommend(doubanCurrentTag);
        }
    });
    
    tvToggle.addEventListener('click', function() {
        if (doubanMovieTvCurrentSwitch !== 'tv') {
            doubanMovieTvCurrentSwitch = 'tv';
            updateToggleState(tvToggle, movieToggle);
            doubanCurrentTag = '热门';
            doubanCurrentPage = 1; // <--- 修改：重置页码
            renderDoubanTags(tvTags);
            renderRecommend(doubanCurrentTag);
        }
    });
}

function updateToggleState(activeButton, inactiveButton) {
    if (!activeButton || !inactiveButton) return;
    const activeStyle = activeButton.getAttribute('data-active');
    const inactiveStyle = inactiveButton.getAttribute('data-inactive');
    activeButton.className = `px-4 py-1.5 text-sm rounded-lg transition-all duration-300 ${activeStyle}`;
    inactiveButton.className = `px-4 py-1.5 text-sm rounded-lg transition-all duration-300 ${inactiveStyle}`;
}

function renderDoubanTags(tags) {
    const tagContainer = document.getElementById('douban-tags');
    if (!tagContainer) return;
    const currentTags = doubanMovieTvCurrentSwitch === 'movie' ? movieTags : tvTags;
    tagContainer.innerHTML = '';

    const manageBtn = document.createElement('button');
    manageBtn.className = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border border-[#333] hover:border-white';
    manageBtn.innerHTML = '<span class="flex items-center"><svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>管理标签</span>';
    manageBtn.onclick = function() { showTagManageModal(); };
    tagContainer.appendChild(manageBtn);

    currentTags.forEach(tag => {
        const btn = document.createElement('button');
        let btnClass = 'py-1.5 px-3.5 rounded text-sm font-medium transition-all duration-300 border ';
        if (tag === doubanCurrentTag) {
            btnClass += 'bg-pink-600 text-white shadow-md border-white';
        } else {
            btnClass += 'bg-[#1a1a1a] text-gray-300 hover:bg-pink-700 hover:text-white border-[#333] hover:border-white';
        }
        btn.className = btnClass;
        btn.textContent = tag;
        
        btn.onclick = function() {
            if (doubanCurrentTag !== tag) {
                doubanCurrentTag = tag;
                doubanCurrentPage = 1; // <--- 修改：重置页码
                renderRecommend(doubanCurrentTag);
                renderDoubanTags(); // Re-render tags to update active state
            }
        };
        tagContainer.appendChild(btn);
    });
}

// "换一批"按钮的功能被分页取代，可以注释或移除这个函数
/*
function setupDoubanRefreshBtn() {
    const btn = document.getElementById('douban-refresh');
    if (!btn) return;
    
    btn.onclick = function() {
        // This logic is now handled by pagination controls
        // doubanPageStart += doubanPageSize; 
        // if (doubanPageStart > (doubanMaxPages -1) * doubanPageSize) { // Assuming doubanMaxPages is 1-based
        //     doubanPageStart = 0;
        // }
        // renderRecommend(doubanCurrentTag);
        // For example, make it a "Next Page" button as a simple replacement:
        if (doubanCurrentPage < doubanMaxPages) {
            doubanCurrentPage++;
            renderRecommend(doubanCurrentTag);
        }
    };
}
*/

// 渲染热门推荐内容
function renderRecommend(tag) { // <--- 修改：移除 pageLimit, pageStart from params
    const container = document.getElementById("douban-results");
    if (!container) return;

    // Hide old refresh button as pagination controls will replace it
    const refreshBtn = document.getElementById('douban-refresh');
    if (refreshBtn) refreshBtn.style.display = 'none';

    const loadingOverlayHTML = `
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div class="flex items-center justify-center">
                <div class="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin inline-block"></div>
                <span class="text-pink-500 ml-4">加载中...</span>
            </div>
        </div>`;
    container.classList.add("relative");
    container.innerHTML = loadingOverlayHTML; // Clear previous results and show loader

    const pageStart = (doubanCurrentPage - 1) * doubanPageSize;
    const target = `https://movie.douban.com/j/search_subjects?type=${doubanMovieTvCurrentSwitch}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=${doubanPageSize}&page_start=${pageStart}`;
    
    fetchDoubanData(target)
        .then(data => {
            renderDoubanCards(data, container);
            renderPaginationControls(data.subjects ? data.subjects.length : 0); // <--- 新增：渲染分页控件
        })
        .catch(error => {
            console.error("获取豆瓣数据失败：", error);
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <div class="text-red-400">❌ 获取豆瓣数据失败，请稍后重试</div>
                    <div class="text-gray-500 text-sm mt-2">提示：使用VPN可能有助于解决此问题</div>
                </div>`;
            clearPaginationControls(); // <--- 新增：清除分页控件
             if (refreshBtn) refreshBtn.style.display = 'flex'; // Show refresh button again on error
        });
}

async function fetchDoubanData(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const fetchOptions = {
        signal: controller.signal,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Referer': 'https://movie.douban.com/',
            'Accept': 'application/json, text/plain, */*',
        }
    };

    try {
        const response = await fetch(PROXY_URL + encodeURIComponent(url), fetchOptions);
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return await response.json();
    } catch (err) {
        console.error("豆瓣 API 请求失败（直接代理）：", err);
        const fallbackUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        try {
            const fallbackResponse = await fetch(fallbackUrl);
            if (!fallbackResponse.ok) throw new Error(`备用API请求失败! 状态: ${fallbackResponse.status}`);
            const data = await fallbackResponse.json();
            if (data && data.contents) return JSON.parse(data.contents);
            throw new Error("无法获取有效数据");
        } catch (fallbackErr) {
            console.error("豆瓣 API 备用请求也失败：", fallbackErr);
            throw fallbackErr;
        }
    }
}

function renderDoubanCards(data, container) {
    const fragment = document.createDocumentFragment();
    if (!data.subjects || data.subjects.length === 0) {
        const emptyEl = document.createElement("div");
        emptyEl.className = "col-span-full text-center py-8";
        emptyEl.innerHTML = `<div class="text-pink-500">❌ 暂无更多数据或当前页无结果</div>`;
        fragment.appendChild(emptyEl);
    } else {
        data.subjects.forEach((item) => { // Removed index as it's not used here
            const card = document.createElement("div");
            card.className = "bg-[#111] hover:bg-[#222] transition-all duration-300 rounded-lg overflow-hidden flex flex-col transform hover:scale-105 shadow-md hover:shadow-lg";
            const safeTitle = item.title.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const safeRate = (item.rate || "暂无").replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const originalCoverUrl = item.cover;
            const proxiedCoverUrl = PROXY_URL + encodeURIComponent(originalCoverUrl);
            
            card.innerHTML = `
                <div class="relative w-full aspect-[2/3] overflow-hidden cursor-pointer" onclick="fillAndSearchWithDouban('${safeTitle}')">
                    <img src="${originalCoverUrl}" alt="${safeTitle}" 
                        class="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        onerror="this.onerror=null; this.src='${proxiedCoverUrl}'; this.classList.add('object-contain');"
                        loading="lazy" referrerpolicy="no-referrer">
                    <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-60"></div>
                    <div class="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm">
                        <span class="text-yellow-400">★</span> ${safeRate}
                    </div>
                    <div class="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-sm hover:bg-[#333] transition-colors">
                        <a href="${item.url}" target="_blank" rel="noopener noreferrer" title="在豆瓣查看" onclick="event.stopPropagation();">
                            🔗
                        </a>
                    </div>
                </div>
                <div class="p-2 text-center bg-[#111]">
                    <button onclick="fillAndSearchWithDouban('${safeTitle}')" 
                            class="text-sm font-medium text-white truncate w-full hover:text-pink-400 transition"
                            title="${safeTitle}">
                        ${safeTitle}
                    </button>
                </div>`;
            fragment.appendChild(card);
        });
    }
    container.innerHTML = ""; // Clear loader or previous content
    container.appendChild(fragment);
}

// --- 新增分页函数 ---
function renderPaginationControls(itemsOnCurrentPage) {
    const paginationContainer = document.getElementById('douban-pagination-controls');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = ''; // Clear previous controls

    // Previous Button
    const prevButton = document.createElement('button');
    prevButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        <span>上一页</span>`;
    prevButton.className = 'px-4 py-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
    prevButton.disabled = doubanCurrentPage === 1;
    prevButton.addEventListener('click', () => {
        if (doubanCurrentPage > 1) {
            doubanCurrentPage--;
            renderRecommend(doubanCurrentTag);
        }
    });
    paginationContainer.appendChild(prevButton);

    // Page Info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'px-4 py-2 text-sm text-gray-300';
    // If itemsOnCurrentPage is 0 and we are not on page 1, it means we overshot the actual max pages for this tag.
    // However,豆瓣 API doesn't tell total pages. So we stick to doubanMaxPages for display.
    let totalPagesForDisplay = doubanMaxPages;
    if (itemsOnCurrentPage === 0 && doubanCurrentPage > 1) {
         // This case means this page has no items. The previous page was likely the true last page.
         // For display purposes, we might want to adjust, but it's complex without total items info.
         // For now, we'll stick to doubanMaxPages for the "/ X页" part.
    }
    pageInfo.textContent = `第 ${doubanCurrentPage} / ${totalPagesForDisplay} 页`;
    paginationContainer.appendChild(pageInfo);

    // Next Button
    const nextButton = document.createElement('button');
    nextButton.innerHTML = `
        <span>下一页</span>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
    nextButton.className = 'px-4 py-2 text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 rounded-lg flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors';
    // Disable "Next" if on the assumed max page OR if the current page returned fewer items than doubanPageSize (implies no more data)
    // AND also if itemsOnCurrentPage is 0 (meaning current page is empty, so no next)
    nextButton.disabled = doubanCurrentPage === doubanMaxPages || itemsOnCurrentPage < doubanPageSize || itemsOnCurrentPage === 0;
    nextButton.addEventListener('click', () => {
        if (doubanCurrentPage < doubanMaxPages && itemsOnCurrentPage > 0 && itemsOnCurrentPage === doubanPageSize) { // only advance if current page was full
            doubanCurrentPage++;
            renderRecommend(doubanCurrentTag);
        } else if (itemsOnCurrentPage < doubanPageSize && itemsOnCurrentPage > 0) {
             // If last page had items but less than full, don't allow next.
        }
    });
    paginationContainer.appendChild(nextButton);
}

function clearPaginationControls() {
    const paginationContainer = document.getElementById('douban-pagination-controls');
    if (paginationContainer) {
        paginationContainer.innerHTML = '';
    }
}
// --- 结束分页函数 ---

// 重置到首页
function resetToHome() {
    resetSearchArea(); // Assuming this function exists elsewhere to clear search results
    updateDoubanVisibility(); // This will re-trigger douban rendering if enabled
    // If you want to explicitly reset douban to its first page:
    // doubanCurrentPage = 1;
    // doubanCurrentTag = '热门'; 
    // renderRecommend(doubanCurrentTag); // if douban is visible
}

document.addEventListener('DOMContentLoaded', initDouban);

// --- 标签管理功能 (保持不变，仅为完整性包含) ---
function showTagManageModal() {
    let modal = document.getElementById('tagManageModal');
    if (modal) document.body.removeChild(modal);
    
    modal = document.createElement('div');
    modal.id = 'tagManageModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-40';
    
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    
    modal.innerHTML = `
        <div class="bg-[#191919] rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
            <button id="closeTagModal" class="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">&times;</button>
            <h3 class="text-xl font-bold text-white mb-4">标签管理 (${isMovie ? '电影' : '电视剧'})</h3>
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-lg font-medium text-gray-300">标签列表</h4>
                    <button id="resetTagsBtn" class="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded">恢复默认标签</button>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4" id="tagsGrid">
                    ${currentTags.length ? currentTags.map(tag => {
                        const canDelete = tag !== '热门';
                        return `
                            <div class="bg-[#1a1a1a] text-gray-300 py-1.5 px-3 rounded text-sm font-medium flex justify-between items-center group">
                                <span>${tag.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                                ${canDelete ? 
                                    `<button class="delete-tag-btn text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" data-tag="${tag.replace(/"/g, '&quot;')}">✕</button>` : 
                                    `<span class="text-gray-500 text-xs italic opacity-0 group-hover:opacity-100">必需</span>`
                                }
                            </div>`;
                    }).join('') : `<div class="col-span-full text-center py-4 text-gray-500">无标签，请添加或恢复默认</div>`}
                </div>
            </div>
            <div class="border-t border-gray-700 pt-4">
                <h4 class="text-lg font-medium text-gray-300 mb-3">添加新标签</h4>
                <form id="addTagForm" class="flex items-center">
                    <input type="text" id="newTagInput" placeholder="输入标签名称..." class="flex-1 bg-[#222] text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-pink-500">
                    <button type="submit" class="ml-2 bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded">添加</button>
                </form>
                <p class="text-xs text-gray-500 mt-2">提示：标签名称不能为空，不能重复，不能包含特殊字符</p>
            </div>
        </div>`;
    
    document.body.appendChild(modal);
    setTimeout(() => { document.getElementById('newTagInput').focus(); }, 100);
    
    document.getElementById('closeTagModal').addEventListener('click', () => document.body.removeChild(modal));
    modal.addEventListener('click', e => { if (e.target === modal) document.body.removeChild(modal); });
    
    document.getElementById('resetTagsBtn').addEventListener('click', () => {
        resetTagsToDefault();
        showTagManageModal();
    });
    
    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteTag(this.getAttribute('data-tag'));
            showTagManageModal();
        });
    });
    
    document.getElementById('addTagForm').addEventListener('submit', e => {
        e.preventDefault();
        const input = document.getElementById('newTagInput');
        const newTag = input.value.trim();
        if (newTag) {
            addTag(newTag);
            input.value = '';
            showTagManageModal();
        }
    });
}

function addTag(tag) {
    const safeTag = tag.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    const currentTags = isMovie ? movieTags : tvTags;
    const exists = currentTags.some(existingTag => existingTag.toLowerCase() === safeTag.toLowerCase());
    if (exists) {
        showToast('标签已存在', 'warning');
        return;
    }
    if (isMovie) movieTags.push(safeTag); else tvTags.push(safeTag);
    saveUserTags();
    renderDoubanTags();
    showToast('标签添加成功', 'success');
}

function deleteTag(tag) {
    if (tag === '热门') {
        showToast('热门标签不能删除', 'warning');
        return;
    }
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    let currentTagsRef = isMovie ? movieTags : tvTags; // Use a new variable for reassignment
    const index = currentTagsRef.indexOf(tag);
    if (index !== -1) {
        currentTagsRef.splice(index, 1);
        if (isMovie) movieTags = currentTagsRef; else tvTags = currentTagsRef; // Assign back
        saveUserTags();
        if (doubanCurrentTag === tag) {
            doubanCurrentTag = '热门';
            doubanCurrentPage = 1;
            renderRecommend(doubanCurrentTag);
        }
        renderDoubanTags();
        showToast('标签删除成功', 'success');
    }
}

function resetTagsToDefault() {
    const isMovie = doubanMovieTvCurrentSwitch === 'movie';
    if (isMovie) movieTags = [...defaultMovieTags]; else tvTags = [...defaultTvTags];
    doubanCurrentTag = '热门';
    doubanCurrentPage = 1;
    saveUserTags();
    renderDoubanTags();
    renderRecommend(doubanCurrentTag);
    showToast('已恢复默认标签', 'success');
}