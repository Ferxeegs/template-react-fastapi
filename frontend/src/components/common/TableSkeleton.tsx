import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showAvatar?: boolean;
}

export default function TableSkeleton({
  rows = 5,
  columns = 6,
  showAvatar = false,
}: TableSkeletonProps) {
  return (
    <Table>
      <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
        <TableRow>
          {Array.from({ length: columns }).map((_, index) => (
            <TableCell
              key={index}
              isHeader
              className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
            >
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
            </TableCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <TableRow key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex} className="px-5 py-4">
                {colIndex === 0 && showAvatar ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse dark:bg-gray-700" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                    </div>
                  </div>
                ) : (
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse dark:bg-gray-700" />
                )}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

