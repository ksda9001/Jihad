

document.addEventListener('DOMContentLoaded', function() {
    // 动态加载 CSS
    const iziToastCss = document.createElement('link');
    iziToastCss.rel = 'stylesheet';
    iziToastCss.href = 'libs/css/iziToast.min.css';
    document.head.appendChild(iziToastCss);
    // 动态加载 JS
    const iziToastScript = document.createElement('script');
    iziToastScript.src = 'libs/js/iziToast.min.js';
    document.body.appendChild(iziToastScript);
})