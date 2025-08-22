"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  SortingState,
  getSortedRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "./ui/button";
import { ArrowUpDown } from "lucide-react";
import Loader from "./Loader";

export type TrelloList = {
  id: string;
  name: string;
};

export type TrelloCard = {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  closed: boolean;
  url: string;
};

const columns: ColumnDef<TrelloCard>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <span>{row.getValue("name")}</span>,
  },
  {
    accessorKey: "due",
    header: "Due Date",
    cell: ({ row }) => {
      const value = row.getValue("due") as string | null;
      if (!value) return "—";

      const date = new Date(value);

      const formatted = new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);

      return <span>{formatted}</span>;
    },
  },
  {
    accessorKey: "closed",
    header: "Closed",
    cell: ({ row }) =>
      row.getValue("closed") ? (
        <span className="text-red-500">Yes</span>
      ) : (
        <span className="text-green-600">No</span>
      ),
  },
  {
    accessorKey: "url",
    header: "Link",
    cell: ({ row }) => (
      <a
        href={row.getValue("url")}
        target="_blank"
        className="text-blue-600 underline"
      >
        Open
      </a>
    ),
  },
];

export default function TrelloCards() {
  const [lists, setLists] = useState<TrelloList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [cards, setCards] = useState<TrelloCard[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch lists on mount
  useEffect(() => {
    const fetchLists = async () => {
      const res = await fetch("/api/trello/lists");
      const json = await res.json();
      setLists(json);

      // Load default from localStorage
      const savedMachine = localStorage.getItem("machine");
      if (
        savedMachine &&
        json.some((list: TrelloList) => list.id === savedMachine)
      ) {
        setSelectedList(savedMachine);
      }
    };
    fetchLists();
  }, []);

  // Fetch cards when a list is selected
  useEffect(() => {
    if (!selectedList) return;

    const fetchCards = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/trello/cards/${selectedList}`);
        const json = await res.json();
        setCards(json);
      } finally {
        setLoading(false);
      }
    };

    fetchCards();
  }, [selectedList]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: cards,
    columns,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div className="space-y-6">
      {/* List Selector */}
      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">Select Machine:</label>
        <select
          className="border rounded px-2 py-1"
          onChange={(e) => {
            setSelectedList(e.target.value);
            localStorage.setItem("machine", e.target.value);
          }}
          value={selectedList ?? ""}
        >
          <option value="" disabled>
            Choose a list
          </option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </div>

      {/* Cards Table */}
      {loading ? (
        <Loader />
      ) : (
        <div className="overflow-hidden rounded-md border min-h-48">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No cards found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
