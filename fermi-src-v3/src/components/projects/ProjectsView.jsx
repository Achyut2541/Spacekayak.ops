import { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Calendar, Search } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { fmt } from '../../lib/utils';
import { PHASES, EMPTY_PROJECT } from '../../data/constants';
import ProjectModal from '../modals/ProjectModal';

export default function ProjectsView() {
  const {
    selectedProject, setSelectedProject, setTaskFilter, setActiveTab,
    showAddProject, setShowAddProject, editingProject, setEditingProject,
    searchQuery, showToast,
  } = useUI();
  const { projects, tasks, filteredTasks, delayedCount, addProject, updateProject, deleteProject, canEditProjects } = useData();
  const { currentUser } = useAuth();
  const canEdit = canEditProjects(currentUser);

  const [newProject, setNewProject] = useState({ ...EMPTY_PROJECT });
  const [customTasks, setCustomTasks] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const currentProject = selectedProject ? projects.find(p => p.id === selectedProject) : null;

  // Filter by search query
  const visibleProjects = projects.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      p.team?.am?.toLowerCase().includes(q) ||
      p.phase?.toLowerCase().includes(q)
    );
  });

  const handleSaveNew = () => {
    addProject(newProject, customTasks);
    setShowAddProject(false);
    setNewProject({ ...EMPTY_PROJECT });
    setCustomTasks([]);
    showToast(`"${newProject.name}" created`);
  };

  const handleSaveEdit = () => {
    updateProject(editingProject);
    setEditingProject(null);
    showToast('Project saved');
  };

  const handleDelete = (id) => {
    const name = projects.find(p => p.id === id)?.name;
    deleteProject(id);
    setConfirmDeleteId(null);
    showToast(`"${name}" deleted`, 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-light text-stone-900 font-serif tracking-tight">
            {currentProject ? currentProject.name : 'Projects'}
          </h2>
          {currentProject && (
            <button onClick={() => { setSelectedProject(null); setTaskFilter('all'); }}
              className="text-indigo-500 hover:text-indigo-600 font-medium text-sm mt-1 transition-colors">
              ← All Projects
            </button>
          )}
        </div>
        {canEdit && (
          <button onClick={() => setShowAddProject(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 flex items-center transition-opacity">
            <Plus className="w-4 h-4 mr-1.5" /> New Project
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Projects', value: projects.length, color: 'text-stone-900' },
          { label: 'Active Tasks', value: tasks.filter(t => t.status !== 'completed').length, color: 'text-stone-900' },
          { label: 'Delayed', value: delayedCount, color: delayedCount > 0 ? 'text-red-600' : 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-stone-100 border border-stone-200 rounded-[6px] p-3">
            <div className="gravity-label mb-0.5">{s.label}</div>
            <div className={`text-[1.9rem] font-light font-serif ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Project cards */}
      {visibleProjects.length === 0 ? (
        <div className="bg-stone-50 border border-stone-200 rounded-[6px] p-12 text-center">
          <Search className="w-8 h-8 mx-auto mb-3 text-stone-300" />
          <p className="text-sm font-medium text-stone-500">No projects match "{searchQuery}"</p>
          <p className="text-xs text-stone-400 font-mono mt-1">Try searching by name, type, phase, or AM</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleProjects.map(project => {
            const pTasks = filteredTasks(project.id);
            const delayed = pTasks.filter(t => t.status === 'delayed').length;
            const completed = pTasks.filter(t => t.status === 'completed').length;
            const taskCompletion = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;
            const isConfirmingDelete = confirmDeleteId === project.id;

            return (
              <div key={project.id} className={`bg-white border rounded-[6px] p-4 transition-all ${
                isConfirmingDelete ? 'border-red-300 bg-red-50/40' :
                delayed > 0 ? 'border-red-200 bg-red-50/30' : 'border-stone-200 hover:-translate-y-px'
              }`}>
                {/* Delete confirmation inline banner */}
                {isConfirmingDelete && (
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-red-200">
                    <span className="text-sm font-medium text-red-700">
                      Delete <span className="font-bold">{project.name}</span>? This removes all {pTasks.length} tasks too.
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(project.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-mono font-medium rounded-[5px] hover:opacity-85 transition-opacity">
                        Delete
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 border border-stone-200 text-stone-600 text-xs font-medium rounded-[5px] hover:bg-stone-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-medium text-stone-900">{project.name}</h3>
                      {project.isRetainer && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-[5px]">RET</span>
                      )}
                      {delayed > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-[5px] flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />{delayed}
                        </span>
                      )}
                      {project.archived && (
                        <span className="px-2 py-0.5 bg-stone-200 text-stone-500 text-xs font-mono rounded-[5px]">archived</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-500 font-mono flex-wrap">
                      <span className="hidden sm:inline">{project.type}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmt(project.endDate)}
                      </span>
                      <span>AM: {project.team.am}</span>
                    </div>
                  </div>

                  {/* Phase & Progress */}
                  <div className="w-full sm:w-44 flex-shrink-0">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-stone-500 font-mono">{project.phase}</span>
                      <span className="font-medium text-stone-700 font-mono">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 transition-all" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="w-24 flex-shrink-0 hidden sm:block">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-stone-500 font-mono">Tasks</span>
                      <span className="font-medium text-stone-700 font-mono">{completed}/{pTasks.length}</span>
                    </div>
                    <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${taskCompletion}%` }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setSelectedProject(project.id); setActiveTab('tasks'); setTaskFilter('all'); }}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-[5px] text-xs font-mono font-medium hover:opacity-85 transition-opacity"
                    >
                      Tasks
                    </button>
                    {canEdit && (
                      <>
                        <button
                          onClick={() => setEditingProject({ ...project })}
                          className="p-1.5 hover:bg-stone-100 rounded-[5px] transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-stone-500" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(confirmDeleteId === project.id ? null : project.id)}
                          className="p-1.5 hover:bg-red-50 rounded-[5px] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddProject && (
        <ProjectModal
          title="Add New Project"
          data={newProject}
          setData={setNewProject}
          onSave={handleSaveNew}
          onCancel={() => { setShowAddProject(false); setNewProject({ ...EMPTY_PROJECT }); setCustomTasks([]); }}
          phases={PHASES}
          isEdit={false}
          customTasks={customTasks}
          setCustomTasks={setCustomTasks}
        />
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <ProjectModal
          title="Edit Project"
          data={editingProject}
          setData={setEditingProject}
          onSave={handleSaveEdit}
          onCancel={() => setEditingProject(null)}
          phases={PHASES}
          isEdit={true}
        />
      )}
    </div>
  );
}
