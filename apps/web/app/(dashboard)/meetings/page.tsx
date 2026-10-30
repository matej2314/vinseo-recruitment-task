import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Widok domyślny — miejsce na tabelę + Test (F-5…F-8 w Fazie 3).
 * Brak trasy detail UI.
 */
export default function MeetingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Spotkania</h1>
        <Button type="button" disabled title="Podpięcie BFF/API — Faza 3">
          Test
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Placeholder tabeli. Limit 10/25/50/100 + <code>page</code> oraz SSE po
        Test — Faza 3.
      </p>

      <div className="flex items-center gap-2 text-sm">
        <span>Limit (stub):</span>
        <select
          className="rounded-md border bg-background px-2 py-1"
          defaultValue="10"
          disabled
          aria-label="Limit listy"
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tytuł</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Podsumowanie</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} className="text-muted-foreground">
              Brak danych — lista z API przez BFF w Fazie 3.
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
