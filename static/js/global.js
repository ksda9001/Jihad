
document.addEventListener('DOMContentLoaded', function () {
    // 动态加载 CSS
    const iziToastCss = document.createElement('link');
    iziToastCss.rel = 'stylesheet';
    iziToastCss.href = 'static/libs/css/iziToast.min.css';
    document.head.appendChild(iziToastCss);
    // 动态加载 JS
    const iziToastScript = document.createElement('script');
    iziToastScript.src = 'static/libs/js/iziToast.min.js';
    document.body.appendChild(iziToastScript);

    const g_dataUrlPrefix = document.documentElement.dataset.prefix || '';
    document.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        // 只处理相对路径，不处理绝对路径或外部链接
        if (href && !href.startsWith('http') && !href.startsWith(g_dataUrlPrefix)) {
            a.setAttribute('href', g_dataUrlPrefix + href);
        }
    });



})


