"use client";
import { Button } from "@/components/ui/button";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* modal content */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Settings</h2>

        <div className="space-y-3">
          <p className="text-gray-700">User preferences go here…</p>
          {/* Add your settings form / toggles / etc here */}
        </div>

        {/* close button */}
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
