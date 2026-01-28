import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type ResultsTableProps = {
  data: any[];
};

export default function ResultsTable({ data }: ResultsTableProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Query Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No results to display.</p>
        </CardContent>
      </Card>
    );
  }

  const headers = Object.keys(data[0]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Query Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary">
              <TableRow>
                {headers.map((header) => (
                  <TableHead key={header}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {headers.map((header) => (
                    <TableCell key={`${rowIndex}-${header}`}>{String(row[header])}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
