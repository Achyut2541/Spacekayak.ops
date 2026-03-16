import { createContext, useContext, useState, useCallback } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewingAs, setViewingAs] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByPerson, setFilterByPerson] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [taskFilter, setTaskFilter] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState('all');
  const [expandedProjects, setExpandedProjects] = useState([]);
  const [expandedMember, setExpandedMember] = useState(null);
  const [weekView, setWeekView] = useState('this-week');

  // Modals
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [loggingHoursTask, setLoggingHoursTask] = useState(null);
  const [clientDelayTask, setClientDelayTask] = useState(null);
  const [reassigningTask, setReassigningTask] = useState(null);
  const [workloadWarning, setWorkloadWarning] = useState(null);

  // Crisis
  const [crisisCategory, setCrisisCategory] = useState('');
  const [crisisScenario, setCrisisScenario] = useState('');
  const [timelineFlex, setTimelineFlex] = useState(50);
  const [budgetFlex, setBudgetFlex] = useState(50);
  const [showReco, setShowReco] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(null);

  const toggleExpandProject = useCallback((id) => {
    setExpandedProjects(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  return (
    <UIContext.Provider value={{
      activeTab, setActiveTab, viewingAs, setViewingAs,
      searchQuery, setSearchQuery, filterByPerson, setFilterByPerson,
      showArchived, setShowArchived,
      selectedProject, setSelectedProject, taskFilter, setTaskFilter,
      capacityFilter, setCapacityFilter,
      expandedProjects, toggleExpandProject,
      expandedMember, setExpandedMember,
      weekView, setWeekView,
      showAddProject, setShowAddProject, showAddTask, setShowAddTask,
      showAddMember, setShowAddMember,
      editingProject, setEditingProject, editingTask, setEditingTask,
      editingMember, setEditingMember,
      loggingHoursTask, setLoggingHoursTask,
      clientDelayTask, setClientDelayTask,
      reassigningTask, setReassigningTask,
      workloadWarning, setWorkloadWarning,
      crisisCategory, setCrisisCategory, crisisScenario, setCrisisScenario,
      timelineFlex, setTimelineFlex, budgetFlex, setBudgetFlex,
      showReco, setShowReco, copiedTemplate, setCopiedTemplate,
    }}>
      {children}
    </UIContext.Provider>
  );
}

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};
