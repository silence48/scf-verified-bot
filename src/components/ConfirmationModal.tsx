"use client";

import { Button } from "@/components/ui";
import { Portal } from "./portal";

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}

export function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <Portal>
      {/* Modal Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10000]"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
        }}
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className="fixed z-[10000] w-full max-w-md"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1a1d29]/80 border border-gray-800/60 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-bold tracking-wide text-white/90 mb-4">{title}</h2>
          <p className="text-gray-300 mb-6">{message}</p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-700/50 bg-[#0c0e14]/80 hover:bg-[#1e2235]/80 hover:text-white"
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

