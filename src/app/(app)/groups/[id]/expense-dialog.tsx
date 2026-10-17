"use client";

import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { Avatar } from "@/components/avatar";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIES, type Category } from "@/domain/categories";
import { formatMoney, toMinorUnits } from "@/domain/money";
import { splitByPercent, splitEqually, splitExact } from "@/domain/splits";
import type { FormState } from "@/lib/form-state";
import { deleteExpenseAction, saveExpenseAction } from "./actions";

type Member = { id: string; displayName: string; avatarColor: string };

export type EditableExpense = {
  id: string;
  title: string;
  category: Category;
  amountMinor: number;
  paidByUserId: string;
  spentOn: string;
  splits: Record<string, number>;
};

const MESSAGES: Record<string, string> = {
  "no-participants": "Pick at least one person.",
  "invalid-total": "Enter an amount greater than zero.",
  "invalid-part": "Every share has to be zero or more.",
  "parts-do-not-sum": "The shares have to add up to the total.",
  "percents-do-not-sum": "The percentages have to add up to 100.",
};

/** Mounted fresh on every open, so the action state never leaks between uses. */
function ExpenseForm({
  groupId,
  currency,
  members,
  viewerId,
  expense,
  canEdit = true,
  onDone,
}: {
  groupId: string;
  currency: string;
  members: Member[];
  viewerId: string;
  expense?: EditableExpense;
  canEdit?: boolean;
  onDone: () => void;
}) {
  const editing = Boolean(expense);
  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState(expense ? (expense.amountMinor / 100).toFixed(2) : "");
  const [title, setTitle] = useState(expense?.title ?? "");
  const [category, setCategory] = useState<Category>(expense?.category ?? "food");
  const [paidBy, setPaidBy] = useState(expense?.paidByUserId ?? viewerId);
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? today);
  const [mode, setMode] = useState<"equal" | "exact" | "percent">(editing ? "exact" : "equal");
  const [participants, setParticipants] = useState<string[]>(
    expense ? Object.keys(expense.splits) : members.map((member) => member.id),
  );
  const [parts, setParts] = useState<Record<string, string>>(() => {
    if (!expense) return {};
    if (mode === "percent") return {};
    return Object.fromEntries(
      Object.entries(expense.splits).map(([id, cents]) => [id, (cents / 100).toFixed(2)]),
    );
  });

  const [state, formAction, pending] = useActionState<FormState, FormData>(saveExpenseAction, {});

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  const deleteFormId = expense ? `delete-expense-${expense.id}` : "";
  const total = toMinorUnits(amount);

  /**
   * The same domain functions the server uses, so the preview cannot disagree
   * with what gets stored. The server recomputes anyway and never trusts this.
   */
  const preview = useMemo(() => {
    if (total === null || total <= 0 || participants.length === 0) return null;
    if (mode === "equal") return splitEqually(total, participants);
    if (mode === "exact") {
      const parsed: Record<string, number> = {};
      for (const id of participants) {
        const value = toMinorUnits(parts[id] ?? "");
        if (value === null) return null;
        parsed[id] = value;
      }
      return splitExact(total, parsed);
    }
    const percents: Record<string, number> = {};
    for (const id of participants) {
      const value = Number.parseFloat((parts[id] ?? "").replace(",", "."));
      if (!Number.isFinite(value)) return null;
      percents[id] = value;
    }
    return splitByPercent(total, percents);
  }, [total, mode, participants, parts]);

  const valid = Boolean(title.trim()) && total !== null && total > 0 && preview?.ok === true;
  const problem = preview && !preview.ok ? MESSAGES[preview.error] : null;

  function toggleParticipant(id: string) {
    setParticipants((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle>{editing ? (canEdit ? "Edit expense" : "Expense") : "Add expense"}</DialogTitle>
          <DialogDescription>
            {!canEdit
              ? "Only the person who added it, or the group owner, can change this."
              : editing
                ? "Saving replaces the split entirely. Balances recompute from it."
                : "Who paid, how much, and how it is shared."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="groupId" value={groupId} />
          {expense && <input type="hidden" name="expenseId" value={expense.id} />}
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="paidByUserId" value={paidBy} />
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="spentOn" value={spentOn} />
          {participants.map((id) => (
            <input key={id} type="hidden" name="participant" value={id} />
          ))}
          {mode !== "equal" &&
            participants.map((id) => (
              <input key={`part-${id}`} type="hidden" name={`part:${id}`} value={parts[id] ?? ""} />
            ))}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex items-center gap-2">
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-11 text-lg font-bold tabular-nums"
              />
              <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-muted-foreground">
                {currency}
              </span>
            </div>
            {state.fieldErrors?.amount && (
              <p className="text-sm text-destructive">{state.fieldErrors.amount[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">What was it?</Label>
            <Input
              id="title"
              name="title"
              placeholder="Fuel, groceries, tickets…"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            {state.fieldErrors?.title && (
              <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-6 gap-2">
              {CATEGORIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={value}
                  aria-pressed={category === value}
                  onClick={() => setCategory(value)}
                  className={`grid aspect-square place-items-center rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    category === value
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CategoryIcon category={value} className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Paid by</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={paidBy === member.id}
                  onClick={() => setPaidBy(member.id)}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    paidBy === member.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-transparent bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Avatar name={member.displayName} color={member.avatarColor} className="size-6 text-[0.6rem]" />
                  {member.displayName}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Split</Label>
            <div className="flex gap-1 rounded-xl bg-secondary p-1">
              {(
                [
                  ["equal", "Equally"],
                  ["exact", "Exact"],
                  ["percent", "Percent"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    mode === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Who&apos;s in?</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={participants.includes(member.id)}
                  onClick={() => toggleParticipant(member.id)}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    participants.includes(member.id)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-transparent bg-secondary text-muted-foreground/60 hover:text-foreground"
                  }`}
                >
                  <Avatar name={member.displayName} color={member.avatarColor} className="size-6 text-[0.6rem]" />
                  {member.displayName}
                </button>
              ))}
            </div>
          </div>

          {participants.length > 0 && (
            <div className="space-y-2">
              {preview?.ok ? (
                <p className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {mode === "equal"
                    ? `${formatMoney(Object.values(preview.splits)[0] ?? 0, currency)} each, ${participants.length} people`
                    : "Shares add up."}
                </p>
              ) : (
                <p className={`text-sm font-semibold ${problem ? "text-destructive" : "text-muted-foreground"}`}>
                  {problem ?? "Enter an amount to see the split."}
                </p>
              )}

              {mode !== "equal" && (
                <div className="space-y-2 rounded-xl bg-secondary p-3">
                  {participants.map((id) => {
                    const member = members.find((value) => value.id === id);
                    if (!member) return null;
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <Avatar name={member.displayName} color={member.avatarColor} className="size-6 text-[0.6rem]" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{member.displayName}</span>
                        <Input
                          inputMode="decimal"
                          value={parts[id] ?? ""}
                          onChange={(event) => setParts((current) => ({ ...current, [id]: event.target.value }))}
                          placeholder={mode === "exact" ? "0.00" : "0"}
                          className="h-8 w-20 text-right tabular-nums"
                        />
                        <span className="text-xs text-muted-foreground">{mode === "exact" ? currency : "%"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="spentOn">Date</Label>
            <Input
              id="spentOn"
              type="date"
              value={spentOn}
              onChange={(event) => setSpentOn(event.target.value)}
            />
            {state.fieldErrors?.spentOn && (
              <p className="text-sm text-destructive">{state.fieldErrors.spentOn[0]}</p>
            )}
          </div>

          {state.error && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {state.error}
            </p>
          )}

          <Button type="submit" size="lg" className="h-11 w-full" disabled={pending || !valid || (editing && !canEdit)}>
            {pending ? "Saving…" : editing ? "Save changes" : "Add expense"}
          </Button>
        </form>

        {editing && expense && canEdit && (
          <form id={deleteFormId} action={deleteExpenseAction.bind(null, expense.id)} className="pt-1">
            <ConfirmSubmit
              formId={deleteFormId}
              label="Delete expense"
              title="Delete this expense?"
              description="It leaves the balances and stays in the history as deleted. This cannot be undone from the app."
              className="w-full"
            />
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              It leaves the balances but stays in the history.
            </p>
          </form>
        )}
    </>
  );
}

export function ExpenseDialog({
  trigger,
  ...formProps
}: Omit<React.ComponentProps<typeof ExpenseForm>, "onDone"> & { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        {open && <ExpenseForm {...formProps} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
