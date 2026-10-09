// src/utils/loading.js
import { ElLoading } from 'element-plus';

let loadingRequestCount = 0; // 请求计数器
let loadingInstance; // Loading 实例

// 显示 Loading
const showLoading = () => {
    if (loadingRequestCount === 0) {
        loadingInstance = ElLoading.service({
            lock: true,
            text: '加载中...',
            background: 'rgba(0, 0, 0, 0.2)',
        });
    }
    loadingRequestCount++;
};

// 隐藏 Loading
const hideLoading = () => {
    if (loadingRequestCount <= 0) return;
    loadingRequestCount--;
    if (loadingRequestCount === 0) {
        loadingInstance.close();
    }
};

export { showLoading, hideLoading };