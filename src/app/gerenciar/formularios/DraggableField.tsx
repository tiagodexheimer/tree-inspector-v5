// Importe o tipo UniqueIdentifier do dnd-kit
import { useDraggable, type UniqueIdentifier } from "@dnd-kit/core";
import React from "react";

interface DraggableFieldProps {
  // Altere o tipo aqui
  id: UniqueIdentifier;
  children: React.ReactNode;
}

export function DraggableField({ id, children }: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: id,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
