import { useDraggable } from "@dnd-kit/core";
import React from "react"; // Importe o React

// Defina uma interface para as props
interface DraggableProps {
  id: string;
  children: React.ReactNode;
}

// Aplique a interface às suas props
export function Draggable({ id, children }: DraggableProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: id,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
