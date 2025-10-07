// Importe o tipo UniqueIdentifier do dnd-kit
import { useDraggable, type UniqueIdentifier } from "@dnd-kit/core";
import React from "react";

interface DraggableFieldProps {
  // Altere o tipo aqui
  id: UniqueIdentifier;
  children: React.ReactNode;
  // NOVO: Recebe o estado para desabilitar o drag
  isDragDisabled: boolean;
}

export function DraggableField({ id, children, isDragDisabled }: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: id,
    disabled: isDragDisabled // DESABILITA o drag quando true
  });
  
  // Conditionally apply listeners only if drag is enabled
  const dragProps = isDragDisabled ? {} : { ...listeners, ...attributes };
  // NOVO: Altera o cursor visual para indicar que não pode arrastar
  const cursorStyle = isDragDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-grab';

  return (
    <div ref={setNodeRef} className={cursorStyle} {...dragProps}>
      {children}
    </div>
  );
}