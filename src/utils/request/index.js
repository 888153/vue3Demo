import axios from 'axios';
import {ElMessage} from 'element-plus';
import router from '@/router/index'
// import {stateStore} from "@/stores/counter";
import {showLoading, hideLoading} from "../request/Loading";

// 用于控制错误信息显示频率
let lastErrorTime = 0;
const ERROR_MESSAGE_INTERVAL = 1000; // 1秒内只显示一次错误信息

// 创建实例并配置多环境‌:ml-citation{ref="1" data="citationList"}
const service = axios.create({
    baseURL: '/api',
    timeout: 2000,
    headers: {'Content-Type': 'application/x-www-form-urlencoded'}
});

// 请求拦截器 - 自动携带 Token‌:ml-citation{ref="2,6" data="citationList"}
service.interceptors.request.use(config => {
    if (config.method=='post'){
        if (config.data){
            if (config.data.indexOf('loading=false')!='-1'){
            }else{
                showLoading()
            }
        }else {
            showLoading()
        }
    }

    if (config.method=='get'){
        if (config.params?.loading==false){
        }else{
            showLoading()
        }
    }
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
    config.headers['vue'] = 'true';
    config.headers['encrypt'] = 'true';

    // SM4加密逻辑
    const sm4key = sessionStorage.getItem('sm4key'); // 从sessionStorage获取加密密钥
    const loginUrls = ['/login/sso/account', '/login/logout', '/login/verifyCode']; // 登录相关接口，始终加密
    const needEncrypt = sm4key || loginUrls.some(url => config.url.includes(url));

    if (needEncrypt) {
        const key = sm4key || 'b87778f2ad5a52e2'; // 使用存储的密钥或默认密钥
        if (config.method === 'post' || config.method === 'put') {
            // 对POST和PUT请求的数据进行加密
            if (config.data && config.data !== 'loading=false') {
                try {
                    let jsonData;
                    if (typeof config.data === 'string' && config.data.includes('=')) {
                        // 解析表单数据为对象
                        const formData = new URLSearchParams(config.data);
                        const dataObj = {};
                        for (const [key, value] of formData.entries()) {
                            dataObj[key] = value;
                        }
                        jsonData = JSON.stringify(dataObj);
                    } else {
                        // 处理普通对象或JSON字符串
                        try {
                            // 检查是否已经是JSON字符串
                            JSON.parse(config.data);
                            jsonData = JSON.stringify(config.data);
                        } catch (e) {
                            // 如果不是JSON字符串，转换为JSON
                            jsonData = JSON.stringify(config.data);
                        }
                    }
                    // console.log(jsonData)
                    const encryptedData = encryptData_ECB(jsonData, key);
                    //  console.log('加密后数据:', encryptedData);
                    config.data = qs.stringify({ data: encryptedData });
                    //   console.log('加密后的请求数据:', config.data);
                } catch (error) {
                    console.error('加密请求数据失败:', error);
                }
            }
        } else if (config.method === 'get') {
            // 对GET请求的params进行加密
            if (config.params) {
                try {
                    // console.log('加密前参数（GET）:', config.params);
                    const encryptedParams = encryptData_ECB(JSON.stringify(config.params), key);
                    //  console.log('加密后参数:', encryptedParams);
                    config.params = { data: encryptedParams };
                    //  console.log('加密后的请求参数:', config.params);
                } catch (error) {
                    console.error('加密请求参数失败:', error);
                }
            }
        }
    }

    return config;
}, error => Promise.reject(error));

// 响应拦截器 - 统一处理响应‌:ml-citation{ref="3,5" data="citationList"}
service.interceptors.response.use(
    async response => {
        hideLoading()
        let res = response;

        // SM4解密逻辑
        const sm4key = sessionStorage.getItem('sm4key'); // 从sessionStorage获取加密密钥
        const loginUrls = ['/auth/login', '/login/logout', '/login/verifyCode']; // 登录相关接口，始终解密

        // decrypt=true时才解密
        const hasEncryptHeader = response.headers && (
            response.headers['decrypt'] === 'true' ||
            response.headers['Decrypt'] === 'true' ||
            response.headers['DECRYPT '] === 'true'
        );
        const needDecrypt = hasEncryptHeader;
        // console.log('是否需要解密:', needDecrypt);
        // console.log('响应头encrypt:', response.headers['decrypt'] || response.headers['Decrypt']);
        // console.log('解密函数存在:', !!decryptData_ECB);

        if (needDecrypt && decryptData_ECB) {
            try {
                const key = sm4key || 'b87778f2ad5a52e2'; // 使用存储的密钥或默认密钥
                if (res.data && typeof res.data === 'string') {
                    // 如果响应数据是字符串，直接解密
                    // console.log('解密前数据（字符串）:', res.data);
                    const decrypted = decryptData_ECB(res.data, key);
                    // console.log('解密后数据:', decrypted);
                    res.data = JSON.parse(decrypted);
                    // console.log('解析后数据:', res.data);
                } else if (res.data && res.data.data && typeof res.data.data === 'string') {
                    // 如果响应数据是对象且包含data字段，解密data字段
                    // console.log('解密前数据（对象）:', res.data.data);
                    const decrypted = decryptData_ECB(res.data.data, key);
                    //  console.log('解密后数据:', decrypted);
                    res.data = JSON.parse(decrypted);
                    //  console.log('解析后数据:', res.data);
                }
            } catch (error) {
                console.error('响应数据失败:', error);
            }
        } else {
            console.log('响应数据:', res.data);
        }

        if (res.status === 302) {
            // 登录失效处理‌:ml-citation{ref="2" data="citationList"}
            const now = Date.now();
            if (now - lastErrorTime > ERROR_MESSAGE_INTERVAL) {
                ElMessage.error(res?.data?.message || '登录失效,请重新登陆');
                lastErrorTime = now;
            }
            try {
                // await stateStore().logout({});
                // await router.push("/login");
            } catch (error) {
            }
            // return Promise.reject(new Error('登录失效,请重新登陆'));
        }
        if (res.status === 401) {
            // 登录失效处理‌:ml-citation{ref="2" data="citationList"}
            try {
                // await stateStore().logout({});
                // await router.push("/login");
            } catch (error) {
            }
            // return Promise.reject(new Error('登录失效'));
        }
        if (res.status !== 200) {
            console.log("----------")
            // 控制错误信息显示频率
            const now = Date.now();
            if (now - lastErrorTime > ERROR_MESSAGE_INTERVAL) {
                ElMessage.error(res?.data?.message || '请求失败');
                lastErrorTime = now;
            }
            // return Promise.reject(res?.data);
        }
        return res?.data; // 直接返回业务数据层‌:ml-citation{ref="7" data="citationList"}
    },
    async error => {
        // console.log(error.code)
        // if (error.code === 'ERR_NETWORK') {
        // }
        hideLoading()

        // 控制错误信息显示频率
        const now = Date.now();
        if (now - lastErrorTime > ERROR_MESSAGE_INTERVAL) {
            ElMessage.error(error.response?.data?.message || '服务器异常');
            lastErrorTime = now;
        }

        try {
            // await stateStore().logout({});
            // await router.push("/login");
        } catch (error) {
        }
        // return Promise.reject(error);
    }
);

// 封装请求方法‌:ml-citation{ref="4" data="citationList"}
export const http = {
    get: (url, params) => service.get(url, {params}),
    post: (url, data) => service.post(url, qs.stringify(data, {arrayFormat: 'repeat'})),
};

// 兼容 main.js 中的 `import request from '@/utils/request'` 默认导入写法
export default http;
