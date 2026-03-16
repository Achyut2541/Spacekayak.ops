import { useState } from 'react';
import { Plus, Edit2, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import { useUI } from '../../contexts/UIContext';
import { useData } from '../../contexts/DataContext';
import { fmt } from '../../lib/utils';
import { PHASES, EMPTY_PROJECT } from '../../data/constants';
import ProjectModal from '../modals/ProjectModal';

export default function ProjectsView() {
  const {
    selectedProject, setSelectedProject, setTaskFilter, setActiveTab,
    showAddProject, setShowAddProject, editingProject, setEditingProject,
  } = useUI();
  const { projects, tasks, filteredTasks, delayedCount, addProject, updateProject, deleteProject } = useData();

  const [newProject, setNewProject] = useState({ ...EMPTY_PROJECT });
  const [customTasks, setCustomTasks] = useState([]);

  const currentProject = selectedProject ? projects.find(p => p.id === selectedProject) : null;

  const handleSaveNew = () => {
    addProject(newProject, customTasks);
    setShowAddProject(false);
    setNewProject({ ...EMPTY_PROJECT });
    setCustomTasks([]);
  };

  const handleSaveEdit = () => {
    updateProject(editingProject.id, editingProject);
    setEditingProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-light text-gray-900 font-serif tracking-tight">
            {currentProject ? currentProject.name : 'Projects'}
          </h2>
          {currentProject && (
            <button onClick={() => { setSelectedProject(null); setTaskFilter('all'); }}
              className="text-teal-600 hover:text-teal-700 font-semibold text-sm mt-1">
              ← All Projects
            </button>
          )}
        </div>
        <button onClick={() => setShowAddProject(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-[5px] text-sm font-mono font-medium uppercase tracking-wider hover:opacity-85 flex items-center transition-opacity">
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Projects', value: projects.length, color: 'text-gray-900' },
          { label: 'Active Tasks', value: tasks.filter(t => t.status !== 'completed').length, color: 'text-gray-900' },
          { label: 'Delayed', value: delayedCount, color: delayedCount > 0 ? 'text-red-600' : 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-stone-100 border border-stone-200 rounded-[6px] p-3">
            <div className="gravity-label mb-0.5">{s.label}</div>
            <div className={`text-[1.9rem] font-light font-serif ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Project cards */}
      <div className="space-y-2">
        {projects.map(project => {
          const pTasks = filteredTasks(project.id);
          const delayed = pTasks.filter(t => t.status === 'delayed').length;
          const completed = pTasks.filter(t => t.status === 'completed').length;
          const taskCompletion = pTasks.length > 0 ? Math.round((completed / pTasks.length) * 100) : 0;

          return (
            <div key={project.id} className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
              delayed > 0 ? 'border-red-300 bg-red-50/20' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900">{project.name}</h3>
                    {project.isRetainer && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">RET</span>
                    )}
                    {delayed > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />{delayed}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>{project.type}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {fmt(project.endDate)}
                    </span>
                    <span>AM: {project.team.am}</span>
                  </div>
                </div>

                {/* Phase & Progress */}
                <div className="w-52 flex-shrink-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 font-medium">{project.phase}</span>
                    <span className="font-semibold text-gray-900">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${project.progress}%` }} />
                  </div>
                </div>

                {/* Tasks */}
                <div className="w-32 flex-shrink-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Tasks</span>
                    <span className="font-semibold text-gray-900">{completed}/{pTasks.length}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-600 transition-all" style={{ width: `${taskCompletion}%` }} />
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
                  <button
                    onClick={() => setEditingProject({ ...project })}
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="p-1.5 hover:bg-red-100 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
