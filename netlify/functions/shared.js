const KINTONE_DOMAIN = 'https://dekt.cybozu.com';

// Token reference chart:
//   191 members       — no lookups
//   192 teams         — lookup → 192 (self)
//   194 matches       — lookup → 191, 192
//   196 settings      — no lookups
//   200 playerQuarterStats — lookup → 191, 192
//   201 playerYearStats    — lookup → 191, 192
//   202 teamPeriodStats    — lookup → 192
//
// Rule: write token = own token + all referenced-app tokens (comma-joined)
// Kintone requires the referenced app's token to validate lookup field values on write.

const T191 = 'gArh68sHzKTy1iCJLyzS7BCLZD755YsBKqMybHx9';
const T192 = 'KZ7to3Y6k86SPEtmcioogRDCLvSiJnJ6wq2GUWLy';
const T194 = 'FlU0pWNI93li3GSWBXblHJsLp90OaQUtfNR2ozPt';
const T196 = 'rIQkeRxQQeX3zoIebjMivgc4ZZLC8H2fY2MlL13F';
const T200 = 'M1a9S5PXYAEs8h2bbNvjA4kn0qUtO6LxvYliNIJZ';
const T201 = 'LzOW8T9mSp9fmDRAi59KvS2fzGZXtHNfBJsuytLb';
const T202 = '5dtCRBP5Jn9Lv31y5hhFIOCXE1H8qAVcFw7VfU8O';

export const APPS = {
  // 191: no lookups → readToken = writeToken
  members: {
    id: 191,
    readToken: T191,
    writeToken: [T191, T192].join(',')
  },
  // 192: self-lookup → own token covers both sides
  teams: {
    id: 192,
    readToken: T192,
    writeToken: T192
  },
  // 194: lookups → 191, 192
  matches: {
    id: 194,
    readToken: T194,
    writeToken: [T194, T191, T192].join(',')
  },
  // 196: no lookups
  settings: {
    id: 196,
    readToken: T196,
    writeToken: T196
  },
  // 200: lookups → 191, 192
  playerQuarterStats: {
    id: 200,
    readToken: T200,
    writeToken: [T200, T191, T192].join(',')
  },
  // 201: lookups → 191, 192
  playerYearStats: {
    id: 201,
    readToken: T201,
    writeToken: [T201, T191, T192].join(',')
  },
  // 202: lookup → 192
  teamPeriodStats: {
    id: 202,
    readToken: T202,
    writeToken: [T202, T192].join(',')
  }
};

export async function kintoneFetch(appKey, path, options = {}) {
  const app = APPS[appKey];
  if (!app) throw new Error(`Invalid app key: ${appKey}`);

  const isWrite = options.method && options.method !== 'GET';
  const token = isWrite ? app.writeToken : app.readToken;

  const url = `${KINTONE_DOMAIN}${path}`;
  let readablePath = path;
  try {
    readablePath = decodeURIComponent(path);
  } catch (_) {
    readablePath = path;
  }
  console.log(`[Kintone ${isWrite ? 'WRITE' : 'READ'}] ${appKey} ${readablePath} \n ${token}`);

  const headers = {
    'X-Cybozu-API-Token': token,
    ...options.headers
  };

  if (isWrite) {
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
