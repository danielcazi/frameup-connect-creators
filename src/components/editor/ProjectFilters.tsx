import { Button } from '@/components/ui/button';
import { DollarSign, Clock, Film, Sparkles, X } from 'lucide-react';

interface Filters {
  videoType: string[];
  editingStyle: string[];
  minBudget: number;
  maxBudget: number;
  maxDeadline: number;
  search: string;
}

interface ProjectFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Partial<Filters>) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const VIDEO_TYPES = [
  { value: 'reels', label: 'Reels/Shorts' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'motion', label: 'Motion Design' },
];

const EDITING_STYLES = [
  { value: 'lofi', label: 'Lofi' },
  { value: 'dynamic', label: 'Dinâmica' },
  { value: 'pro', label: 'Profissional' },
  { value: 'motion', label: 'Motion Graphics' },
];

const DEADLINE_OPTIONS = [
  { value: 3, label: 'Até 3 dias' },
  { value: 7, label: 'Até 7 dias' },
  { value: 15, label: 'Até 15 dias' },
  { value: 30, label: 'Até 30 dias' },
];

function ProjectFilters({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: ProjectFiltersProps) {
  function toggleArrayFilter(key: 'videoType' | 'editingStyle', value: string) {
    const current = filters[key];
    const newValue = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({ [key]: newValue });
  }

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-6">
      {/* Tipo de Vídeo */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Film className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground">
            Tipo de Vídeo
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {VIDEO_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => toggleArrayFilter('videoType', type.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.videoType.includes(type.value)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Estilo de Edição */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground">
            Estilo de Edição
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {EDITING_STYLES.map((style) => (
            <button
              key={style.value}
              onClick={() => toggleArrayFilter('editingStyle', style.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filters.editingStyle.includes(style.value)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orçamento */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground">
            Faixa de Orçamento
          </label>
        </div>
        <div className="space-y-3">
          {/* Min Budget */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Mínimo: R$ {filters.minBudget.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="5000"
              step="50"
              value={filters.minBudget}
              onChange={(e) =>
                onFilterChange({ minBudget: Number(e.target.value) })
              }
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Max Budget */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Máximo: R$ {filters.maxBudget.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={filters.maxBudget}
              onChange={(e) =>
                onFilterChange({ maxBudget: Number(e.target.value) })
              }
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="text-center text-sm text-muted-foreground bg-muted py-2 rounded-lg">
            R$ {filters.minBudget.toFixed(2)} - R$ {filters.maxBudget.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Prazo */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium text-foreground">
            Prazo Máximo
          </label>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {DEADLINE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange({ maxDeadline: option.value })}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.maxDeadline === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground">
          {hasActiveFilters ? 'Filtros aplicados' : 'Sem filtros ativos'}
        </p>
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Limpar Tudo
          </Button>
        )}
      </div>
    </div>
  );
}

export default ProjectFilters;
