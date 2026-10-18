"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A destructive submit that asks first. The trigger lives inside the real form
 * and stays a plain button; the confirmation submits that form by id, so the
 * action still receives the same FormData it would have without the dialog.
 */
export function ConfirmSubmit({
  formId,
  label,
  title,
  description,
  className,
}: {
  formId: string;
  label: string;
  title: string;
  description: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" className={className}>
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const form = document.getElementById(formId);
                if (form instanceof HTMLFormElement) form.requestSubmit();
                setOpen(false);
              }}
            >
              {label}
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
