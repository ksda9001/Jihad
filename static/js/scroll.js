// 在页面加载完成后初始化按钮状态
document.addEventListener('DOMContentLoaded', () => {
    const scrollTopButton = document.querySelector('.mica-btn');
    if (scrollTopButton) {
        scrollTopButton.style.opacity = '0';
        scrollTopButton.style.pointerEvents = 'none';
        scrollTopButton.style.transform = 'scale(0.8)';
    }
});

// 监听页面滚动
document.addEventListener('scroll', () => {
    const scrollTopButton = document.querySelector('.mica-btn');
    if (!scrollTopButton) return;

    // 当页面滚动超过 300px 时显示按钮，否则隐藏
    const shouldShow = window.scrollY > 300;
    
    if (shouldShow) {
        scrollTopButton.style.opacity = '1';
        scrollTopButton.style.pointerEvents = 'auto';
        scrollTopButton.style.transform = 'scale(1)';
    } else {
        scrollTopButton.style.opacity = '0';
        scrollTopButton.style.pointerEvents = 'none';
        scrollTopButton.style.transform = 'scale(0.8)';
    }
});

// 返回顶部的功能函数
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}
