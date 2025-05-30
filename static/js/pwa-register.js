// PWA 注册
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('static/js/service-worker.js');
    });
}
