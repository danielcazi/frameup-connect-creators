import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

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

const videoTypes = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'corporate', label: 'Corporativo' },
  { value: 'advertisement', label: 'Publicitário' },
];

const editingStyles = [
  { value: 'dynamic', label: 'Dinâmico' },
  { value: 'minimalist', label: 'Minimalista' },
  { value: 'cinematic', label: 'Cinemático' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'documentary', label: 'Documentário' },
  { value: 'creative', label: 'Criativo' },
];

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}) => {
  const handleVideoTypeToggle = (value: string) => {
    const newTypes = filters.videoType.includes(value)
      ? filters.videoType.filter(t => t !== value)
      : [...filters.videoType, value];
    onFilterChange({ videoType: newTypes });
  };

  const handleEditingStyleToggle = (value: string) => {
    const newStyles = filters.editingStyle.includes(value)
      ? filters.editingStyle.filter(s => s !== value)
      : [...filters.editingStyle, value];
    onFilterChange({ editingStyle: newStyles });
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Video Type */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Tipo de Vídeo</h3>
          <div className="space-y-2">
            {videoTypes.map((type) => (
              <div key={type.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`video-${type.value}`}
                  checked={filters.videoType.includes(type.value)}
                  onCheckedChange={() => handleVideoTypeToggle(type.value)}
                />
                <Label
                  htmlFor={`video-${type.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {type.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Editing Style */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Estilo de Edição</h3>
          <div className="space-y-2">
            {editingStyles.map((style) => (
              <div key={style.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`style-${style.value}`}
                  checked={filters.editingStyle.includes(style.value)}
                  onCheckedChange={() => handleEditingStyleToggle(style.value)}
                />
                <Label
                  htmlFor={`style-${style.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {style.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Range */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Orçamento</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Mínimo: R$ {filters.minBudget.toFixed(2)}
              </Label>
              <Slider
                value={[filters.minBudget]}
                onValueChange={([value]) => onFilterChange({ minBudget: value })}
                min={0}
                max={10000}
                step={100}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Máximo: R$ {filters.maxBudget.toFixed(2)}
              </Label>
              <Slider
                value={[filters.maxBudget]}
                onValueChange={([value]) => onFilterChange({ maxBudget: value })}
                min={0}
                max={10000}
                step={100}
              />
            </div>
          </div>
        </div>

        {/* Deadline */}
        <div>
          <h3 className="font-semibold text-foreground mb-3">Prazo</h3>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground mb-2 block">
              Até {filters.maxDeadline} dias
            </Label>
            <Slider
              value={[filters.maxDeadline]}
              onValueChange={([value]) => onFilterChange({ maxDeadline: value })}
              min={1}
              max={30}
              step={1}
            />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="w-full mt-6"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectFilters;
