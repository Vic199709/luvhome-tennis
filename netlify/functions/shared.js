const KINTONE_DOMAIN = 'https://dekt.cybozu.com';

export const APPS = {
  members: { id: 191, token: 'gArh68sHzKTy1iCJLyzS7BCLZD755YsBKqMybHx9' },
  teams: { id: 192, token: 'KZ7to3Y6k86SPEtmcioogRDCLvSiJnJ6wq2GUWLy' },
  matches: { id: 194, token: 'FlU0pWNI93li3GSWBXblHJsLp90OaQUtfNR2ozPt' },
  history: { id: 195, token: 'aAv4kk2N2BJ2tsF8S9thzTAMGkfl90fHCwtg3Un7' },
  settings: { id: 196, token: 'rIQkeRxQQeX3zoIebjMivgc4ZZLC8H2fY2MlL13F' }
};

const COMBINED_TOKEN = Object.values(APPS).map(app => app.token).join(',');

export async function kintoneFetch(appKey, path, options = {}) {
  const app = APPS[appKey];
  if (!app) throw new Error(`Invalid app key: ${appKey}`);

  const url = `${KINTONE_DOMAIN}${path}`;
  const headers = {
    'X-Cybozu-API-Token': COMBINED_TOKEN,
    ...options.headers
  };

  if (options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kintone error (${response.status}): ${text}`);
  }

  return response.json();
}

export function responseJson(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify(data)
  };
}

export function responseOptions() {
  return {
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: ''
  };
}
