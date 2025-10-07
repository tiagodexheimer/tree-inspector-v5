// Importe o tipo UniqueIdentifier do dnd-kit
import type { UniqueIdentifier } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

interface SortableFieldProps {
  // Altere o tipo aqui
  id: UniqueIdentifier;
  children: React.ReactNode;
  // Recebe o estado para desabilitar o drag
  isDragDisabled: boolean;
}

export function SortableField({ id, children, isDragDisabled }: SortableFieldProps) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition 
  } = useSortable({ 
    id, 
    disabled: isDragDisabled 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // CORREÇÃO CRUCIAL: Aplicamos os listeners e attributes SOMENTE se o drag NÃO estiver desabilitado.
  // Se o drag estiver desabilitado, dragProps é um objeto vazio, permitindo que o onClick do Card funcione.
  const dragProps = isDragDisabled ? {} : { ...listeners, ...attributes };


  return (
    // Aplica dragProps condicionalmente
    <div ref={setNodeRef} style={style} {...dragProps}>
      {children}
    </div>
  );
}