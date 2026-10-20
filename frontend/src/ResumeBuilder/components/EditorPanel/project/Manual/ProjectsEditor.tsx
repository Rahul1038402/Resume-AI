import { Plus, Trash2 } from 'lucide-react';
import { Project } from '../../../../types/index';

interface ProjectsEditorProps {
    projects: Project[];
    addProject: () => void;
    updateProject: (id: string, field: keyof Project, value: string | string[]) => void;
    deleteProject: (id: string) => void;
    addProjectDescription: (projectId: string) => void;
    updateProjectDescription: (projectId: string, index: number, value: string) => void;
    deleteProjectDescription: (projectId: string, index: number) => void;
}

const ProjectsEditor = ({
    projects,
    addProject,
    updateProject,
    deleteProject,
    addProjectDescription,
    updateProjectDescription,
    deleteProjectDescription
}: ProjectsEditorProps) => {
    return (
        <div className="space-y-2.5">
            <h3 className="rb-heading mb-3">
                Projects
            </h3>

            <button
                onClick={addProject}
                className="
        w-full px-4 py-2 
        border-2 border-dotted border-line-strong 
        border-line-bright
        rounded-lg 
        flex items-center justify-center gap-2 
        text-white
        hover:border-line-bright
        transition-colors
        bg-transparent
    "
            >
                <Plus size={16} />
                Add Project
            </button>
            <div className="space-y-4">
                {projects.map((project) => (
                    <div key={project.id} className="p-4 border border-line rounded-lg space-y-2.5">
                        <div className="flex justify-end">
                            <button
                                onClick={() => deleteProject(project.id)}
                                className="text-red-500 hover:text-red-700 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 custom:grid-cols-2">
                            <div>
                            <label className="rb-label">Project Title <span className='text-red-400'>*</span></label>
                            <input
                                type="text"
                                value={project.title}
                                onChange={(e) => updateProject(project.id, 'title', e.target.value)}
                                className="rb-input"
                                placeholder="Project Name"
                            />
                            </div>
                            <div>
                            <label className="rb-label">Technologies Used <span className='text-red-400'>*</span></label>
                            <input
                                type="text"
                                value={project.technologies}
                                onChange={(e) => updateProject(project.id, 'technologies', e.target.value)}
                                className="rb-input"
                                placeholder="React, Node.js, MongoDB"
                            />
                            </div>

                        </div>

                        <div>
                            <label className="rb-label">Project Link</label>
                            <input
                                type="url"
                                value={project.link}
                                onChange={(e) => updateProject(project.id, 'link', e.target.value)}
                                className="rb-input"
                                placeholder="https://github.com/username/project"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="rb-label mb-0">Description Points</label>
                                <button
                                    onClick={() => addProjectDescription(project.id)}
                                    className="text-white hover:text-white/80 dark:text-white dark:hover:text-white/80 flex items-center text-xs font-medium"
                                >
                                    <Plus size={14} />
                                    Add Point
                                </button>
                            </div>

                            <div className="space-y-2">
                                {project.description.map((desc, index) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={desc}
                                            onChange={(e) => updateProjectDescription(project.id, index, e.target.value)}
                                            className="rb-input"
                                            placeholder="Describe what you accomplished..."
                                        />
                                        {project.description.length > 1 && (
                                            <button
                                                onClick={() => deleteProjectDescription(project.id, index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
export default ProjectsEditor;