// Importe o tipo UniqueIdentifier do dnd-kit
import type { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

interface SortableFieldProps {
  // Altere o tipo aqui
  id: UniqueIdentifier;
  children: React.ReactNode;
}

export function SortableField({ id, children }: SortableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
