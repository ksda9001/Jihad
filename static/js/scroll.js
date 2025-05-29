// 返回顶部按钮，监听滚动事件，控制按钮的显示
const scrollBtn = document.getElementById("scrollBtn");

function toggleButtonVisibility() {
    if (window.scrollY === 0) {
        scrollBtn.classList.add("hidden"); // 页面滚动到顶部时隐藏
    } else {
        scrollBtn.classList.remove("hidden"); // 否则显示
    }
}

window.addEventListener("scroll", toggleButtonVisibility);

// 页面加载时先检查一次
toggleButtonVisibility();

// 返回顶部函数
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
}