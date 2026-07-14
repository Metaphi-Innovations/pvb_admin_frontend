import React, { useState, useEffect } from "react";
import { Input } from "./input";
import { decomposeBaseQty, calculateBaseQty } from "@/lib/warehouse/quantity-utils";

export interface DualQuantityInputProps {
  value: number; // Base quantity
  packSize: number; // Unit per packing
  onChange: (baseQty: number) => void;
  disabled?: boolean;
  className?: string;
}

export function DualQuantityInput({
  value,
  packSize,
  onChange,
  disabled = false,
  className = "",
}: DualQuantityInputProps) {
  const safePackSize = Number(packSize) || 1;
  const safeValue = Number(value) || 0;
  
  const [prevValue, setPrevValue] = useState<number>(safeValue);
  const [cases, setCases] = useState<number | "">(() => decomposeBaseQty(safeValue, safePackSize).cases || "");
  const [pieces, setPieces] = useState<number | "">(() => decomposeBaseQty(safeValue, safePackSize).pieces || "");

  // Sync internal state with external value using derived state (avoids useEffect loops)
  if (safeValue !== prevValue) {
    const currentCalculated = calculateBaseQty(Number(cases) || 0, Number(pieces) || 0, safePackSize);
    if (currentCalculated !== safeValue) {
      const decomposed = decomposeBaseQty(safeValue, safePackSize);
      setCases(decomposed.cases || "");
      setPieces(decomposed.pieces || "");
    }
    setPrevValue(safeValue);
  }

  const handleCasesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newCases: number | "" = parseInt(e.target.value, 10);
    if (isNaN(newCases)) newCases = "";
    if (newCases !== "" && newCases < 0) newCases = 0;
    
    setCases(newCases);
    const newBaseQty = calculateBaseQty(Number(newCases) || 0, Number(pieces) || 0, packSize);
    onChange(newBaseQty);
  };

  const handlePiecesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newPieces: number | "" = parseInt(e.target.value, 10);
    if (isNaN(newPieces)) newPieces = "";
    if (newPieces !== "" && newPieces < 0) newPieces = 0;

    // Optional: if pieces > packSize, auto-convert to cases? 
    // Usually better UX not to auto-convert while typing to avoid cursor jumping,
    // let decomposeBaseQty handle normalization on next explicit save or render if needed.

    setPieces(newPieces);
    const newBaseQty = calculateBaseQty(Number(cases) || 0, Number(newPieces) || 0, packSize);
    onChange(newBaseQty);
  };

  // If pack size is effectively missing or 1, only show pieces
  if (!packSize || packSize <= 1) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex-1 relative">
           <Input
            type="number"
            min="0"
            value={value || ""}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onChange(isNaN(val) ? 0 : val);
            }}
            disabled={disabled}
            className="w-full pr-8 text-right font-medium"
            placeholder="0"
          />
          <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-medium pointer-events-none">
            Pcs
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="flex-1 relative group">
        <Input
          type="number"
          min="0"
          value={cases}
          onChange={handleCasesChange}
          disabled={disabled}
          className="w-full pr-8 text-right font-medium focus-visible:ring-1"
          placeholder="0"
          title="Cases"
        />
        <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-medium pointer-events-none">
          Cs
        </span>
      </div>
      <span className="text-muted-foreground font-medium text-xs">+</span>
      <div className="flex-1 relative group">
        <Input
          type="number"
          min="0"
          value={pieces}
          onChange={handlePiecesChange}
          disabled={disabled}
          className="w-full pr-8 text-right font-medium focus-visible:ring-1"
          placeholder="0"
          title="Pieces"
        />
        <span className="absolute right-2 top-1.5 text-xs text-muted-foreground font-medium pointer-events-none">
          Pcs
        </span>
      </div>
    </div>
  );
}
