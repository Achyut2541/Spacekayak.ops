const BASECAMP_ACCOUNT_ID = import.meta.env.VITE_BASECAMP_ACCOUNT_ID || '';
const BASECAMP_TOKEN = import.meta.env.VITE_BASECAMP_TOKEN || '';
const BASE_URL = `https://3.basecampapi.com/${BASECAMP_ACCOUNT_ID}`;

const headers = () => ({
  'Authorization': `Bearer ${BASECAMP_TOKEN}`,
  'Content-Type': 'application/json',
  'User-Agent': 'Fermi Ops (fermi@spacekayak.xyz)',
});

async function basecampFetch(path) {
  if (!BASECAMP_ACCOUNT_ID || !BASECAMP_TOKEN) {
    return { data: null, error: 'Basecamp not configured' };
  }
  try {
    const res = await fetch(`${BASE_URL}${path}.json`, { headers: headers() });
    if (!res.ok) {
      return { data: null, error: `Basecamp API error: ${res.status}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function getProjects() {
  return basecampFetch('/projects');
}

export async function getProject(projectId) {
  return basecampFetch(`/projects/${projectId}`);
}

export async function getTodolists(projectId, todosetId) {
  return basecampFetch(`/buckets/${projectId}/todosets/${todosetId}/todolists`);
}

export async function getTodos(projectId, todolistId) {
  return basecampFetch(`/buckets/${projectId}/todolists/${todolistId}/todos`);
}

export async function getPeople() {
  return basecampFetch('/people');
}

export async function getScheduleEntries(projectId, scheduleId) {
  return basecampFetch(`/buckets/${projectId}/schedules/${scheduleId}/entries`);
}

export function isConfigured() {
  return Boolean(BASECAMP_ACCOUNT_ID && BASECAMP_TOKEN);
}
