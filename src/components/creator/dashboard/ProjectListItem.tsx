import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Calendar, MessageSquare, Clock } from 'lucide-react';
import { Project, getStatusConfig } from '../../../utils/projectHelpers';
import { getDeadlineInfo, formatTimestamp } from '../../../utils/dateHelpers';

interface ProjectListItemProps {
    project: Project;
}

export const ProjectListItem: React.FC<ProjectListItemProps> = ({ project }) => {
    const navigate = useNavigate();
    const statusConfig = getStatusConfig(project.status);

    // Helpers para exibição de data
    const renderDateInfo = () => {
        if (project.status === 'in_progress' && project.deadline_at) {
            const deadline = getDeadlineInfo(project.deadline_at);
            return (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${deadline.urgent ? 'text-red-500' : 'text-gray-500'
                    }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{deadline.text}</span>
                </div>
            );
        }

        if (project.status === 'in_review') {
            return (
                <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Aguardando revisão</span>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>Atualizado {formatTimestamp(project.updated_at)}</span>
            </div>
        );
    };

    return (
        <div
            onClick={() => navigate(`/creator/project/${project.id}`)}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mb-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer"
        >
            <div className="flex items-start gap-4">
                {/* Ícone de Status */}
                <div className={`
          flex items-center justify-center w-10 h-10 rounded-full shrink-0
          ${statusConfig.bgColor} border ${statusConfig.borderColor}
        `}>
                    <span className="text-xl">{statusConfig.icon}</span>
                </div>

                {/* Informações Principais */}
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {project.title}
                        </h3>
                        {project.is_batch && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                                Batch {project.batch_quantity}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        {/* Status Label */}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusConfig.borderColor} ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                            {statusConfig.label}
                        </span>

                        {/* Infos de Data */}
                        {renderDateInfo()}

                        {/* Editor Info */}
                        {project.editor_name && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                    {project.editor_avatar ? (
                                        <img src={project.editor_avatar} alt={project.editor_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="flex items-center justify-center w-full h-full text-[8px] font-bold">
                                            {project.editor_name.charAt(0)}
                                        </span>
                                    )}
                                </div>
                                <span>{project.editor_name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ações / Status Lateral */}
            <div className="flex items-center justify-between sm:justify-end gap-4 pl-14 sm:pl-0">
                {project.unread_messages && project.unread_messages > 0 ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium">
                        <MessageSquare className="w-4 h-4" />
                        <span>{project.unread_messages} nova{project.unread_messages > 1 ? 's' : ''}</span>
                    </div>
                ) : null}

                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
            </div>
        </div>
    );
};
