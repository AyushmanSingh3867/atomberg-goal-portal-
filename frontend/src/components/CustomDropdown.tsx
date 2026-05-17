'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface Option {
  value: string;
  label: string;
  icon: string;
  color: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export function CustomDropdown({ value, onChange, options, placeholder = "Select an option..." }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between bg-[#1a1a2e] border rounded-lg px-4 py-3.5 transition-all text-left",
          isOpen ? "border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "border-slate-700/50 hover:border-slate-600",
          selectedOption ? "text-slate-100" : "text-slate-400"
        )}
      >
        {selectedOption ? (
          <span className="flex items-center gap-2">
            <span className="text-lg">{selectedOption.icon}</span>
            <span className="font-medium">{selectedOption.label}</span>
          </span>
        ) : (
          <span>{placeholder}</span>
        )}
        <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0.9, y: -10 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={{ opacity: 0, scaleY: 0.9, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-50 w-full mt-2 bg-[#1e1e36]/90 backdrop-blur-xl border border-slate-700/60 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden origin-top"
          >
            <div className="py-2">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-all relative overflow-hidden group",
                    value === option.value 
                      ? "bg-indigo-500/10 text-indigo-100" 
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                  )}
                >
                  {value === option.value && (
                    <motion.div layoutId="active-left-border" className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                  )}
                  {/* Subtle hover background highlight for non-active items */}
                  {value !== option.value && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/0 group-hover:bg-indigo-500/50 transition-colors" />
                  )}
                  
                  <div className={cn("w-2 h-2 rounded-full", option.color)} />
                  <span className="text-lg">{option.icon}</span>
                  <span className={cn("font-medium", value === option.value && "font-semibold")}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
