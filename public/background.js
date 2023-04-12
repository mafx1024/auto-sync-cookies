autoSyncCookiesEvent();

function autoSyncCookiesEvent() {
  console.log('start autoSyncCookiesEvent');
  chrome.cookies.onChanged.addListener(async (params = {}) => {
    const { cookie: { domain, name, value } = {} } = params;

    const localStorage = await chrome.storage.local.get();
    const { domainList } = localStorage || {};

    domainList.forEach(async (item = {}) => {
      const { isAuto = false, source, target, cookieNameList = [] } = item;
      if (!isAuto) return;

      // 1. 过滤域名

      if (removeProtocol(source) === domain) {
        // 2. 过滤name
        const flag = cookieNameList.findIndex((cookieName) => cookieName === name) !== -1;

        if (!flag) return;

        // 3. 更新目标地址的cookie
        await chrome.cookies.set({
          url: addProtocol(target),
          domain: removeProtocol(target),
          name,
          path: '/',
          value
        });
      }
    });
  });
}

const addProtocol = (uri) => {
  return uri.startsWith('http') ? uri : `http://${uri}`;
};

// 移除协议头
const removeProtocol = (uri) => {
  return uri.startsWith('http') ? uri.replace('http://', '').replace('https://', '') : uri;
};
