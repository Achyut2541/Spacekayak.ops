import { getProjects, getTodolists, getTodos, getPeople, isConfigured } from './basecamp';
import { mapBasecampProject, mapBasecampTodo, mapBasecampPerson } from './basecamp-mapper';

const DEFAULT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function createSyncEngine(callbacks) {
  let intervalId = null;
  let lastSync = null;
  let syncing = false;

  const sync = async () => {
    if (!isConfigured() || syncing) return { success: false, error: 'Not configured or already syncing' };

    syncing = true;
    callbacks.onSyncStart?.();

    try {
      // Fetch projects
      const { data: bcProjects, error: projErr } = await getProjects();
      if (projErr) throw new Error(projErr);

      const projects = (bcProjects || []).map(mapBasecampProject);

      // Fetch todos for each project
      const allTodos = [];
      for (const proj of projects) {
        if (proj.todosetId) {
          const { data: todolists } = await getTodolists(proj.basecampId, proj.todosetId);
          if (todolists) {
            for (const list of todolists) {
              const { data: todos } = await getTodos(proj.basecampId, list.id);
              if (todos) {
                allTodos.push(...todos.map(t => mapBasecampTodo(t, proj.id)));
              }
            }
          }
        }
      }

      // Fetch people
      const { data: bcPeople } = await getPeople();
      const people = (bcPeople || []).map(mapBasecampPerson);

      lastSync = new Date();
      syncing = false;

      callbacks.onSyncComplete?.({ projects, todos: allTodos, people, lastSync });
      return { success: true, lastSync };
    } catch (err) {
      syncing = false;
      callbacks.onSyncError?.(err.message);
      return { success: false, error: err.message };
    }
  };

  const start = (interval = DEFAULT_INTERVAL) => {
    if (intervalId) stop();
    sync(); // Initial sync
    intervalId = setInterval(sync, interval);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { sync, start, stop, getLastSync: () => lastSync, isSyncing: () => syncing };
}
