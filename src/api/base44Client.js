import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { isTestMode, getStore, setStore, clearAllTestStores } from '@/lib/testStore';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const realBase44 = createClient({ appId, token, functionsVersion, serverUrl: '', appBaseUrl });

// ── Mock query/sort helpers ──
function matchesQuery(record, query) {
  if (!query || typeof query !== 'object') return true;
  for (const [key, value] of Object.entries(query)) {
    if (record[key] !== value) return false;
  }
  return true;
}
function sortRecords(records, sort) {
  if (!sort) return records;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return [...records].sort((a, b) => {
    const av = a[field], bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return desc ? 1 : -1;
    if (bv == null) return desc ? -1 : 1;
    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}
function applyLimit(records, limit) { return limit ? records.slice(0, limit) : records; }
function genId() { return 'mock-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); }

// ── Mock entity proxy ──
function createEntityProxy(entityName) {
  return {
    list: (sort, limit) => {
      const s = getStore();
      return Promise.resolve(applyLimit(sortRecords(s?.entities?.[entityName] || [], sort), limit));
    },
    filter: (query, sort, limit) => {
      const s = getStore();
      const records = (s?.entities?.[entityName] || []).filter((r) => matchesQuery(r, query));
      return Promise.resolve(applyLimit(sortRecords(records, sort), limit));
    },
    create: (data) => {
      const s = getStore();
      const id = genId();
      const now = new Date().toISOString();
      const record = { id, created_date: now, updated_date: now, created_by_id: s?.user?.id || '', ...data };
      s.entities[entityName] = s.entities[entityName] || [];
      s.entities[entityName].push(record);
      setStore(s);
      return Promise.resolve(record);
    },
    update: (id, data) => {
      const s = getStore();
      const records = s?.entities?.[entityName] || [];
      const idx = records.findIndex((r) => r.id === id);
      if (idx === -1) return Promise.reject(new Error('Record not found'));
      records[idx] = { ...records[idx], ...data, updated_date: new Date().toISOString() };
      setStore(s);
      return Promise.resolve(records[idx]);
    },
    delete: (id) => {
      const s = getStore();
      if (s?.entities?.[entityName]) s.entities[entityName] = s.entities[entityName].filter((r) => r.id !== id);
      setStore(s);
      return Promise.resolve({ id });
    },
    get: (id) => {
      const s = getStore();
      const record = (s?.entities?.[entityName] || []).find((r) => r.id === id);
      return record ? Promise.resolve(record) : Promise.reject(new Error('Not found'));
    },
    bulkCreate: (items) => {
      const s = getStore();
      s.entities[entityName] = s.entities[entityName] || [];
      const now = new Date().toISOString();
      const created = items.map((data) => {
        const id = genId();
        const record = { id, created_date: now, updated_date: now, created_by_id: s?.user?.id || '', ...data };
        s.entities[entityName].push(record);
        return record;
      });
      setStore(s);
      return Promise.resolve(created);
    },
    bulkUpdate: (items) => {
      const s = getStore();
      const records = s?.entities?.[entityName] || [];
      items.forEach((item) => {
        const idx = records.findIndex((r) => r.id === item.id);
        if (idx !== -1) records[idx] = { ...records[idx], ...item, updated_date: new Date().toISOString() };
      });
      setStore(s);
      return Promise.resolve(items);
    },
    updateMany: (query, update) => {
      const s = getStore();
      const records = s?.entities?.[entityName] || [];
      let count = 0;
      records.forEach((r) => {
        if (matchesQuery(r, query)) {
          if (update.$set) Object.assign(r, update.$set);
          r.updated_date = new Date().toISOString();
          count++;
        }
      });
      setStore(s);
      return Promise.resolve({ modifiedCount: count });
    },
    deleteMany: (query) => {
      const s = getStore();
      const before = (s?.entities?.[entityName] || []).length;
      if (s?.entities?.[entityName]) s.entities[entityName] = s.entities[entityName].filter((r) => !matchesQuery(r, query));
      const after = s.entities[entityName].length;
      setStore(s);
      return Promise.resolve({ deletedCount: before - after });
    },
    schema: () => Promise.resolve({ type: 'object', properties: {} }),
    subscribe: () => () => {},
  };
}

// ── Mock auth ──
const mockAuth = {
  me: () => { const s = getStore(); return s?.user ? Promise.resolve(s.user) : Promise.reject(new Error('No test user')); },
  updateMe: (data) => { const s = getStore(); s.user = { ...s.user, ...data }; setStore(s); return Promise.resolve(s.user); },
  logout: () => { clearAllTestStores(); localStorage.removeItem('propwiz_test_profile'); localStorage.removeItem('propwiz_test_applications'); localStorage.removeItem('propwiz_test_notifications'); window.location.href = '/login'; return Promise.resolve(); },
  isAuthenticated: () => Promise.resolve(true),
  redirectToLogin: () => { window.location.href = '/login'; },
};

// ── Mock functions ──
const mockFunctions = {
  invoke: (name, data) => {
    if (name === 'createOwnedRecord') {
      const s = getStore();
      return createEntityProxy(data.entity).create({ ...data.data, owner_user_id: s.user.id }).then((record) => ({ data: { record } }));
    }
    if (name === 'linkTenant') {
      const s = getStore();
      const tenant = (s?.entities?.Tenant || []).find((t) => t.user_id === s.user.id);
      return Promise.resolve({ data: { tenant, notFound: !tenant } });
    }
    if (name === 'generateRentCharges') return Promise.resolve({ data: { generated: 0 } });
    if (name === 'approveUser' || name === 'promoteToAdmin') return Promise.resolve({ data: { success: true } });
    if (name === 'documentOps') return Promise.resolve({ data: { success: true } });
    return Promise.resolve({ data: { success: true } });
  },
};

// ── Mock integrations ──
const mockIntegrations = {
  Core: {
    UploadPublicFile: ({ file }) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ file_url: reader.result });
      reader.readAsDataURL(file);
    }),
    UploadPrivateFile: ({ file }) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ file_uri: reader.result });
      reader.readAsDataURL(file);
    }),
    CreateFileSignedUrl: ({ file_uri }) => Promise.resolve({ signed_url: file_uri }),
    InvokeLLM: () => Promise.resolve('Test mode: LLM not available.'),
    SendEmail: () => Promise.resolve({ success: true }),
    GenerateImage: () => Promise.resolve({ url: 'https://placehold.co/600x400/059669/ffffff?text=Generated' }),
    GenerateSpeech: () => Promise.resolve({ url: '' }),
    GenerateVideo: () => Promise.resolve({ url: '' }),
    TranscribeAudio: () => Promise.resolve('Test mode: transcription not available.'),
    ExtractDataFromUploadedFile: () => Promise.resolve({ status: 'success', output: {} }),
  },
};

const mockAnalytics = { track: () => {} };
const mockUsers = { inviteUser: () => Promise.resolve({ success: true }) };

// ── Entity proxy cache ──
const entityProxyCache = {};
const mockEntities = new Proxy({}, {
  get(_, entityName) {
    const name = String(entityName);
    if (!entityProxyCache[name]) entityProxyCache[name] = createEntityProxy(name);
    return entityProxyCache[name];
  },
});

// ── Main proxy: swaps to mock when in test mode ──
export const base44 = new Proxy(realBase44, {
  get(target, prop) {
    if (!isTestMode()) return target[prop];
    switch (prop) {
      case 'entities': return mockEntities;
      case 'auth': return mockAuth;
      case 'functions': return mockFunctions;
      case 'integrations': return mockIntegrations;
      case 'analytics': return mockAnalytics;
      case 'users': return mockUsers;
      default: return target[prop];
    }
  },
});