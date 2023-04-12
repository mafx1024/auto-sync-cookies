/* eslint-disable */
// 存储在 localStorage 里的数据 key
export const LIST_KEY = 'domainList';

// 格式化协议头
export const addProtocol = (uri) => {
  return uri.startsWith('http') ? uri : `http://${uri}`;
};

// 移除协议头
export const removeProtocol = (uri) => {
  return uri.startsWith('http') ? uri.replace('http://', '').replace('https://', '') : uri;
};

const useStorage = () => {
  async function setStorage(list) {
    try {
      await chrome.storage.local.set({ [LIST_KEY]: list });
    } catch (err) {
      console.log(err, 'updateStorage error');
    }
  }

  async function getStorage(key = LIST_KEY) {
    try {
      const data = await chrome.storage.local.get(key);
      return data[key];
    } catch (err) {
      console.log(err, 'getStorage error');
    }
  }

  async function updateCookie(config) {
    try {
      const cookie = await chrome.cookies.get({
        url: addProtocol(config.source || 'url'),
        name: config.cookieName || 'name'
      });

      return cookie ? await setCookie(cookie, config) : null;
    } catch (error) {
      console.error('error: ', error);
    }
  }

  function setCookie(cookie, config) {
    try {
      return chrome.cookies.set({
        url: addProtocol(config.target || 'url'),
        domain: removeProtocol(config.target || 'url'),
        name: cookie.name,
        path: '/',
        value: cookie.value
      });
    } catch (err) {
      console.log(err, 'setCookie error');
    }
  }

  return {
    setStorage,
    getStorage,
    updateCookie
  };
};

export default useStorage;
