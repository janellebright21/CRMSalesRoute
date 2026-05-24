import { Priority } from '../types';

interface Props {
  priority: Priority;
  size?: 'sm' | 'md';
}

const classes: Record<Priority, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const labels: Record<Priority, string> = {
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
};

export default function PriorityBadge({ priority, size = 'sm' }: Props) {
  const padding = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${padding} ${classes[priority]}`}>
      {labels[priority]}
    </span>
  );
}
