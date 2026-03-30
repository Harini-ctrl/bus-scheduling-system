interface Props {
  status: string;
}

const styles: Record<string, string> = {
  // Bus status
  active:       'bg-green-50 text-green-700 border-green-200',
  inactive:     'bg-red-50 text-red-700 border-red-200',
  maintenance:  'bg-amber-50 text-amber-700 border-amber-200',
  // Driver status
  available:    'bg-green-50 text-green-700 border-green-200',
  'on-duty':    'bg-blue-50 text-blue-700 border-blue-200',
  'on-rest':    'bg-purple-50 text-purple-700 border-purple-200',
  'off-duty':   'bg-gray-50 text-gray-600 border-gray-200',
  // Schedule status
  scheduled:    'bg-blue-50 text-blue-700 border-blue-200',
  completed:    'bg-green-50 text-green-700 border-green-200',
  cancelled:    'bg-red-50 text-red-700 border-red-200',
  // Duty type
  linked:       'bg-indigo-50 text-indigo-700 border-indigo-200',
  unlinked:     'bg-violet-50 text-violet-700 border-violet-200',
};

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${styles[status] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {status}
    </span>
  );
}